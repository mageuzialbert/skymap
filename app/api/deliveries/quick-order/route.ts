import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(request: NextRequest) {
  try {
    const {
      businessId,
      userId,
      pickup_address,
      pickup_latitude,
      pickup_longitude,
      pickup_name,
      pickup_phone,
      pickup_region_id,
      pickup_district_id,
      dropoff_address,
      dropoff_latitude,
      dropoff_longitude,
      dropoff_name,
      dropoff_phone,
      dropoff_region_id,
      dropoff_district_id,
      package_description,
    } = await request.json();

    // Validation
    if (!businessId || !userId) {
      return NextResponse.json(
        { error: 'Business ID and User ID are required' },
        { status: 400 }
      );
    }

    if (!pickup_address || !pickup_name || !pickup_phone || !dropoff_address || !dropoff_name || !dropoff_phone) {
      return NextResponse.json(
        { error: 'All delivery fields are required' },
        { status: 400 }
      );
    }

    // Get business and its package to determine delivery fee
    let deliveryFee = 0;
    if (businessId) {
      const { data: business, error: businessError } = await supabaseAdmin
        .from('businesses')
        .select(`
          id,
          package_id,
          delivery_fee_packages:package_id (
            id,
            fee_per_delivery
          )
        `)
        .eq('id', businessId)
        .single();

      if (business && business.delivery_fee_packages) {
        deliveryFee = parseFloat((business.delivery_fee_packages as any).fee_per_delivery.toString());
      } else {
        // If business not found or no package, use default package
        const { data: defaultPackage } = await supabaseAdmin
          .from('delivery_fee_packages')
          .select('fee_per_delivery')
          .eq('is_default', true)
          .eq('active', true)
          .single();

        if (defaultPackage) {
          deliveryFee = parseFloat(defaultPackage.fee_per_delivery.toString());
        }
      }
    } else {
      // No business ID, use default package
      const { data: defaultPackage } = await supabaseAdmin
        .from('delivery_fee_packages')
        .select('fee_per_delivery')
        .eq('is_default', true)
        .eq('active', true)
        .single();

      if (defaultPackage) {
        deliveryFee = parseFloat(defaultPackage.fee_per_delivery.toString());
      }
    }

    // Create delivery
    const { data: deliveryData, error: deliveryError } = await supabaseAdmin
      .from('deliveries')
      .insert({
        business_id: businessId,
        pickup_address,
        pickup_latitude: pickup_latitude || null,
        pickup_longitude: pickup_longitude || null,
        pickup_name,
        pickup_phone,
        pickup_region_id: pickup_region_id || null,
        pickup_district_id: pickup_district_id || null,
        dropoff_address,
        dropoff_latitude: dropoff_latitude || null,
        dropoff_longitude: dropoff_longitude || null,
        dropoff_name,
        dropoff_phone,
        dropoff_region_id: dropoff_region_id || null,
        dropoff_district_id: dropoff_district_id || null,
        package_description: package_description || null,
        status: 'CREATED',
        created_by: userId,
      })
      .select('id')
      .single();

    if (deliveryError) {
      return NextResponse.json(
        { error: deliveryError.message },
        { status: 500 }
      );
    }

    // Create charge with package fee
    if (deliveryFee > 0 && businessId) {
      await supabaseAdmin
        .from('charges')
        .insert({
          delivery_id: deliveryData.id,
          business_id: businessId,
          amount: deliveryFee,
          description: 'Delivery fee - Quick order',
        });
    }

    // Create delivery event
    await supabaseAdmin
      .from('delivery_events')
      .insert({
        delivery_id: deliveryData.id,
        status: 'CREATED',
        note: 'Delivery created via quick order',
        created_by: userId,
      });

    return NextResponse.json({
      success: true,
      deliveryId: deliveryData.id,
      message: 'Delivery created successfully',
      deliveryFee,
    });
  } catch (error) {
    console.error('Error creating quick order:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
