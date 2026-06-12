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

// GET - List all home videos (admin/staff with permission)
export async function GET() {
  try {
    const { user, role } = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { allowed, error: permError } = await requirePermission(user.id, role || '', 'cms_videos.view');
    if (!allowed) {
      return NextResponse.json({ error: permError || 'Permission denied' }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from('home_videos')
      .select('*')
      .order('order_index', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new home video record
export async function POST(request: NextRequest) {
  try {
    const { user, role } = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { allowed, error: permError } = await requirePermission(user.id, role || '', 'cms_videos.create');
    if (!allowed) {
      return NextResponse.json({ error: permError || 'Permission denied' }, { status: 403 });
    }

    const body = await request.json();
    const { title, video_url, poster_url, order_index, active } = body;

    if (!video_url) {
      return NextResponse.json({ error: 'Video URL is required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('home_videos')
      .insert({
        title: title || null,
        video_url,
        poster_url: poster_url || null,
        order_index: order_index || 0,
        active: active !== undefined ? active : true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
