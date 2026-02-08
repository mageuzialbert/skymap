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

// This endpoint can be called after user clicks email verification link
// Or we can check Supabase auth.users.email_confirmed_at
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check if email is confirmed in auth.users
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (!authUser.user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // If email is confirmed, update email_verified in users table
    if (authUser.user.email_confirmed_at) {
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ email_verified: true })
        .eq('id', userId);

      if (updateError) {
        return NextResponse.json(
          { error: 'Failed to update email verification status' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Email verified successfully',
      });
    }

    return NextResponse.json({
      success: false,
      message: 'Email not yet confirmed',
    });
  } catch (error) {
    console.error('Error verifying email:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to check verification status
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get user verification status
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('phone_verified, email_verified')
      .eq('id', userId)
      .single();

    if (!userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      phone_verified: userData.phone_verified || false,
      email_verified: userData.email_verified || false,
    });
  } catch (error) {
    console.error('Error checking verification status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
