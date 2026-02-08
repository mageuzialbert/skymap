import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, supabaseAdmin } from '@/lib/auth-server';
import { requirePermission } from '@/lib/permissions-server';

// GET - List assigned deliveries for authenticated rider
export async function GET(request: NextRequest) {
  try {
    const { user, role } = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check permission for deliveries.view_assigned
    const { allowed, error: permError } = await requirePermission(user.id, role || '', 'deliveries.view_assigned');
    if (!allowed) {
      return NextResponse.json(
        { error: permError || 'Permission denied' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query for assigned deliveries
    let query = supabaseAdmin
      .from('deliveries')
      .select(`
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
      `)
      .eq('assigned_rider_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply status filter
    if (status && status !== 'ALL') {
      query = query.eq('status', status);
    }

    const { data: deliveries, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(deliveries || []);
  } catch (error) {
    console.error('Error fetching rider deliveries:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
