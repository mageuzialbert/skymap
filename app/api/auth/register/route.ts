import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client with service role for admin operations
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
    const { businessName, email, phone, password, districtId, packageId } = await request.json();

    // Validation
    if (!businessName || !email || !phone || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Ensure phone starts with +255
    let phoneNumber = phone.trim();
    if (!phoneNumber.startsWith('+255')) {
      phoneNumber = '+255' + phoneNumber.replace(/^\+?255?/, '').replace(/\D/g, '');
    } else {
      phoneNumber = '+255' + phoneNumber.replace(/^\+255/, '').replace(/\D/g, '');
    }

    // Validate that there are exactly 9 digits after +255
    const digitsAfter255 = phoneNumber.replace(/^\+255/, '');
    if (digitsAfter255.length !== 9) {
      return NextResponse.json(
        { error: 'Phone number must be exactly 9 digits after +255 (e.g., +255759561311)' },
        { status: 400 }
      );
    }

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for MVP
      user_metadata: {
        business_name: businessName,
        phone: phoneNumber,
        role: 'BUSINESS',
      },
    });

    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      );
    }

    // The trigger should have already created the user record
    // Use UPSERT to handle both cases: if trigger created it, update it; if not, insert it
    const { error: userError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: authData.user.id,
        name: businessName,
        email: email,
        phone: phoneNumber,
        role: 'BUSINESS',
        active: true,
      }, {
        onConflict: 'id'
      });

    if (userError) {
      // Rollback: delete auth user if users table operation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: userError.message },
        { status: 500 }
      );
    }

    // Get default package if packageId not provided
    let finalPackageId = packageId;
    if (!finalPackageId) {
      const { data: defaultPackage } = await supabaseAdmin
        .from('delivery_fee_packages')
        .select('id')
        .eq('is_default', true)
        .eq('active', true)
        .single();
      
      if (defaultPackage) {
        finalPackageId = defaultPackage.id;
      }
    }

    // Create business record
    const { error: businessError } = await supabaseAdmin
      .from('businesses')
      .insert({
        name: businessName,
        phone: phoneNumber,
        user_id: authData.user.id,
        district_id: districtId || null,
        package_id: finalPackageId || null,
        billing_cycle: 'WEEKLY',
        active: true,
      });

    if (businessError) {
      // Rollback: delete user records if business creation fails
      await supabaseAdmin.from('users').delete().eq('id', authData.user.id);
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: businessError.message },
        { status: 500 }
      );
    }

    // Return success (client will need to sign in separately)
    return NextResponse.json({
      success: true,
      message: 'Registration successful. Please sign in.',
      userId: authData.user.id,
    });
  } catch (error) {
    console.error('Error registering business:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
