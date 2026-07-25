import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/auth-server';

// GET - Public list of active hire vehicles for the client selection step.
// Optional ?category=people|load. Deliberately omits sensitive fields
// (plate_number, driver_name, driver_phone) — those are only revealed to the
// customer AFTER their order is confirmed.
export async function GET(request: NextRequest) {
  try {
    const category = request.nextUrl.searchParams.get('category');

    let query = supabaseAdmin
      .from('hire_vehicles')
      .select('id, category, name, capacity_value, capacity_unit, color, image_url, description')
      .eq('active', true)
      .order('sort_order', { ascending: true });

    if (category === 'people' || category === 'load') {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error fetching hire vehicles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
