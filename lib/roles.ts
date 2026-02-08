import { supabase } from './supabase';
import { 
  getUserPermissions as getDbPermissions, 
  checkUserPermission,
  checkModuleAccess,
  parsePermission
} from './permissions';

export type UserRole = 'ADMIN' | 'STAFF' | 'RIDER' | 'BUSINESS';

// Legacy permission mappings (for backward compatibility and BUSINESS role)
const LEGACY_PERMISSIONS: Record<UserRole, string[]> = {
  ADMIN: [
    'view_all_deliveries',
    'create_delivery',
    'assign_rider',
    'view_invoices',
    'generate_invoices',
    'view_reports',
    'manage_users',
    'manage_businesses',
  ],
  STAFF: [
    'view_all_deliveries',
    'create_delivery',
    'assign_rider',
    'view_invoices',
  ],
  RIDER: ['view_assigned_deliveries', 'update_delivery_status'],
  BUSINESS: ['create_delivery', 'view_own_deliveries', 'view_own_invoices'],
};

// Map legacy permissions to new module.action format
const LEGACY_TO_NEW_PERMISSION_MAP: Record<string, string> = {
  'view_all_deliveries': 'deliveries.view',
  'create_delivery': 'deliveries.create',
  'assign_rider': 'deliveries.assign',
  'view_invoices': 'invoices.view',
  'generate_invoices': 'invoices.create',
  'view_reports': 'financial.view',
  'manage_users': 'users.view',
  'manage_businesses': 'businesses.view',
  'view_assigned_deliveries': 'deliveries.view_assigned',
  'update_delivery_status': 'deliveries.update_status',
};

export async function getUserRole(): Promise<UserRole | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Get role from user metadata or users table
  const role = user.user_metadata?.role;
  if (role) {
    return role as UserRole;
  }

  // Fallback: check users table
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  return userData?.role || null;
}

export async function getCurrentUser(): Promise<{ id: string; role: UserRole } | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Get role from user metadata or users table
  let role = user.user_metadata?.role as UserRole;
  
  if (!role) {
    // Fallback: check users table
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    
    role = userData?.role || null;
  }

  if (!role) return null;

  return { id: user.id, role };
}

export async function requireRole(allowedRoles: UserRole[]): Promise<UserRole> {
  const role = await getUserRole();

  if (!role || !allowedRoles.includes(role)) {
    throw new Error('Unauthorized');
  }

  return role;
}

// Legacy permission check (still used for backward compatibility)
export function hasPermission(
  role: UserRole | null,
  permission: string
): boolean {
  if (!role) return false;

  // ADMIN always has full access
  if (role === 'ADMIN') return true;

  // For BUSINESS, use legacy permissions
  if (role === 'BUSINESS') {
    return LEGACY_PERMISSIONS[role]?.includes(permission) || false;
  }

  // For STAFF and RIDER, this is a fallback - actual checks should use async version
  return LEGACY_PERMISSIONS[role]?.includes(permission) || false;
}

// New async permission check that queries the database
export async function hasPermissionAsync(permission: string): Promise<boolean> {
  const currentUser = await getCurrentUser();
  if (!currentUser) return false;

  const { id: userId, role } = currentUser;

  // ADMIN always has full access
  if (role === 'ADMIN') return true;

  // For BUSINESS, use legacy permissions
  if (role === 'BUSINESS') {
    return LEGACY_PERMISSIONS[role]?.includes(permission) || false;
  }

  // Convert legacy permission to new format if needed
  const newPermission = LEGACY_TO_NEW_PERMISSION_MAP[permission] || permission;

  // For STAFF and RIDER, check database permissions
  return checkUserPermission(userId, newPermission);
}

// Check if current user has access to a module
export async function hasModuleAccessAsync(moduleId: string): Promise<boolean> {
  const currentUser = await getCurrentUser();
  if (!currentUser) return false;

  const { id: userId, role } = currentUser;

  // ADMIN always has full access
  if (role === 'ADMIN') return true;

  // For BUSINESS, they don't have access to admin modules
  if (role === 'BUSINESS') return false;

  // For STAFF and RIDER, check database permissions
  return checkModuleAccess(userId, moduleId);
}

// Get all permissions for current user
export async function getCurrentUserPermissions(): Promise<string[]> {
  const currentUser = await getCurrentUser();
  if (!currentUser) return [];

  const { id: userId, role } = currentUser;

  // ADMIN has all permissions
  if (role === 'ADMIN') {
    return ['*']; // Special marker for full access
  }

  // For BUSINESS, return legacy permissions
  if (role === 'BUSINESS') {
    return LEGACY_PERMISSIONS[role] || [];
  }

  // For STAFF and RIDER, get from database
  return getDbPermissions(userId);
}

// Check multiple permissions (returns true if user has ALL)
export async function hasAllPermissions(permissions: string[]): Promise<boolean> {
  for (const permission of permissions) {
    if (!(await hasPermissionAsync(permission))) {
      return false;
    }
  }
  return true;
}

// Check multiple permissions (returns true if user has ANY)
export async function hasAnyPermission(permissions: string[]): Promise<boolean> {
  for (const permission of permissions) {
    if (await hasPermissionAsync(permission)) {
      return true;
    }
  }
  return false;
}
