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

const BUCKET_NAME = 'company-assets';
const COMPANY_PROFILE_ID = '00000000-0000-0000-0000-000000000001';

// POST - Upload favicon to Supabase Storage
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

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type (favicon formats)
    const allowedTypes = ['image/x-icon', 'image/vnd.microsoft.icon', 'image/png', 'image/svg+xml'];
    const allowedExtensions = ['ico', 'png', 'svg'];
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    
    if (!fileExt || !allowedExtensions.includes(fileExt)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed types: ICO, PNG, SVG' },
        { status: 400 }
      );
    }

    // Validate file size (max 1MB for favicon)
    const maxSize = 1 * 1024 * 1024; // 1MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 1MB limit' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const fileName = `favicon-${Date.now()}.${fileExt}`;
    const filePath = `favicons/${fileName}`;

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType: file.type || 'image/x-icon',
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json(
        { error: `Failed to upload file: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    // Update company profile with favicon URL
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('company_profile')
      .upsert({
        id: COMPANY_PROFILE_ID,
        favicon_url: publicUrl,
      }, {
        onConflict: 'id'
      })
      .select()
      .single();

    if (profileError) {
      // If profile doesn't exist, create it
      const { data: newProfile, error: createError } = await supabaseAdmin
        .from('company_profile')
        .insert({
          id: COMPANY_PROFILE_ID,
          company_name: 'Kasi Courier Services',
          favicon_url: publicUrl,
        })
        .select()
        .single();

      if (createError) {
        return NextResponse.json(
          { error: `Failed to update profile: ${createError.message}` },
          { status: 500 }
        );
      }

      return NextResponse.json({
        url: publicUrl,
        profile: newProfile,
      });
    }

    return NextResponse.json({
      url: publicUrl,
      profile: profileData,
    });
  } catch (error) {
    console.error('Favicon upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
