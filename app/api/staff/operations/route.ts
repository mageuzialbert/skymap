import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, supabaseAdmin } from '@/lib/auth-server';

// GET - Operations dashboard data
export async function GET(request: NextRequest) {
  try {
    const { user, role } = await getAuthenticatedUser();

    if (!user || (role !== 'STAFF' && role !== 'ADMIN')) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Get total deliveries
    const { count: totalDeliveries } = await supabaseAdmin
      .from('deliveries')
      .select('*', { count: 'exact', head: true });

    // Get active deliveries (not DELIVERED or FAILED)
    const { count: activeDeliveries } = await supabaseAdmin
      .from('deliveries')
      .select('*', { count: 'exact', head: true })
      .not('status', 'in', '(DELIVERED,FAILED)');

    // Get deliveries by status
    const { data: deliveriesByStatus } = await supabaseAdmin
      .from('deliveries')
      .select('status')
      .not('status', 'is', null);

    const statusCounts: Record<string, number> = {};
    deliveriesByStatus?.forEach((d) => {
      statusCounts[d.status] = (statusCounts[d.status] || 0) + 1;
    });

    // Get deliveries created today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: todayDeliveries } = await supabaseAdmin
      .from('deliveries')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());

    // Get deliveries completed today
    const { count: completedToday } = await supabaseAdmin
      .from('deliveries')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'DELIVERED')
      .gte('delivered_at', today.toISOString());

    // Calculate average delivery time (for delivered deliveries)
    const { data: deliveredDeliveries } = await supabaseAdmin
      .from('deliveries')
      .select('created_at, delivered_at')
      .eq('status', 'DELIVERED')
      .not('delivered_at', 'is', null)
      .not('created_at', 'is', null)
      .limit(1000);

    let avgDeliveryTime = 0;
    if (deliveredDeliveries && deliveredDeliveries.length > 0) {
      const times = deliveredDeliveries
        .map((d) => {
          if (!d.delivered_at || !d.created_at) return null;
          return new Date(d.delivered_at).getTime() - new Date(d.created_at).getTime();
        })
        .filter((t) => t !== null) as number[];

      if (times.length > 0) {
        avgDeliveryTime = times.reduce((a, b) => a + b, 0) / times.length;
        // Convert to hours
        avgDeliveryTime = avgDeliveryTime / (1000 * 60 * 60);
      }
    }

    // Get recent deliveries (last 10)
    const { data: recentDeliveries } = await supabaseAdmin
      .from('deliveries')
      .select(`
        id,
        status,
        created_at,
        delivered_at,
        businesses:business_id (
          id,
          name
        ),
        assigned_rider:assigned_rider_id (
          id,
          name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      metrics: {
        totalDeliveries: totalDeliveries || 0,
        activeDeliveries: activeDeliveries || 0,
        todayDeliveries: todayDeliveries || 0,
        completedToday: completedToday || 0,
        avgDeliveryTimeHours: Math.round(avgDeliveryTime * 10) / 10,
      },
      statusCounts,
      recentDeliveries: recentDeliveries || [],
    });
  } catch (error) {
    console.error('Error fetching operations data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
