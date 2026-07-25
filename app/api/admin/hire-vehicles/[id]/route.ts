import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, supabaseAdmin } from '@/lib/auth-server';

const CATEGORIES = ['people', 'load'];

function parseCapacity(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = parseFloat(String(value));
  return isNaN(n) || n < 0 ? null : n;
}

// PUT - Update a hire vehicle (admin only).
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, role } = await getAuthenticatedUser();
    if (!user || role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const updates: any = {};

    if (body.category !== undefined) {
      if (!CATEGORIES.includes(body.category)) {
        return NextResponse.json({ error: 'Category must be "people" or "load"' }, { status: 400 });
      }
      updates.category = body.category;
    }
    if (body.name !== undefined) updates.name = body.name;
    if (body.capacity_value !== undefined) updates.capacity_value = parseCapacity(body.capacity_value);
    if (body.capacity_unit !== undefined) updates.capacity_unit = body.capacity_unit || null;
    if (body.plate_number !== undefined) updates.plate_number = body.plate_number || null;
    if (body.driver_name !== undefined) updates.driver_name = body.driver_name || null;
    if (body.driver_phone !== undefined) updates.driver_phone = body.driver_phone || null;
    if (body.color !== undefined) updates.color = body.color || null;
    if (body.image_url !== undefined) updates.image_url = body.image_url || null;
    if (body.description !== undefined) updates.description = body.description || null;
    if (body.active !== undefined) updates.active = body.active;
    if (body.sort_order !== undefined) updates.sort_order = body.sort_order;

    const { data, error } = await supabaseAdmin
      .from('hire_vehicles')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: 'Hire vehicle not found' }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating hire vehicle:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete or deactivate a hire vehicle (admin only).
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, role } = await getAuthenticatedUser();
    if (!user || role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // If any request references this vehicle, deactivate instead of deleting.
    const { data: inUse } = await supabaseAdmin
      .from('deliveries')
      .select('id')
      .eq('hire_vehicle_id', params.id)
      .limit(1);

    if (inUse && inUse.length > 0) {
      const { data, error } = await supabaseAdmin
        .from('hire_vehicles')
        .update({ active: false })
        .eq('id', params.id)
        .select()
        .single();
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ message: 'Hire vehicle deactivated (in use)', vehicle: data });
    }

    const { error } = await supabaseAdmin.from('hire_vehicles').delete().eq('id', params.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ message: 'Hire vehicle deleted' });
  } catch (error) {
    console.error('Error deleting hire vehicle:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
