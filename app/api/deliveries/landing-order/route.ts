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
      phone,
      code,
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
    } = await request.json();

    // Validation
    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }
    // TODO: Re-enable OTP verification later
    // if (!code) {
    //   return NextResponse.json(
    //     { error: 'Verification code is required' },
    //     { status: 400 }
    //   );
    // }

    if (!pickup_address || !pickup_phone || !dropoff_address || !dropoff_phone) {
      return NextResponse.json(
        { error: 'Pickup and dropoff details are required' },
        { status: 400 }
      );
    }

    // Normalize phone number
    let phoneNumber = phone.trim();
    if (!phoneNumber.startsWith('+255')) {
      phoneNumber = '+255' + phoneNumber.replace(/^\+?255?/, '').replace(/\D/g, '');
    } else {
      phoneNumber = '+255' + phoneNumber.replace(/^\+255/, '').replace(/\D/g, '');
    }

    // TODO: Re-enable OTP verification later
    // 1. Verify OTP (SKIPPED FOR NOW)
    // const { data: otpData, error: otpError } = await supabaseAdmin
    //   .from('otp_codes')
    //   .select('*')
    //   .eq('phone', phoneNumber)
    //   .eq('code', code)
    //   .eq('used', false)
    //   .gt('expires_at', new Date().toISOString())
    //   .order('created_at', { ascending: false })
    //   .limit(1)
    //   .single();
    //
    // if (otpError || !otpData) {
    //   return NextResponse.json(
    //     { error: 'Invalid or expired verification code' },
    //     { status: 400 }
    //   );
    // }
    //
    // // Mark OTP as used
    // await supabaseAdmin
    //   .from('otp_codes')
    //   .update({ used: true })
    //   .eq('id', otpData.id);

    // 2. Check if user exists
    const { data: existingUser, error: userCheckError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('phone', phoneNumber)
      .single();

    let userId: string;
    let businessId: string | null = null;
    let email: string;

    if (userCheckError && userCheckError.code === 'PGRST116') {
      // User doesn't exist — create new user + business using pickup details
      const businessName = pickup_name || 'My Business';
      email = `${phoneNumber.replace(/\+/g, '')}@kasicourier.local`;

      // Create auth user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12),
        email_confirm: false,
        user_metadata: {
          business_name: businessName,
          phone: phoneNumber,
          role: 'BUSINESS',
        },
      });

      if (authError || !authData.user) {
        return NextResponse.json(
          { error: authError?.message || 'Failed to create user' },
          { status: 400 }
        );
      }

      userId = authData.user.id;

      // Create user record
      const { error: userError } = await supabaseAdmin
        .from('users')
        .upsert({
          id: userId,
          name: businessName,
          email: email,
          phone: phoneNumber,
          role: 'BUSINESS',
          active: true,
          phone_verified: true,
          email_verified: false,
        }, {
          onConflict: 'id'
        });

      if (userError) {
        await supabaseAdmin.auth.admin.deleteUser(userId);
        return NextResponse.json(
          { error: userError.message },
          { status: 500 }
        );
      }

      // Parse coordinates
      let finalLatitude = null;
      let finalLongitude = null;
      if (pickup_latitude !== undefined && pickup_latitude !== null) {
        const lat = parseFloat(pickup_latitude);
        if (!isNaN(lat) && lat >= -90 && lat <= 90) finalLatitude = lat;
      }
      if (pickup_longitude !== undefined && pickup_longitude !== null) {
        const lng = parseFloat(pickup_longitude);
        if (!isNaN(lng) && lng >= -180 && lng <= 180) finalLongitude = lng;
      }

      // Create business record using pickup details
      const { data: businessData, error: businessError } = await supabaseAdmin
        .from('businesses')
        .insert({
          name: businessName,
          phone: phoneNumber,
          user_id: userId,
          billing_cycle: 'WEEKLY',
          active: true,
          address: pickup_address || null,
          latitude: finalLatitude,
          longitude: finalLongitude,
        })
        .select('id')
        .single();

      if (businessError) {
        await supabaseAdmin.from('users').delete().eq('id', userId);
        await supabaseAdmin.auth.admin.deleteUser(userId);
        return NextResponse.json(
          { error: businessError.message },
          { status: 500 }
        );
      }

      businessId = businessData.id;
    } else if (existingUser) {
      // User exists
      userId = existingUser.id;
      email = existingUser.email || `${phoneNumber.replace(/\+/g, '')}@kasicourier.local`;

      // Mark phone as verified
      await supabaseAdmin
        .from('users')
        .update({ phone_verified: true })
        .eq('id', userId);

      // Get business ID
      if (existingUser.role === 'BUSINESS') {
        const { data: businessData } = await supabaseAdmin
          .from('businesses')
          .select('id')
          .eq('user_id', userId)
          .single();

        businessId = businessData?.id || null;
      }
    } else {
      return NextResponse.json(
        { error: 'Failed to process user' },
        { status: 500 }
      );
    }

    // 3. Create session via temp password
    const tempPassword = Math.random().toString(36).slice(-16) + Math.random().toString(36).slice(-16) + 'A1!';

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      {
        password: tempPassword,
        email_confirm: true,
      }
    );

    if (updateError) {
      console.error('Error updating user for session:', updateError);
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      );
    }

    const supabasePublic = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: authData, error: signInError } = await supabasePublic.auth.signInWithPassword({
      email: email,
      password: tempPassword,
    });

    if (signInError || !authData?.session) {
      console.error('Error signing in for session:', signInError);
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      );
    }

    // 4. Create delivery order
    let deliveryFee = 0;
    if (businessId) {
      const { data: business } = await supabaseAdmin
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
    }

    const { data: deliveryData, error: deliveryError } = await supabaseAdmin
      .from('deliveries')
      .insert({
        business_id: businessId,
        pickup_address,
        pickup_latitude: pickup_latitude || null,
        pickup_longitude: pickup_longitude || null,
        pickup_name: pickup_name || null,
        pickup_phone,
        dropoff_address,
        dropoff_latitude: dropoff_latitude || null,
        dropoff_longitude: dropoff_longitude || null,
        dropoff_name: dropoff_name || null,
        dropoff_phone,
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

    // Create charge
    if (deliveryFee > 0 && businessId) {
      await supabaseAdmin
        .from('charges')
        .insert({
          delivery_id: deliveryData.id,
          business_id: businessId,
          amount: deliveryFee,
          description: 'Delivery fee - Landing order',
        });
    }

    // Create delivery event
    await supabaseAdmin
      .from('delivery_events')
      .insert({
        delivery_id: deliveryData.id,
        status: 'CREATED',
        note: 'Delivery created via landing page',
        created_by: userId,
      });

    return NextResponse.json({
      success: true,
      userId,
      businessId,
      deliveryId: deliveryData.id,
      deliveryFee,
      accessToken: authData.session.access_token,
      refreshToken: authData.session.refresh_token,
    });
  } catch (error) {
    console.error('Error creating landing order:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
