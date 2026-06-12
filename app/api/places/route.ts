import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/auth-server';

// Public: list active place categories with their active places (for the
// "Suggestions" location picker). Optional ?category=<key> filter.
export async function GET(request: NextRequest) {
  try {
    const categoryKey = request.nextUrl.searchParams.get('category');

    const { data: categories, error: catErr } = await supabaseAdmin
      .from('place_categories')
      .select('id, key, name, icon, sort_order')
      .eq('active', true)
      .order('sort_order', { ascending: true });

    if (catErr) return NextResponse.json({ error: catErr.message }, { status: 500 });

    let placesQuery = supabaseAdmin
      .from('places')
      .select('id, category_id, name, address, latitude, longitude, sort_order')
      .eq('active', true)
      .order('sort_order', { ascending: true });

    const { data: places, error: placesErr } = await placesQuery;
    if (placesErr) return NextResponse.json({ error: placesErr.message }, { status: 500 });

    let cats = categories || [];
    if (categoryKey) cats = cats.filter((c) => c.key === categoryKey);

    // Nest places under their category.
    const result = cats.map((c) => ({
      ...c,
      places: (places || []).filter((p) => p.category_id === c.id),
    }));

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
