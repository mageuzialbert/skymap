import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, supabaseAdmin } from '@/lib/auth-server';
import { saveUserPermissions } from '@/lib/permissions-server';
import { getDefaultPermissions } from '@/lib/permissions';

// GET - List all users with filters
export async function GET(request: NextRequest) {
  try {
    const { user, role } = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const userRole = searchParams.get('role');
    const active = searchParams.get('active');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // STAFF can only query RIDER users (for assignment purposes)
    // ADMIN can query all users
    if (role === 'STAFF') {
      if (userRole !== 'RIDER') {
        return NextResponse.json(
          { error: 'Staff can only query riders' },
          { status: 403 }
        );
      }
    } else if (role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    let query = supabaseAdmin
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (userRole) {
      query = query.eq('role', userRole);
    }
    if (active !== null) {
      query = query.eq('active', active === 'true');
    }

    const { data: users, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(users || []);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create user (staff/rider)
export async function POST(request: NextRequest) {
  try {
    const { user, role } = await getAuthenticatedUser();

    if (!user || role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const {
      name,
      phone,
      email,
      password,
      role: userRole,
      permissions,
    } = await request.json();

    // Validation
    if (!name || !phone || !email || !password || !userRole) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    if (userRole !== 'STAFF' && userRole !== 'RIDER') {
      return NextResponse.json(
        { error: 'Role must be STAFF or RIDER' },
        { status: 400 }
      );
    }

    // Normalize phone number
    let phoneNumber = phone.trim();
    if (!phoneNumber.startsWith('+255')) {
      phoneNumber = '+255' + phoneNumber.replace(/^\+?255?/, '').replace(/\D/g, '');
    } else {
      phoneNumber = '+255' + phoneNumber.replace(/^\+255/, '').replace(/\D/g, '');
    }

    // Validate phone format
    const digitsAfter255 = phoneNumber.replace(/^\+255/, '');
    if (digitsAfter255.length !== 9) {
      return NextResponse.json(
        { error: 'Phone number must be exactly 9 digits after +255' },
        { status: 400 }
      );
    }

    // Check if phone already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('phone', phoneNumber)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'Phone number already registered' },
        { status: 400 }
      );
    }

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        phone: phoneNumber,
        role: userRole,
      },
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || 'Failed to create user' },
        { status: 500 }
      );
    }

    // Create user record (trigger should handle this, but we'll upsert to be safe)
    const { error: userError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: authData.user.id,
        name,
        email,
        phone: phoneNumber,
        role: userRole,
        active: true,
      }, {
        onConflict: 'id'
      });

    if (userError) {
      // Rollback: delete auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: userError.message },
        { status: 500 }
      );
    }

    // Save user permissions
    const userPermissions = permissions && Array.isArray(permissions) 
      ? permissions 
      : getDefaultPermissions(userRole);
    
    const { success: permissionsSuccess, error: permissionsError } = await saveUserPermissions(
      authData.user.id,
      userPermissions,
      userRole
    );

    if (!permissionsSuccess) {
      console.error('Error saving permissions:', permissionsError);
      // Don't fail the whole request, just log the error
      // Permissions can be updated later
    }

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        name,
        email,
        phone: phoneNumber,
        role: userRole,
        active: true,
        permissions: userPermissions,
      },
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
