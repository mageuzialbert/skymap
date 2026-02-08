import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, supabaseAdmin } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

// PUT - Update business (including delivery_fee)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, role } = await getAuthenticatedUser();

    if (!user || (role !== 'ADMIN' && role !== 'STAFF')) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const {
      name,
      phone,
      delivery_fee,
      active,
      district_id,
      address,
      latitude,
      longitude,
    } = await request.json();

    // Verify business exists
    const { data: existingBusiness, error: fetchError } = await supabaseAdmin
      .from('businesses')
      .select('*')
      .eq('id', params.id)
      .single();

    if (fetchError || !existingBusiness) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    // Build update object
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) {
      // Normalize phone number
      let phoneNumber = phone.trim();
      if (!phoneNumber.startsWith('+255')) {
        phoneNumber = '+255' + phoneNumber.replace(/^\+?255?/, '').replace(/\D/g, '');
      } else {
        phoneNumber = '+255' + phoneNumber.replace(/^\+255/, '').replace(/\D/g, '');
      }
      updates.phone = phoneNumber;
    }
    if (delivery_fee !== undefined) {
      // Allow null to clear the delivery fee
      if (delivery_fee === null) {
        updates.delivery_fee = null;
      } else {
        // Validate delivery fee is a positive number
        const fee = parseFloat(delivery_fee);
        if (isNaN(fee) || fee < 0) {
          return NextResponse.json(
            { error: 'Delivery fee must be a positive number' },
            { status: 400 }
          );
        }
        updates.delivery_fee = fee;
      }
    }
    if (active !== undefined) updates.active = active;
    if (district_id !== undefined) updates.district_id = district_id;
    if (address !== undefined) updates.address = address || null;
    
    // Handle latitude
    if (latitude !== undefined) {
      if (latitude === null) {
        updates.latitude = null;
      } else {
        const lat = parseFloat(latitude);
        if (!isNaN(lat) && lat >= -90 && lat <= 90) {
          updates.latitude = lat;
        }
      }
    }
    
    // Handle longitude
    if (longitude !== undefined) {
      if (longitude === null) {
        updates.longitude = null;
      } else {
        const lng = parseFloat(longitude);
        if (!isNaN(lng) && lng >= -180 && lng <= 180) {
          updates.longitude = lng;
        }
      }
    }

    // Update business record
    const { data: updatedBusiness, error: updateError } = await supabaseAdmin
      .from('businesses')
      .update(updates)
      .eq('id', params.id)
      .select(`
        *,
        user:user_id (
          id,
          name,
          email,
          phone,
          role
        )
      `)
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      business: updatedBusiness,
    });
  } catch (error) {
    console.error('Error updating business:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
