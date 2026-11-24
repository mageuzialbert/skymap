import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, supabaseAdmin } from '@/lib/auth-server';

// Reads the session cookie, so it can never be prerendered at build time.
export const dynamic = 'force-dynamic';

const CATEGORIES = ['economy', 'suv', 'vans', 'luxury', 'pickup'];

// GET - rental vehicles a signed-in customer can choose from.
// Filters: category, transmission (automatic | manual), passengers (minimum seats).
export async function GET(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const sp = request.nextUrl.searchParams;
    const category = sp.get('category') || '';
    const transmission = sp.get('transmission') || '';
    const passengers = parseInt(sp.get('passengers') || '', 10);

    let query = supabaseAdmin
      .from('rental_vehicles')
      .select('id, category, name, seats, transmission, fuel, has_ac, price_per_day, image_url')
      .eq('active', true)
      .order('sort_order', { ascending: true })
      .order('price_per_day', { ascending: true });
    if (CATEGORIES.includes(category)) query = query.eq('category', category);
    if (transmission === 'automatic' || transmission === 'manual') {
      query = query.eq('transmission', transmission);
    }
    if (Number.isFinite(passengers) && passengers > 0) query = query.gte('seats', passengers);

    const { data, error } = await query;
    if (error) {
      console.error('Error listing rental vehicles:', error);
      return NextResponse.json({ error: 'Could not load vehicles' }, { status: 500 });
    }
    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error listing rental vehicles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
