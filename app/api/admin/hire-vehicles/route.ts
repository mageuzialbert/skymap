import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, supabaseAdmin } from '@/lib/auth-server';

const CATEGORIES = ['people', 'load'];

function parseCapacity(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = parseFloat(String(value));
  return isNaN(n) || n < 0 ? null : n;
}

// GET - List all hire vehicles (admin/staff). Returns every field.
export async function GET() {
  try {
    const { user, role } = await getAuthenticatedUser();
    if (!user || (role !== 'ADMIN' && role !== 'STAFF')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from('hire_vehicles')
      .select('*')
      .order('category', { ascending: true })
      .order('sort_order', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error fetching hire vehicles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a hire vehicle (admin only).
export async function POST(request: NextRequest) {
  try {
    const { user, role } = await getAuthenticatedUser();
    if (!user || role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { category, name } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (!CATEGORIES.includes(category)) {
      return NextResponse.json({ error: 'Category must be "people" or "load"' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('hire_vehicles')
      .insert({
        category,
        name,
        capacity_value: parseCapacity(body.capacity_value),
        capacity_unit: body.capacity_unit || (category === 'people' ? 'people' : 'tons'),
        plate_number: body.plate_number || null,
        driver_name: body.driver_name || null,
        driver_phone: body.driver_phone || null,
        color: body.color || null,
        image_url: body.image_url || null,
        description: body.description || null,
        active: body.active !== undefined ? body.active : true,
        sort_order: body.sort_order || 0,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating hire vehicle:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
