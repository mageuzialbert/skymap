import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, supabaseAdmin } from '@/lib/auth-server';
import { CUSTOMER_CANCELLABLE, type DriverRequestStatus } from '@/lib/driverHire';

const CLIENT_COLUMNS =
  'id, reference_number, vehicle_category, vehicle_type, transmission_type, departure_date, departure_time, return_date, return_time, pickup_location, destination, passenger_count, trip_duration, additional_information, status, created_at, updated_at';

/** The request, only if it belongs to the caller. */
async function ownRequest(id: string, userId: string) {
  const { data } = await supabaseAdmin
    .from('driver_hire_requests')
    .select(CLIENT_COLUMNS)
    .eq('id', id)
    .eq('customer_id', userId)
    .maybeSingle();
  return data;
}

// GET - one of the caller's own requests, with its status timeline. Internal
// notes and the names of the staff who changed a status are left out.
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user } = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const req = await ownRequest(params.id, user.id);
    if (!req) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { data: history } = await supabaseAdmin
      .from('driver_hire_status_history')
      .select('id, new_status, created_at')
      .eq('request_id', req.id)
      .order('created_at', { ascending: true });

    return NextResponse.json({ request: req, history: history || [] });
  } catch (error) {
    console.error('Error fetching driver request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - the only change a customer can make: cancel a request that has not
// been confirmed yet. Every other status belongs to the admin team.
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user } = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    if (body?.action !== 'cancel') {
      return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
    }

    const req = await ownRequest(params.id, user.id);
    if (!req) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (!CUSTOMER_CANCELLABLE.includes(req.status as DriverRequestStatus)) {
      return NextResponse.json(
        { error: 'This request can no longer be cancelled here. Please call us.', code: 'notCancellable' },
        { status: 409 }
      );
    }

    // The status filter makes this safe against an admin changing the request
    // at the same moment: if it moved on, nothing is updated.
    const { data: updated, error } = await supabaseAdmin
      .from('driver_hire_requests')
      .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
      .eq('id', req.id)
      .eq('customer_id', user.id)
      .eq('status', req.status)
      .select(CLIENT_COLUMNS)
      .maybeSingle();

    if (error) {
      console.error('Error cancelling driver request:', error);
      return NextResponse.json({ error: 'Could not cancel the request' }, { status: 500 });
    }
    if (!updated) {
      return NextResponse.json(
        { error: 'This request has just been updated. Please refresh.', code: 'notCancellable' },
        { status: 409 }
      );
    }

    await supabaseAdmin.from('driver_hire_status_history').insert({
      request_id: req.id,
      previous_status: req.status,
      new_status: 'CANCELLED',
      changed_by: user.id,
      note: 'Cancelled by customer',
    });

    return NextResponse.json({ success: true, request: updated });
  } catch (error) {
    console.error('Error cancelling driver request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
