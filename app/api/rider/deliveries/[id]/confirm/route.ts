import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, supabaseAdmin } from '@/lib/auth-server';

// POST - Rider confirms (accepts) a ride that admin/staff assigned to them.
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, role } = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (role !== 'RIDER') {
      return NextResponse.json({ error: 'Only riders can confirm rides' }, { status: 403 });
    }

    const { data: delivery, error } = await supabaseAdmin
      .from('deliveries')
      .select('id, status, assigned_rider_id, rider_confirmed_at, pickup_phone, dropoff_phone, businesses:business_id ( user_id )')
      .eq('id', params.id)
      .single();

    if (error || !delivery) {
      return NextResponse.json({ error: 'Ride not found' }, { status: 404 });
    }
    if (delivery.assigned_rider_id !== user.id) {
      return NextResponse.json({ error: 'You are not assigned to this ride' }, { status: 403 });
    }
    if (delivery.status !== 'ASSIGNED') {
      return NextResponse.json(
        { error: `Cannot confirm a ride with status ${delivery.status}` },
        { status: 400 }
      );
    }
    if (delivery.rider_confirmed_at) {
      return NextResponse.json({ success: true, alreadyConfirmed: true });
    }

    const { error: updateError } = await supabaseAdmin
      .from('deliveries')
      .update({ rider_confirmed_at: new Date().toISOString() })
      .eq('id', params.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    await supabaseAdmin.from('delivery_events').insert({
      delivery_id: params.id,
      status: 'ASSIGNED',
      note: 'Rider confirmed the ride',
      created_by: user.id,
    });

    // Notify the client (SMS + Email) that a rider accepted and is on the way.
    try {
      const { notifyEvent } = await import('@/lib/notify');
      const ownerId = (delivery as any).businesses?.user_id as string | undefined;
      const [{ data: rider }, ownerRes] = await Promise.all([
        supabaseAdmin.from('users').select('name, phone').eq('id', user.id).single(),
        ownerId
          ? supabaseAdmin.from('users').select('email, phone').eq('id', ownerId).single()
          : Promise.resolve({ data: null } as any),
      ]);
      await notifyEvent(
        'ride_confirmed',
        {
          phone: ownerRes?.data?.phone || delivery.pickup_phone || undefined,
          email: ownerRes?.data?.email || undefined,
        },
        {
          delivery_id: params.id.substring(0, 8),
          rider_name: rider?.name || 'Your rider',
          rider_phone: rider?.phone || '',
        }
      );
    } catch (notifyErr) {
      console.error('Failed to send ride-confirmed notification:', notifyErr);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error confirming ride:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
