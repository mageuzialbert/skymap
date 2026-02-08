'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase';
import { UserRole } from './roles';

interface PermissionsContextType {
  permissions: string[];
  role: UserRole | null;
  userId: string | null;
  loading: boolean;
  hasPermission: (permission: string) => boolean;
  hasModuleAccess: (moduleId: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  refreshPermissions: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [role, setRole] = useState<UserRole | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPermissions = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setPermissions([]);
        setRole(null);
        setUserId(null);
        setLoading(false);
        return;
      }

      setUserId(user.id);

      // Get role from metadata or database
      let userRole = user.user_metadata?.role as UserRole;
      
      if (!userRole) {
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();
        userRole = userData?.role;
      }

      setRole(userRole);

      // ADMIN has all permissions
      if (userRole === 'ADMIN') {
        setPermissions(['*']); // Special marker for full access
        setLoading(false);
        return;
      }

      // BUSINESS has fixed permissions
      if (userRole === 'BUSINESS') {
        setPermissions([
          'deliveries.create',
          'deliveries.view_own',
          'invoices.view_own',
        ]);
        setLoading(false);
        return;
      }

      // STAFF and RIDER - fetch from database
      if (userRole === 'STAFF' || userRole === 'RIDER') {
        const { data: permData } = await supabase
          .from('user_permissions')
          .select('permission')
          .eq('user_id', user.id);

        setPermissions(permData?.map(p => p.permission) || []);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading permissions:', error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPermissions();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadPermissions();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadPermissions]);

  const hasPermission = useCallback((permission: string): boolean => {
    if (role === 'ADMIN' || permissions.includes('*')) return true;
    return permissions.includes(permission);
  }, [role, permissions]);

  const hasModuleAccess = useCallback((moduleId: string): boolean => {
    if (role === 'ADMIN' || permissions.includes('*')) return true;
    return permissions.some(p => p.startsWith(`${moduleId}.`));
  }, [role, permissions]);

  const hasAnyPermission = useCallback((permissionList: string[]): boolean => {
    if (role === 'ADMIN' || permissions.includes('*')) return true;
    return permissionList.some(p => permissions.includes(p));
  }, [role, permissions]);

  const refreshPermissions = useCallback(async () => {
    setLoading(true);
    await loadPermissions();
  }, [loadPermissions]);

  return (
    <PermissionsContext.Provider
      value={{
        permissions,
        role,
        userId,
        loading,
        hasPermission,
        hasModuleAccess,
        hasAnyPermission,
        refreshPermissions,
      }}
    >
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionsContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
}

// Hook for checking a single permission
export function useHasPermission(permission: string): boolean {
  const { hasPermission, loading } = usePermissions();
  if (loading) return false;
  return hasPermission(permission);
}

// Hook for checking module access
export function useHasModuleAccess(moduleId: string): boolean {
  const { hasModuleAccess, loading } = usePermissions();
  if (loading) return false;
  return hasModuleAccess(moduleId);
}
