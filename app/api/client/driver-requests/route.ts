import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, supabaseAdmin } from '@/lib/auth-server';
import {
  VEHICLE_TYPES,
  formatDate,
  validateDriverRequest,
  type VehicleCategory,
} from '@/lib/driverHire';

// Reads the session cookie, so it can never be prerendered at build time.
export const dynamic = 'force-dynamic';

// Columns a customer may see. `admin_notes` is internal and never leaves the
// server on this route.
const CLIENT_COLUMNS =
  'id, reference_number, vehicle_category, vehicle_type, transmission_type, departure_date, departure_time, return_date, return_time, pickup_location, destination, passenger_count, trip_duration, additional_information, status, created_at, updated_at';

const clean = (v: unknown, max: number): string | null => {
  const s = typeof v === 'string' ? v.trim() : '';
  return s ? s.slice(0, max) : null;
};
const coord = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : null;
};

/** DH-261123-7KQ4: the day it was made plus four characters that cannot be
 *  misread over the phone (no 0/O, 1/I/L). */
function newReference(): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const d = new Date(Date.now() + 3 * 60 * 60 * 1000); // Tanzania date
  const stamp = d.toISOString().slice(2, 10).replace(/-/g, '');
  let tail = '';
  for (let i = 0; i < 4; i++) tail += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `DH-${stamp}-${tail}`;
}

// GET - the caller's own driver requests, newest first.
export async function GET() {
  try {
    const { user } = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabaseAdmin
      .from('driver_hire_requests')
      .select(CLIENT_COLUMNS)
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error listing driver requests:', error);
      return NextResponse.json({ error: 'Could not load your requests' }, { status: 500 });
    }
    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error listing driver requests:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - submit a driver request. Creates a request for the admin team to
// review; it assigns no driver, takes no payment and confirms nothing.
export async function POST(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request', code: 'invalid' }, { status: 400 });
    }

    const issues = validateDriverRequest(body);
    if (issues.length > 0) {
      return NextResponse.json(
        { error: 'Please check the request details', code: issues[0].code, field: issues[0].field },
        { status: 400 }
      );
    }

    const category = body.vehicle_category as VehicleCategory;
    // Only a type from this category's list is kept; anything else is dropped.
    const vehicleType =
      VEHICLE_TYPES[category].find((v) => v.value === body.vehicle_type)?.value || null;
    const passengerCount =
      body.passenger_count === null || body.passenger_count === undefined || body.passenger_count === ''
        ? null
        : Number(body.passenger_count);

    const row = {
      customer_id: user.id,
      vehicle_category: category,
      vehicle_type: vehicleType,
      transmission_type: body.transmission_type || null,
      departure_date: body.departure_date,
      departure_time: String(body.departure_time).slice(0, 5),
      return_date: body.return_date || null,
      return_time: body.return_date && body.return_time ? String(body.return_time).slice(0, 5) : null,
      pickup_location: clean(body.pickup_location, 500) || '',
      pickup_latitude: coord(body.pickup_latitude),
      pickup_longitude: coord(body.pickup_longitude),
      destination: clean(body.destination, 500) || '',
      destination_latitude: coord(body.destination_latitude),
      destination_longitude: coord(body.destination_longitude),
      passenger_count: passengerCount,
      trip_duration: clean(body.trip_duration, 120),
      additional_information: clean(body.additional_information, 2000),
    };

    // A double tap or a retried request must not create two requests: if the
    // same customer sent the same trip in the last two minutes, return that one.
    const since = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const { data: recent } = await supabaseAdmin
      .from('driver_hire_requests')
      .select(CLIENT_COLUMNS)
      .eq('customer_id', user.id)
      .eq('status', 'SUBMITTED')
      .eq('vehicle_category', row.vehicle_category)
      .eq('departure_date', row.departure_date)
      .eq('pickup_location', row.pickup_location)
      .eq('destination', row.destination)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(1);
    if (recent && recent.length > 0) {
      return NextResponse.json({ success: true, duplicate: true, request: recent[0] });
    }

    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('id, name, phone')
      .eq('user_id', user.id)
      .maybeSingle();

    // The reference is random, so a clash is possible if unlikely; the unique
    // index catches it and we draw again.
    let created: any = null;
    let lastError: any = null;
    for (let attempt = 0; attempt < 5 && !created; attempt++) {
      const { data, error } = await supabaseAdmin
        .from('driver_hire_requests')
        .insert({ ...row, business_id: business?.id || null, reference_number: newReference() })
        .select(CLIENT_COLUMNS)
        .single();
      if (!error) created = data;
      else if (error.code !== '23505') {
        lastError = error;
        break;
      } else lastError = error;
    }

    if (!created) {
      console.error('Error creating driver request:', lastError);
      return NextResponse.json(
        { error: 'Could not submit your request. Please try again.', code: 'INTERNAL' },
        { status: 500 }
      );
    }

    await supabaseAdmin.from('driver_hire_status_history').insert({
      request_id: created.id,
      previous_status: null,
      new_status: 'SUBMITTED',
      changed_by: user.id,
      note: 'Request submitted by customer',
    });

    // Tell the admin team, and confirm receipt to the customer. Uses the
    // existing SMS + email templates system; a missing template or an unset
    // provider simply sends nothing.
    try {
      const { notifyEvent } = await import('@/lib/notify');
      const { data: profile } = await supabaseAdmin
        .from('users')
        .select('name, phone')
        .eq('id', user.id)
        .maybeSingle();
      const clientName = business?.name || profile?.name || 'there';
      const clientPhone = business?.phone || profile?.phone || '';

      await notifyEvent('admin_new_driver_request', {}, {
        reference: created.reference_number,
        client_name: clientName,
        client_phone: clientPhone,
        travel_date: formatDate(created.departure_date),
      });
      await notifyEvent(
        'client_driver_request_received',
        { phone: clientPhone, email: user.email },
        { client_name: clientName, reference: created.reference_number }
      );
    } catch (notifyErr) {
      console.error('Failed to send driver-request notifications:', notifyErr);
    }

    return NextResponse.json({ success: true, request: created }, { status: 201 });
  } catch (error) {
    console.error('Error creating driver request:', error);
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL' }, { status: 500 });
  }
}
