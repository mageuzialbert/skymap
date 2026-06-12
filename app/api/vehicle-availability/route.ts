import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/auth-server';

const ACTIVE_RIDE_STATUSES = ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'];

/**
 * Per-vehicle-type availability for the client request-ride selector.
 * - registered = active RIDER users assigned that vehicle type.
 * - available  = registered riders who are NOT currently on an active ride.
 * Price is intentionally omitted (hidden from clients for now).
 */
export async function GET() {
  try {
    // Active vehicle types in display order.
    const { data: types, error: typesError } = await supabaseAdmin
      .from('vehicle_types')
      .select('id, key, name, icon_url, active, sort_order')
      .eq('active', true)
      .order('sort_order', { ascending: true });

    if (typesError) {
      return NextResponse.json({ error: typesError.message }, { status: 500 });
    }

    // Active riders with a vehicle type.
    const { data: riders, error: ridersError } = await supabaseAdmin
      .from('users')
      .select('id, vehicle_type_id')
      .eq('role', 'RIDER')
      .eq('active', true)
      .not('vehicle_type_id', 'is', null);

    if (ridersError) {
      return NextResponse.json({ error: ridersError.message }, { status: 500 });
    }

    // Riders currently on an active ride (busy).
    const { data: activeRides, error: ridesError } = await supabaseAdmin
      .from('deliveries')
      .select('assigned_rider_id')
      .in('status', ACTIVE_RIDE_STATUSES)
      .not('assigned_rider_id', 'is', null);

    if (ridesError) {
      return NextResponse.json({ error: ridesError.message }, { status: 500 });
    }

    const busyRiderIds = new Set((activeRides || []).map((r) => r.assigned_rider_id));

    const result = (types || []).map((t) => {
      const ridersOfType = (riders || []).filter((r) => r.vehicle_type_id === t.id);
      const registered = ridersOfType.length;
      const available = ridersOfType.filter((r) => !busyRiderIds.has(r.id)).length;
      return {
        id: t.id,
        key: t.key,
        name: t.name,
        icon_url: t.icon_url,
        registered,
        available,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error computing vehicle availability:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
