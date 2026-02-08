import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '@/lib/auth-server';

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

// Fixed ID for the single payment instructions row
const PAYMENT_INSTRUCTIONS_ID = '00000000-0000-0000-0000-000000000002';

// GET - Get payment instructions (public read)
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('payment_instructions')
      .select('*')
      .eq('id', PAYMENT_INSTRUCTIONS_ID)
      .single();

    if (error) {
      // If no instructions exist, return null
      if (error.code === 'PGRST116') {
        return NextResponse.json(null);
      }
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create or update payment instructions (admin only)
export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin role
    const { user, role } = await getAuthenticatedUser(request);
    
    if (!user || role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      title,
      instructions,
      bank_name,
      account_name,
      account_number,
      swift_code,
      branch,
      active,
    } = body;

    if (!instructions) {
      return NextResponse.json(
        { error: 'Instructions are required' },
        { status: 400 }
      );
    }

    // Upsert the payment instructions (always update the same row)
    const { data, error } = await supabaseAdmin
      .from('payment_instructions')
      .upsert({
        id: PAYMENT_INSTRUCTIONS_ID,
        title: title || 'Payment Instructions',
        instructions,
        bank_name: bank_name || null,
        account_name: account_name || null,
        account_number: account_number || null,
        swift_code: swift_code || null,
        branch: branch || null,
        active: active !== undefined ? active : true,
      }, {
        onConflict: 'id'
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
