import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '@/lib/auth-server';
import { requirePermission } from '@/lib/permissions-server';

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

// GET - List all sliders (admin/staff with permission)
export async function GET(request: NextRequest) {
  try {
    const { user, role } = await getAuthenticatedUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check permission for cms_sliders.view
    const { allowed, error: permError } = await requirePermission(user.id, role || '', 'cms_sliders.view');
    if (!allowed) {
      return NextResponse.json(
        { error: permError || 'Permission denied' },
        { status: 403 }
      );
    }
    
    const { data, error } = await supabaseAdmin
      .from('slider_images')
      .select('*')
      .order('order_index', { ascending: true });

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

// POST - Create new slider (admin/staff with permission)
export async function POST(request: NextRequest) {
  try {
    const { user, role } = await getAuthenticatedUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check permission for cms_sliders.create
    const { allowed, error: permError } = await requirePermission(user.id, role || '', 'cms_sliders.create');
    if (!allowed) {
      return NextResponse.json(
        { error: permError || 'Permission denied' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { image_url, caption, cta_text, cta_link, order_index, active } = body;

    if (!image_url) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('slider_images')
      .insert({
        image_url,
        caption: caption || null,
        cta_text: cta_text || null,
        cta_link: cta_link || null,
        order_index: order_index || 0,
        active: active !== undefined ? active : true,
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
