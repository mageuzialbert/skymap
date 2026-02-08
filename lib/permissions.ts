import { supabase } from './supabase';

// Permission module definitions
export interface PermissionModule {
  id: string;
  name: string;
  description: string;
  actions: PermissionAction[];
  availableFor: ('STAFF' | 'RIDER')[];
}

export interface PermissionAction {
  id: string;
  name: string;
  description: string;
}

// All available permission modules with their actions
export const PERMISSION_MODULES: PermissionModule[] = [
  {
    id: 'businesses',
    name: 'Businesses',
    description: 'Manage registered businesses',
    availableFor: ['STAFF', 'RIDER'],
    actions: [
      { id: 'view', name: 'View', description: 'View business list and details' },
      { id: 'create', name: 'Create', description: 'Register new businesses' },
      { id: 'update', name: 'Update', description: 'Edit business information' },
      { id: 'delete', name: 'Delete', description: 'Deactivate businesses' },
    ],
  },
  {
    id: 'users',
    name: 'Users',
    description: 'Manage staff and rider accounts',
    availableFor: ['STAFF'],
    actions: [
      { id: 'view', name: 'View', description: 'View user list and details' },
      { id: 'create', name: 'Create', description: 'Create new staff/rider accounts' },
      { id: 'update', name: 'Update', description: 'Edit user information' },
      { id: 'delete', name: 'Delete', description: 'Deactivate user accounts' },
    ],
  },
  {
    id: 'deliveries',
    name: 'Deliveries',
    description: 'Manage delivery orders',
    availableFor: ['STAFF', 'RIDER'],
    actions: [
      { id: 'view', name: 'View All', description: 'View all deliveries' },
      { id: 'view_assigned', name: 'View Assigned', description: 'View assigned deliveries only' },
      { id: 'create', name: 'Create', description: 'Create new delivery orders' },
      { id: 'assign', name: 'Assign Rider', description: 'Assign riders to deliveries' },
      { id: 'update_status', name: 'Update Status', description: 'Update delivery status' },
    ],
  },
  {
    id: 'operations',
    name: 'Operations',
    description: 'View operations dashboard and metrics',
    availableFor: ['STAFF'],
    actions: [
      { id: 'view', name: 'View', description: 'Access operations dashboard' },
    ],
  },
  {
    id: 'financial',
    name: 'Financial Analytics',
    description: 'View financial reports and analytics',
    availableFor: ['STAFF'],
    actions: [
      { id: 'view', name: 'View', description: 'Access financial dashboard' },
    ],
  },
  {
    id: 'expenses',
    name: 'Expenses',
    description: 'Track and manage platform expenses',
    availableFor: ['STAFF'],
    actions: [
      { id: 'view', name: 'View', description: 'View expense records' },
      { id: 'create', name: 'Create', description: 'Record new expenses' },
      { id: 'update', name: 'Update', description: 'Edit expense records' },
      { id: 'delete', name: 'Delete', description: 'Delete expense records' },
    ],
  },
  {
    id: 'expense_categories',
    name: 'Expense Categories',
    description: 'Manage expense categories',
    availableFor: ['STAFF'],
    actions: [
      { id: 'view', name: 'View', description: 'View expense categories' },
      { id: 'create', name: 'Create', description: 'Create new categories' },
      { id: 'update', name: 'Update', description: 'Edit categories' },
      { id: 'delete', name: 'Delete', description: 'Delete categories' },
    ],
  },
  {
    id: 'invoices',
    name: 'Invoices',
    description: 'Manage invoices and proforma invoices',
    availableFor: ['STAFF'],
    actions: [
      { id: 'view', name: 'View', description: 'View all invoices' },
      { id: 'create', name: 'Create', description: 'Generate invoices' },
      { id: 'update', name: 'Update', description: 'Edit invoice details' },
      { id: 'delete', name: 'Delete', description: 'Delete invoices' },
    ],
  },
  {
    id: 'cms_sliders',
    name: 'CMS - Sliders',
    description: 'Manage landing page slider images',
    availableFor: ['STAFF'],
    actions: [
      { id: 'view', name: 'View', description: 'View slider images' },
      { id: 'create', name: 'Create', description: 'Add new slider images' },
      { id: 'update', name: 'Update', description: 'Edit slider settings' },
      { id: 'delete', name: 'Delete', description: 'Remove slider images' },
    ],
  },
  {
    id: 'cms_content',
    name: 'CMS - Content',
    description: 'Manage website content (About Us, etc.)',
    availableFor: ['STAFF'],
    actions: [
      { id: 'view', name: 'View', description: 'View CMS content' },
      { id: 'update', name: 'Update', description: 'Edit website content' },
    ],
  },
  {
    id: 'company_profile',
    name: 'Company Profile',
    description: 'Manage company logo, contact info, and details',
    availableFor: ['STAFF'],
    actions: [
      { id: 'view', name: 'View', description: 'View company profile' },
      { id: 'update', name: 'Update', description: 'Edit company profile' },
    ],
  },
  {
    id: 'payment_instructions',
    name: 'Payment Instructions',
    description: 'Configure payment instructions for invoices',
    availableFor: ['STAFF'],
    actions: [
      { id: 'view', name: 'View', description: 'View payment instructions' },
      { id: 'update', name: 'Update', description: 'Edit payment instructions' },
    ],
  },
  {
    id: 'delivery_packages',
    name: 'Delivery Packages',
    description: 'Manage delivery fee packages',
    availableFor: ['STAFF'],
    actions: [
      { id: 'view', name: 'View', description: 'View delivery packages' },
      { id: 'create', name: 'Create', description: 'Create new packages' },
      { id: 'update', name: 'Update', description: 'Edit package details' },
      { id: 'delete', name: 'Delete', description: 'Delete packages' },
    ],
  },
];

// Default permissions for new STAFF users
export const DEFAULT_STAFF_PERMISSIONS: string[] = [
  // Deliveries
  'deliveries.view',
  'deliveries.create',
  'deliveries.assign',
  // Invoices (view only by default)
  'invoices.view',
  // Operations
  'operations.view',
];

// Default permissions for new RIDER users
export const DEFAULT_RIDER_PERMISSIONS: string[] = [
  'deliveries.view_assigned',
  'deliveries.create',
  'deliveries.update_status',
];

// Full permissions for STAFF (all permissions)
export const FULL_STAFF_PERMISSIONS: string[] = PERMISSION_MODULES
  .filter(m => m.availableFor.includes('STAFF'))
  .flatMap(m => m.actions.map(a => `${m.id}.${a.id}`));

// Get permissions available for a specific role
export function getAvailablePermissionsForRole(role: 'STAFF' | 'RIDER'): PermissionModule[] {
  return PERMISSION_MODULES.filter(m => m.availableFor.includes(role));
}

// Format permission string
export function formatPermission(moduleId: string, actionId: string): string {
  return `${moduleId}.${actionId}`;
}

// Parse permission string
export function parsePermission(permission: string): { moduleId: string; actionId: string } | null {
  const parts = permission.split('.');
  if (parts.length !== 2) return null;
  return { moduleId: parts[0], actionId: parts[1] };
}

// Get module by ID
export function getModuleById(moduleId: string): PermissionModule | undefined {
  return PERMISSION_MODULES.find(m => m.id === moduleId);
}

// Get action by ID within a module
export function getActionById(moduleId: string, actionId: string): PermissionAction | undefined {
  const moduleEntry = getModuleById(moduleId);
  return moduleEntry?.actions.find(a => a.id === actionId);
}

// Permission checking functions (client-side)
export async function getUserPermissions(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_permissions')
    .select('permission')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching user permissions:', error);
    return [];
  }

  return data?.map(p => p.permission) || [];
}

// Check if user has a specific permission (client-side)
export async function checkUserPermission(userId: string, permission: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_permissions')
    .select('id')
    .eq('user_id', userId)
    .eq('permission', permission)
    .single();

  if (error) {
    return false;
  }

  return !!data;
}

// Check if user has module access (any action in the module)
export async function checkModuleAccess(userId: string, moduleId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_permissions')
    .select('permission')
    .eq('user_id', userId)
    .like('permission', `${moduleId}.%`);

  if (error) {
    return false;
  }

  return (data?.length || 0) > 0;
}

// Get default permissions based on role
export function getDefaultPermissions(role: 'STAFF' | 'RIDER'): string[] {
  if (role === 'STAFF') {
    return [...DEFAULT_STAFF_PERMISSIONS];
  }
  if (role === 'RIDER') {
    return [...DEFAULT_RIDER_PERMISSIONS];
  }
  return [];
}

// Group permissions by module for display
export function groupPermissionsByModule(permissions: string[]): Record<string, string[]> {
  const grouped: Record<string, string[]> = {};
  
  for (const permission of permissions) {
    const parsed = parsePermission(permission);
    if (parsed) {
      if (!grouped[parsed.moduleId]) {
        grouped[parsed.moduleId] = [];
      }
      grouped[parsed.moduleId].push(parsed.actionId);
    }
  }
  
  return grouped;
}

// Validate permissions array
export function validatePermissions(permissions: string[], role: 'STAFF' | 'RIDER'): string[] {
  const availableModules = getAvailablePermissionsForRole(role);
  const validPermissions: string[] = [];

  for (const permission of permissions) {
    const parsed = parsePermission(permission);
    if (!parsed) continue;

    const moduleEntry = availableModules.find(m => m.id === parsed.moduleId);
    if (!moduleEntry) continue;

    const action = moduleEntry.actions.find(a => a.id === parsed.actionId);
    if (!action) continue;

    validPermissions.push(permission);
  }

  return validPermissions;
}
