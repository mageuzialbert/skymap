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

// Fixed ID for the single company profile row
const COMPANY_PROFILE_ID = '00000000-0000-0000-0000-000000000001';

// GET - Get company profile (public read)
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('company_profile')
      .select('*')
      .eq('id', COMPANY_PROFILE_ID)
      .single();

    if (error) {
      // If no profile exists, return null
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

// POST - Create or update company profile (admin only)
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
      company_name,
      logo_url,
      favicon_url,
      phone,
      email,
      address,
      city,
      region,
      postal_code,
      website,
      tax_id,
    } = body;

    if (!company_name) {
      return NextResponse.json(
        { error: 'Company name is required' },
        { status: 400 }
      );
    }

    // Upsert the company profile (always update the same row)
    const { data, error } = await supabaseAdmin
      .from('company_profile')
      .upsert({
        id: COMPANY_PROFILE_ID,
        company_name,
        logo_url: logo_url || null,
        favicon_url: favicon_url || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        city: city || null,
        region: region || null,
        postal_code: postal_code || null,
        website: website || null,
        tax_id: tax_id || null,
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
