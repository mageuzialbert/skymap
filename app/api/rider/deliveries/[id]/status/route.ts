import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, supabaseAdmin } from '@/lib/auth-server';
import { requirePermission } from '@/lib/permissions-server';

// Valid status transitions for riders
// Note: PENDING_CONFIRMATION can only be changed by staff/admin via the confirm endpoint
const validTransitions: Record<string, string[]> = {
  PENDING_CONFIRMATION: [], // Riders cannot change this - must be confirmed by staff/admin
  ASSIGNED: ['PICKED_UP', 'FAILED'],
  PICKED_UP: ['IN_TRANSIT', 'FAILED'],
  IN_TRANSIT: ['DELIVERED', 'FAILED'],
  DELIVERED: [], // Final state
  FAILED: [], // Final state
  REJECTED: [], // Final state
};

// PUT - Update delivery status
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, role } = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check permission for deliveries.update_status
    const { allowed, error: permError } = await requirePermission(user.id, role || '', 'deliveries.update_status');
    if (!allowed) {
      return NextResponse.json(
        { error: permError || 'Permission denied' },
        { status: 403 }
      );
    }

    const { status, note } = await request.json();

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ['PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'FAILED'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    // Verify delivery exists and is assigned to this rider
    const { data: delivery, error: deliveryError } = await supabaseAdmin
      .from('deliveries')
      .select('id, status, assigned_rider_id')
      .eq('id', params.id)
      .single();

    if (deliveryError || !delivery) {
      return NextResponse.json(
        { error: 'Delivery not found' },
        { status: 404 }
      );
    }

    if (delivery.assigned_rider_id !== user.id) {
      return NextResponse.json(
        { error: 'You are not assigned to this delivery' },
        { status: 403 }
      );
    }

    // Check if delivery is pending confirmation
    const currentStatus = delivery.status;
    if (currentStatus === 'PENDING_CONFIRMATION') {
      return NextResponse.json(
        { error: 'This delivery is pending confirmation from staff/admin. You cannot update its status until it is confirmed.' },
        { status: 400 }
      );
    }

    // Validate status transition
    const allowedNextStatuses = validTransitions[currentStatus] || [];
    if (!allowedNextStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Cannot transition from ${currentStatus} to ${status}. Allowed transitions: ${allowedNextStatuses.join(', ') || 'none'}` },
        { status: 400 }
      );
    }

    // Update delivery
    const updateData: any = {
      status,
    };

    // Set delivered_at timestamp if status is DELIVERED
    if (status === 'DELIVERED') {
      updateData.delivered_at = new Date().toISOString();
    }

    const { data: updatedDelivery, error: updateError } = await supabaseAdmin
      .from('deliveries')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    // Create delivery event
    await supabaseAdmin
      .from('delivery_events')
      .insert({
        delivery_id: params.id,
        status,
        note: note || `Status updated to ${status}`,
        created_by: user.id,
      });

    // TODO: Send SMS notifications based on status
    // - PICKED_UP → Send to dropoff customer
    // - DELIVERED → Send to business + customer
    // - FAILED → Send to business

    return NextResponse.json({
      success: true,
      delivery: updatedDelivery,
    });
  } catch (error) {
    console.error('Error updating delivery status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
