import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, supabaseAdmin } from '@/lib/auth-server';
import { requirePermission } from '@/lib/permissions-server';

/**
 * GET one assigned delivery.
 *
 * The job detail screen used to fetch the rider's entire list (limit=1000) and
 * find the row client-side, on every load and again after every status change.
 * Scoped to the caller's own assignments, so a rider cannot read someone
 * else's job by guessing an id.
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, role } = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { allowed, error: permError } = await requirePermission(
      user.id,
      role || '',
      'deliveries.view_assigned'
    );
    if (!allowed) {
      return NextResponse.json({ error: permError || 'Permission denied' }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from('deliveries')
      .select(
        `
        *,
        businesses:business_id (
          id,
          name,
          phone
        ),
        created_by_user:created_by (
          id,
          name,
          role
        )
      `
      )
      .eq('id', params.id)
      .eq('assigned_rider_id', user.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error loading delivery:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
