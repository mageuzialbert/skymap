import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, supabaseAdmin } from '@/lib/auth-server';

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// GET - List all vehicle types (admin/staff)
export async function GET() {
  try {
    const { user, role } = await getAuthenticatedUser();
    if (!user || (role !== 'ADMIN' && role !== 'STAFF')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from('vehicle_types')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error fetching vehicle types:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a vehicle type (admin only)
export async function POST(request: NextRequest) {
  try {
    const { user, role } = await getAuthenticatedUser();
    if (!user || role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { key, name, icon_url, price, active, sort_order } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    let parsedPrice = null;
    if (price !== undefined && price !== null && price !== '') {
      parsedPrice = parseFloat(price);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        return NextResponse.json({ error: 'Price must be a positive number' }, { status: 400 });
      }
    }

    const { data, error } = await supabaseAdmin
      .from('vehicle_types')
      .insert({
        key: (key && slugify(key)) || slugify(name),
        name,
        icon_url: icon_url || null,
        price: parsedPrice,
        active: active !== undefined ? active : true,
        sort_order: sort_order || 0,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating vehicle type:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
