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

// GET - Get all CMS content (admin only)
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('cms_content')
      .select('*')
      .order('key');

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create or update CMS content
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, content } = body;

    if (!key || !content) {
      return NextResponse.json(
        { error: 'Key and content are required' },
        { status: 400 }
      );
    }

    // Get user ID from request (would need to be passed from client)
    // For now, we'll use null
    const userId = null;

    const { data, error } = await supabaseAdmin
      .from('cms_content')
      .upsert({
        key,
        content,
        updated_by: userId,
      }, {
        onConflict: 'key'
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
