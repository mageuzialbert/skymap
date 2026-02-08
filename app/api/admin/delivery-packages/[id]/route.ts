import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, supabaseAdmin } from '@/lib/auth-server';

// PUT - Update a delivery fee package
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, role } = await getAuthenticatedUser();

    if (!user || role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const { name, description, fee_per_delivery, is_default, active } = await request.json();

    // Build update object
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (fee_per_delivery !== undefined) {
      const fee = parseFloat(fee_per_delivery);
      if (isNaN(fee) || fee < 0) {
        return NextResponse.json(
          { error: 'Fee must be a positive number' },
          { status: 400 }
        );
      }
      updates.fee_per_delivery = fee;
    }
    if (is_default !== undefined) {
      updates.is_default = is_default;
      // If setting as default, unset other defaults
      if (is_default) {
        await supabaseAdmin
          .from('delivery_fee_packages')
          .update({ is_default: false })
          .neq('id', params.id)
          .eq('is_default', true);
      }
    }
    if (active !== undefined) updates.active = active;

    const { data: updatedPackage, error } = await supabaseAdmin
      .from('delivery_fee_packages')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!updatedPackage) {
      return NextResponse.json(
        { error: 'Package not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedPackage);
  } catch (error) {
    console.error('Error updating delivery package:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete/deactivate a delivery fee package
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, role } = await getAuthenticatedUser();

    if (!user || role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Check if package is in use
    const { data: businessesUsingPackage } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .eq('package_id', params.id)
      .limit(1);

    if (businessesUsingPackage && businessesUsingPackage.length > 0) {
      // Instead of deleting, deactivate
      const { data: updatedPackage, error } = await supabaseAdmin
        .from('delivery_fee_packages')
        .update({ active: false })
        .eq('id', params.id)
        .select()
        .single();

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: 'Package deactivated (in use by businesses)',
        package: updatedPackage,
      });
    }

    // If not in use, delete it
    const { error } = await supabaseAdmin
      .from('delivery_fee_packages')
      .delete()
      .eq('id', params.id);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Package deleted successfully' });
  } catch (error) {
    console.error('Error deleting delivery package:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
