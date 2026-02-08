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
    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
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

    // Check if user exists
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, phone, role, name')
      .eq('phone', phoneNumber)
      .single();

    if (userError && userError.code !== 'PGRST116') {
      return NextResponse.json(
        { error: userError.message },
        { status: 500 }
      );
    }

    if (!userData) {
      return NextResponse.json({
        exists: false,
      });
    }

    // Get business ID if user is a business
    let businessId = null;
    if (userData.role === 'BUSINESS') {
      const { data: businessData } = await supabaseAdmin
        .from('businesses')
        .select('id')
        .eq('user_id', userData.id)
        .single();

      businessId = businessData?.id || null;
    }

    return NextResponse.json({
      exists: true,
      userId: userData.id,
      businessId,
      role: userData.role,
      name: userData.name,
    });
  } catch (error) {
    console.error('Error checking phone:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
