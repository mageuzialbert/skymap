import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, supabaseAdmin } from '@/lib/auth-server';
import { saveUserPermissions, getUserPermissionsServer } from '@/lib/permissions-server';

// GET - Get single user with permissions
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, role } = await getAuthenticatedUser();

    if (!user || role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Fetch user
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', params.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Fetch user permissions
    const permissions = await getUserPermissionsServer(params.id);

    return NextResponse.json({
      ...userData,
      permissions,
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      active,
      permissions,
      profile_picture_url,
      license_number,
      vehicle_type_id,
    } = await request.json();

    // Verify user exists
    const { data: existingUser, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', params.id)
      .single();

    if (fetchError || !existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Build update object
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) {
      // Normalize phone number
      let phoneNumber = phone.trim();
      if (!phoneNumber.startsWith('+255')) {
        phoneNumber = '+255' + phoneNumber.replace(/^\+?255?/, '').replace(/\D/g, '');
      } else {
        phoneNumber = '+255' + phoneNumber.replace(/^\+255/, '').replace(/\D/g, '');
      }
      updates.phone = phoneNumber;
    }
    if (email !== undefined) updates.email = email;
    if (userRole !== undefined) {
      if (userRole !== 'ADMIN' && userRole !== 'STAFF' && userRole !== 'RIDER' && userRole !== 'BUSINESS') {
        return NextResponse.json(
          { error: 'Invalid role' },
          { status: 400 }
        );
      }
      updates.role = userRole;
    }
    if (active !== undefined) updates.active = active;
    if (profile_picture_url !== undefined) updates.profile_picture_url = profile_picture_url;
    if (license_number !== undefined) {
      const finalRole = userRole || existingUser.role;
      updates.license_number = finalRole === 'RIDER' ? (license_number || null) : null;
    }
    if (vehicle_type_id !== undefined) {
      const finalRole = userRole || existingUser.role;
      updates.vehicle_type_id = finalRole === 'RIDER' ? (vehicle_type_id || null) : null;
    }

    // Update user record
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    // Update auth user if email or password changed
    const authUpdates: { email?: string; password?: string } = {};
    
    if (email && email !== existingUser.email) {
      authUpdates.email = email;
    }
    
    if (password && password.trim().length >= 6) {
      authUpdates.password = password;
    }
    
    if (Object.keys(authUpdates).length > 0) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(params.id, authUpdates);
      if (authError) {
        console.error('Error updating auth user:', authError);
        return NextResponse.json(
          { error: `Failed to update credentials: ${authError.message}` },
          { status: 500 }
        );
      }
    }

    // Update permissions if provided
    let savedPermissions: string[] = [];
    if (permissions !== undefined && Array.isArray(permissions)) {
      const finalRole = userRole || existingUser.role;
      if (finalRole === 'STAFF' || finalRole === 'RIDER') {
        const { success, error: permError } = await saveUserPermissions(
          params.id,
          permissions,
          finalRole as 'STAFF' | 'RIDER'
        );
        if (!success) {
          console.error('Error updating permissions:', permError);
        }
        savedPermissions = permissions;
      }
    } else {
      // Fetch existing permissions to return
      savedPermissions = await getUserPermissionsServer(params.id);
    }

    return NextResponse.json({
      success: true,
      user: {
        ...updatedUser,
        permissions: savedPermissions,
      },
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Deactivate (default) or hard-delete user (?hard=true)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, role } = await getAuthenticatedUser();

    if (!user || role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Don't allow deleting yourself
    if (params.id === user.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    // Verify user exists
    const { data: existingUser, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', params.id)
      .single();

    if (fetchError || !existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const hardDelete = request.nextUrl.searchParams.get('hard') === 'true';

    if (hardDelete) {
      // Hard delete: remove the auth user (cascades to public.users via FK ON DELETE CASCADE)
      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(params.id);
      if (authDeleteError) {
        return NextResponse.json(
          { error: authDeleteError.message },
          { status: 500 }
        );
      }

      // Defensive: if the FK doesn't cascade in this environment, also remove the row
      await supabaseAdmin.from('users').delete().eq('id', params.id);

      return NextResponse.json({ success: true, deleted: true });
    }

    // Soft delete by setting active to false
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update({ active: false })
      .eq('id', params.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
