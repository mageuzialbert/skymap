import { supabaseAdmin } from './auth-server';
import { 
  DEFAULT_STAFF_PERMISSIONS, 
  DEFAULT_RIDER_PERMISSIONS,
  validatePermissions,
  parsePermission
} from './permissions';

// Get user permissions from database (server-side)
export async function getUserPermissionsServer(userId: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from('user_permissions')
    .select('permission')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching user permissions:', error);
    return [];
  }

  return data?.map(p => p.permission) || [];
}

// Check if user has a specific permission (server-side)
export async function checkPermissionServer(userId: string, permission: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('user_permissions')
    .select('id')
    .eq('user_id', userId)
    .eq('permission', permission)
    .maybeSingle();

  if (error) {
    console.error('Error checking permission:', error);
    return false;
  }

  return !!data;
}

// Check if user has module access (any action in the module) - server-side
export async function checkModuleAccessServer(userId: string, moduleId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('user_permissions')
    .select('permission')
    .eq('user_id', userId)
    .like('permission', `${moduleId}.%`)
    .limit(1);

  if (error) {
    console.error('Error checking module access:', error);
    return false;
  }

  return (data?.length || 0) > 0;
}

// Save user permissions (replaces all existing permissions)
export async function saveUserPermissions(
  userId: string, 
  permissions: string[],
  role: 'STAFF' | 'RIDER'
): Promise<{ success: boolean; error?: string }> {
  // Validate permissions for the role
  const validPermissions = validatePermissions(permissions, role);

  // Delete existing permissions
  const { error: deleteError } = await supabaseAdmin
    .from('user_permissions')
    .delete()
    .eq('user_id', userId);

  if (deleteError) {
    console.error('Error deleting existing permissions:', deleteError);
    return { success: false, error: deleteError.message };
  }

  // Insert new permissions if any
  if (validPermissions.length > 0) {
    const permissionRecords = validPermissions.map(permission => ({
      user_id: userId,
      permission,
    }));

    const { error: insertError } = await supabaseAdmin
      .from('user_permissions')
      .insert(permissionRecords);

    if (insertError) {
      console.error('Error inserting permissions:', insertError);
      return { success: false, error: insertError.message };
    }
  }

  return { success: true };
}

// Add default permissions for a new user
export async function addDefaultPermissions(
  userId: string, 
  role: 'STAFF' | 'RIDER'
): Promise<{ success: boolean; error?: string }> {
  const defaultPermissions = role === 'STAFF' 
    ? DEFAULT_STAFF_PERMISSIONS 
    : DEFAULT_RIDER_PERMISSIONS;

  return saveUserPermissions(userId, defaultPermissions, role);
}

// Check if user has any permissions set (for backward compatibility)
export async function hasAnyPermissions(userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('user_permissions')
    .select('id')
    .eq('user_id', userId)
    .limit(1);

  if (error) {
    console.error('Error checking if user has permissions:', error);
    return false;
  }

  return (data?.length || 0) > 0;
}

// Ensure user has permissions (add defaults if none exist) - for backward compatibility
export async function ensureUserPermissions(
  userId: string, 
  role: 'STAFF' | 'RIDER'
): Promise<string[]> {
  const hasPermissions = await hasAnyPermissions(userId);
  
  if (!hasPermissions) {
    // Add default permissions for existing users without permissions
    await addDefaultPermissions(userId, role);
  }

  return getUserPermissionsServer(userId);
}

// Permission check for API routes
export async function requirePermission(
  userId: string,
  role: string,
  requiredPermission: string
): Promise<{ allowed: boolean; error?: string }> {
  // ADMIN always has full access
  if (role === 'ADMIN') {
    return { allowed: true };
  }

  // BUSINESS users have hardcoded permissions, not checked here
  if (role === 'BUSINESS') {
    return { allowed: false, error: 'Permission denied' };
  }

  // STAFF and RIDER - check database permissions
  if (role === 'STAFF' || role === 'RIDER') {
    // Ensure user has permissions (backward compatibility)
    await ensureUserPermissions(userId, role as 'STAFF' | 'RIDER');
    
    const hasPermission = await checkPermissionServer(userId, requiredPermission);
    if (hasPermission) {
      return { allowed: true };
    }
  }

  return { allowed: false, error: 'Permission denied' };
}

// Permission check for module access in API routes
export async function requireModuleAccess(
  userId: string,
  role: string,
  moduleId: string
): Promise<{ allowed: boolean; error?: string }> {
  // ADMIN always has full access
  if (role === 'ADMIN') {
    return { allowed: true };
  }

  // STAFF and RIDER - check database permissions
  if (role === 'STAFF' || role === 'RIDER') {
    // Ensure user has permissions (backward compatibility)
    await ensureUserPermissions(userId, role as 'STAFF' | 'RIDER');
    
    const hasAccess = await checkModuleAccessServer(userId, moduleId);
    if (hasAccess) {
      return { allowed: true };
    }
  }

  return { allowed: false, error: 'Permission denied' };
}

// Get permissions summary for a user (for display)
export async function getPermissionsSummary(userId: string): Promise<{
  modules: string[];
  totalPermissions: number;
}> {
  const permissions = await getUserPermissionsServer(userId);
  const modules = new Set<string>();

  for (const permission of permissions) {
    const parsed = parsePermission(permission);
    if (parsed) {
      modules.add(parsed.moduleId);
    }
  }

  return {
    modules: Array.from(modules),
    totalPermissions: permissions.length,
  };
}
