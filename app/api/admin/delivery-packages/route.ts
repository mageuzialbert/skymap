import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, supabaseAdmin } from '@/lib/auth-server';

// GET - List all delivery fee packages
export async function GET(request: NextRequest) {
  try {
    const { user, role } = await getAuthenticatedUser();

    if (!user || (role !== 'ADMIN' && role !== 'STAFF')) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const { data: packages, error } = await supabaseAdmin
      .from('delivery_fee_packages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(packages || []);
  } catch (error) {
    console.error('Error fetching delivery packages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new delivery fee package
export async function POST(request: NextRequest) {
  try {
    const { user, role } = await getAuthenticatedUser();

    if (!user || role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const { name, description, fee_per_delivery, is_default, active } = await request.json();

    // Validation
    if (!name || fee_per_delivery === undefined) {
      return NextResponse.json(
        { error: 'Name and fee_per_delivery are required' },
        { status: 400 }
      );
    }

    const fee = parseFloat(fee_per_delivery);
    if (isNaN(fee) || fee < 0) {
      return NextResponse.json(
        { error: 'Fee must be a positive number' },
        { status: 400 }
      );
    }

    // If setting as default, unset other defaults
    if (is_default) {
      await supabaseAdmin
        .from('delivery_fee_packages')
        .update({ is_default: false })
        .eq('is_default', true);
    }

    const { data: newPackage, error } = await supabaseAdmin
      .from('delivery_fee_packages')
      .insert({
        name,
        description: description || null,
        fee_per_delivery: fee,
        is_default: is_default || false,
        active: active !== undefined ? active : true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(newPackage, { status: 201 });
  } catch (error) {
    console.error('Error creating delivery package:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
