import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, supabaseAdmin } from '@/lib/auth-server';

// PUT - Update a vehicle type (admin only)
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, role } = await getAuthenticatedUser();
    if (!user || role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { name, icon_url, price, active, sort_order } = await request.json();

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (icon_url !== undefined) updates.icon_url = icon_url || null;
    if (sort_order !== undefined) updates.sort_order = sort_order;
    if (active !== undefined) updates.active = active;
    if (price !== undefined) {
      if (price === null || price === '') {
        updates.price = null;
      } else {
        const parsed = parseFloat(price);
        if (isNaN(parsed) || parsed < 0) {
          return NextResponse.json({ error: 'Price must be a positive number' }, { status: 400 });
        }
        updates.price = parsed;
      }
    }

    const { data, error } = await supabaseAdmin
      .from('vehicle_types')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: 'Vehicle type not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating vehicle type:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete or deactivate a vehicle type (admin only)
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, role } = await getAuthenticatedUser();
    if (!user || role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // If riders or deliveries reference this type, deactivate instead of deleting.
    const [{ data: ridersUsing }, { data: deliveriesUsing }] = await Promise.all([
      supabaseAdmin.from('users').select('id').eq('vehicle_type_id', params.id).limit(1),
      supabaseAdmin.from('deliveries').select('id').eq('vehicle_type_id', params.id).limit(1),
    ]);

    if ((ridersUsing && ridersUsing.length > 0) || (deliveriesUsing && deliveriesUsing.length > 0)) {
      const { data, error } = await supabaseAdmin
        .from('vehicle_types')
        .update({ active: false })
        .eq('id', params.id)
        .select()
        .single();
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ message: 'Vehicle type deactivated (in use)', vehicle: data });
    }

    const { error } = await supabaseAdmin.from('vehicle_types').delete().eq('id', params.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Vehicle type deleted' });
  } catch (error) {
    console.error('Error deleting vehicle type:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
