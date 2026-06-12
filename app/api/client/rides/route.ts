import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, supabaseAdmin } from '@/lib/auth-server';
import { serviceLabel, type ServiceTypeKey } from '@/lib/serviceTypes';

const VALID_SERVICES: ServiceTypeKey[] = ['delivery', 'ride', 'hire', 'errand'];

/**
 * Authenticated transport request submission (delivery / ride / hire / errand).
 * The caller must be logged in; the request is created under the caller's own
 * business. No account creation here (that was the legacy public landing-order flow).
 */
export async function POST(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      pickup_address,
      pickup_latitude,
      pickup_longitude,
      pickup_name,
      pickup_phone,
      dropoff_address,
      dropoff_latitude,
      dropoff_longitude,
      dropoff_name,
      dropoff_phone,
      package_description,
      package_image_url,
      vehicle_type_id,
      scheduled_pickup_at,
      service_details,
    } = body;

    const service_type: ServiceTypeKey = VALID_SERVICES.includes(body.service_type)
      ? body.service_type
      : 'delivery';

    // Every service needs a starting point and a chosen vehicle.
    if (!pickup_address) {
      return NextResponse.json({ error: 'Pickup/start location is required' }, { status: 400 });
    }
    if (!vehicle_type_id) {
      return NextResponse.json({ error: 'Please choose a means of transport' }, { status: 400 });
    }

    // Per-service requirements.
    if (service_type === 'delivery') {
      if (!dropoff_address || !dropoff_phone) {
        return NextResponse.json(
          { error: 'Dropoff address and recipient phone are required for a delivery' },
          { status: 400 }
        );
      }
    } else if (service_type === 'ride') {
      if (!dropoff_address) {
        return NextResponse.json({ error: 'Destination is required for a ride' }, { status: 400 });
      }
    } else if (service_type === 'errand') {
      if (!service_details) {
        return NextResponse.json(
          { error: 'Please describe what you need bought or done' },
          { status: 400 }
        );
      }
    }

    // Resolve the caller's business (one business per user).
    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('id, name, phone, package_id')
      .eq('user_id', user.id)
      .single();

    if (!business) {
      return NextResponse.json(
        { error: 'No business profile found for your account. Please contact support.' },
        { status: 400 }
      );
    }
    const businessId = business.id;

    // Determine the fee: prefer the chosen vehicle type's price (stored even though
    // hidden in the UI), else the business package fee, else the default package.
    let deliveryFee = 0;
    if (vehicle_type_id) {
      const { data: vt } = await supabaseAdmin
        .from('vehicle_types')
        .select('price')
        .eq('id', vehicle_type_id)
        .single();
      if (vt?.price != null) deliveryFee = parseFloat(vt.price.toString());
    }
    if (deliveryFee === 0) {
      if (business.package_id) {
        const { data: pkg } = await supabaseAdmin
          .from('delivery_fee_packages')
          .select('fee_per_delivery')
          .eq('id', business.package_id)
          .single();
        if (pkg?.fee_per_delivery != null) deliveryFee = parseFloat(pkg.fee_per_delivery.toString());
      }
      if (deliveryFee === 0) {
        const { data: defaultPackage } = await supabaseAdmin
          .from('delivery_fee_packages')
          .select('fee_per_delivery')
          .eq('is_default', true)
          .eq('active', true)
          .single();
        if (defaultPackage?.fee_per_delivery != null) {
          deliveryFee = parseFloat(defaultPackage.fee_per_delivery.toString());
        }
      }
    }

    // The customer's own contact comes from their profile/business — never re-captured.
    const finalPickupName = pickup_name || business.name || null;
    const finalPickupPhone = pickup_phone || business.phone || null;

    // Create the request.
    const { data: deliveryData, error: deliveryError } = await supabaseAdmin
      .from('deliveries')
      .insert({
        business_id: businessId,
        service_type,
        pickup_address,
        pickup_latitude: pickup_latitude || null,
        pickup_longitude: pickup_longitude || null,
        pickup_name: finalPickupName,
        pickup_phone: finalPickupPhone,
        dropoff_address: dropoff_address || null,
        dropoff_latitude: dropoff_latitude || null,
        dropoff_longitude: dropoff_longitude || null,
        dropoff_name: dropoff_name || null,
        dropoff_phone: dropoff_phone || null,
        package_description: package_description || null,
        package_image_url: package_image_url || null,
        vehicle_type_id: vehicle_type_id || null,
        scheduled_pickup_at: scheduled_pickup_at || null,
        service_details: service_details || null,
        delivery_fee: deliveryFee || null,
        status: 'CREATED',
        created_by: user.id,
      })
      .select('id')
      .single();

    if (deliveryError) {
      return NextResponse.json({ error: deliveryError.message }, { status: 500 });
    }

    if (deliveryFee > 0) {
      await supabaseAdmin.from('charges').insert({
        delivery_id: deliveryData.id,
        business_id: businessId,
        amount: deliveryFee,
        description: 'Ride fee',
      });
    }

    await supabaseAdmin.from('delivery_events').insert({
      delivery_id: deliveryData.id,
      status: 'CREATED',
      note: `${serviceLabel(service_type)} requested by client`,
      created_by: user.id,
    });

    // Notify admin of the new request, and confirm receipt to the client
    // (both over SMS + Email).
    try {
      const { notifyEvent } = await import('@/lib/notify');
      const shortId = deliveryData.id.substring(0, 8);

      await notifyEvent('admin_new_order', {}, {
        delivery_id: shortId,
        business_name: business.name || 'Unknown',
      });

      await notifyEvent(
        'client_order_received',
        { phone: finalPickupPhone, email: user.email },
        {
          client_name: business.name || 'there',
          service_label: serviceLabel(service_type),
          delivery_id: shortId,
        }
      );
    } catch (notifyErr) {
      console.error('Failed to send new-request notifications:', notifyErr);
    }

    return NextResponse.json({ success: true, deliveryId: deliveryData.id, deliveryFee });
  } catch (error) {
    console.error('Error creating ride request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
