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

const BUCKET_NAME = 'home-videos';

// POST - Upload a landing video (or poster image) to Supabase Storage
export async function POST(request: NextRequest) {
  try {
    const { user, role } = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    const { allowed, error: permError } = await requirePermission(user.id, role || '', 'cms_videos.create');
    if (!allowed) {
      return NextResponse.json({ error: permError || 'Permission denied' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const allowedTypes = [
      'video/mp4',
      'video/webm',
      'video/ogg',
      'video/quicktime',
      // posters
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: MP4, WebM, OGG, MOV (video) or JPEG/PNG/WebP (poster)' },
        { status: 400 }
      );
    }

    // Max 500MB for videos (matches bucket limit).
    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size exceeds 500MB limit' }, { status: 400 });
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'mp4';
    const fileName = `video-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json({ error: `Failed to upload file: ${uploadError.message}` }, { status: 500 });
    }

    const { data: urlData } = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(fileName);

    return NextResponse.json({ url: urlData.publicUrl, fileName });
  } catch (error) {
    console.error('Video upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
