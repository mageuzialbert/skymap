import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, supabaseAdmin } from '@/lib/auth-server';

// POST - Rider declines an assigned ride. It returns to the admin pool (CREATED).
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, role } = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (role !== 'RIDER') {
      return NextResponse.json({ error: 'Only riders can decline rides' }, { status: 403 });
    }

    const { reason } = await request.json().catch(() => ({ reason: undefined }));

    const { data: delivery, error } = await supabaseAdmin
      .from('deliveries')
      .select('id, status, assigned_rider_id, businesses:business_id ( name )')
      .eq('id', params.id)
      .single();

    if (error || !delivery) {
      return NextResponse.json({ error: 'Ride not found' }, { status: 404 });
    }
    if (delivery.assigned_rider_id !== user.id) {
      return NextResponse.json({ error: 'You are not assigned to this ride' }, { status: 403 });
    }
    // Only allow declining before the ride has started.
    if (delivery.status !== 'ASSIGNED') {
      return NextResponse.json(
        { error: `Cannot decline a ride with status ${delivery.status}` },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from('deliveries')
      .update({
        assigned_rider_id: null,
        rider_confirmed_at: null,
        status: 'CREATED',
      })
      .eq('id', params.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    await supabaseAdmin.from('delivery_events').insert({
      delivery_id: params.id,
      status: 'CREATED',
      note: reason ? `Rider declined: ${reason}` : 'Rider declined the ride',
      created_by: user.id,
    });

    // Notify admin (SMS + Email) that the ride needs reassignment.
    try {
      const { notifyEvent } = await import('@/lib/notify');
      await notifyEvent('admin_ride_declined', {}, {
        delivery_id: params.id.substring(0, 8),
        business_name: (delivery as any).businesses?.name || 'Unknown',
      });
    } catch (notifyErr) {
      console.error('Failed to send ride-declined notification:', notifyErr);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error declining ride:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
