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

// POST - Upload business logo (store URL)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, logoUrl } = body;

    if (!businessId || !logoUrl) {
      return NextResponse.json(
        { error: 'Business ID and logo URL are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('businesses')
      .update({ logo_url: logoUrl })
      .eq('id', businessId)
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
