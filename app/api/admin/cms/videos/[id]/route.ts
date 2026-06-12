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

// PUT - Update a home video
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, role } = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { allowed, error: permError } = await requirePermission(user.id, role || '', 'cms_videos.update');
    if (!allowed) {
      return NextResponse.json({ error: permError || 'Permission denied' }, { status: 403 });
    }

    const body = await request.json();
    const { title, video_url, poster_url, order_index, active } = body;

    const { data, error } = await supabaseAdmin
      .from('home_videos')
      .update({
        title: title || null,
        video_url,
        poster_url: poster_url || null,
        order_index: order_index !== undefined ? order_index : 0,
        active: active !== undefined ? active : true,
      })
      .eq('id', params.id)
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

// DELETE - Delete a home video
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, role } = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { allowed, error: permError } = await requirePermission(user.id, role || '', 'cms_videos.delete');
    if (!allowed) {
      return NextResponse.json({ error: permError || 'Permission denied' }, { status: 403 });
    }

    // Fetch the row first so we can also remove its files from storage.
    const { data: existing } = await supabaseAdmin
      .from('home_videos')
      .select('video_url, poster_url')
      .eq('id', params.id)
      .single();

    const { error } = await supabaseAdmin.from('home_videos').delete().eq('id', params.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Best-effort cleanup of the underlying files in the home-videos bucket.
    try {
      const keys: string[] = [];
      for (const url of [existing?.video_url, existing?.poster_url]) {
        if (typeof url === 'string') {
          const marker = '/home-videos/';
          const idx = url.indexOf(marker);
          if (idx !== -1) keys.push(url.slice(idx + marker.length));
        }
      }
      if (keys.length) await supabaseAdmin.storage.from('home-videos').remove(keys);
    } catch (cleanupErr) {
      console.error('Video file cleanup failed (row already deleted):', cleanupErr);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
