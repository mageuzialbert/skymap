'use client';

import { useState, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronRight, Check, Shield, ShieldCheck, ShieldX } from 'lucide-react';
import {
  PERMISSION_MODULES,
  getAvailablePermissionsForRole,
  formatPermission,
  getDefaultPermissions,
  FULL_STAFF_PERMISSIONS,
  DEFAULT_RIDER_PERMISSIONS,
  PermissionModule,
} from '@/lib/permissions';

interface PermissionSelectorProps {
  role: 'STAFF' | 'RIDER';
  selectedPermissions: string[];
  onChange: (permissions: string[]) => void;
  disabled?: boolean;
}

type PresetType = 'full' | 'default' | 'view_only' | 'custom';

export default function PermissionSelector({
  role,
  selectedPermissions,
  onChange,
  disabled = false,
}: PermissionSelectorProps) {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [preset, setPreset] = useState<PresetType>('custom');

  // Get available modules for the selected role
  const availableModules = useMemo(() => {
    return getAvailablePermissionsForRole(role);
  }, [role]);

  // Calculate preset based on current selection
  useEffect(() => {
    const fullPermissions = role === 'STAFF' ? FULL_STAFF_PERMISSIONS : DEFAULT_RIDER_PERMISSIONS;
    const defaultPermissions = getDefaultPermissions(role);
    
    // Check if all permissions are selected
    const hasAllPermissions = fullPermissions.every(p => selectedPermissions.includes(p));
    if (hasAllPermissions && selectedPermissions.length === fullPermissions.length) {
      setPreset('full');
      return;
    }

    // Check if default permissions are selected
    const hasDefaultPermissions = defaultPermissions.every(p => selectedPermissions.includes(p));
    if (hasDefaultPermissions && selectedPermissions.length === defaultPermissions.length) {
      setPreset('default');
      return;
    }

    // Check if only view permissions are selected
    const viewOnlyPermissions = availableModules.flatMap(m => 
      m.actions.filter(a => a.id === 'view' || a.id === 'view_assigned').map(a => formatPermission(m.id, a.id))
    );
    const hasOnlyViewPermissions = selectedPermissions.every(p => viewOnlyPermissions.includes(p));
    if (hasOnlyViewPermissions && selectedPermissions.length > 0) {
      setPreset('view_only');
      return;
    }

    setPreset('custom');
  }, [selectedPermissions, role, availableModules]);

  // Toggle module expansion
  const toggleModule = (moduleId: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId);
    } else {
      newExpanded.add(moduleId);
    }
    setExpandedModules(newExpanded);
  };

  // Check if a specific permission is selected
  const isPermissionSelected = (moduleId: string, actionId: string): boolean => {
    return selectedPermissions.includes(formatPermission(moduleId, actionId));
  };

  // Check if all actions in a module are selected
  const isModuleFullySelected = (module: PermissionModule): boolean => {
    return module.actions.every(a => isPermissionSelected(module.id, a.id));
  };

  // Check if any action in a module is selected
  const isModulePartiallySelected = (module: PermissionModule): boolean => {
    return module.actions.some(a => isPermissionSelected(module.id, a.id)) && 
           !isModuleFullySelected(module);
  };

  // Toggle a specific permission
  const togglePermission = (moduleId: string, actionId: string) => {
    if (disabled) return;
    
    const permission = formatPermission(moduleId, actionId);
    if (selectedPermissions.includes(permission)) {
      onChange(selectedPermissions.filter(p => p !== permission));
    } else {
      onChange([...selectedPermissions, permission]);
    }
  };

  // Toggle all permissions in a module
  const toggleModulePermissions = (module: PermissionModule) => {
    if (disabled) return;
    
    const modulePermissions = module.actions.map(a => formatPermission(module.id, a.id));
    
    if (isModuleFullySelected(module)) {
      // Remove all module permissions
      onChange(selectedPermissions.filter(p => !modulePermissions.includes(p)));
    } else {
      // Add all module permissions
      const newPermissions = [...selectedPermissions];
      for (const perm of modulePermissions) {
        if (!newPermissions.includes(perm)) {
          newPermissions.push(perm);
        }
      }
      onChange(newPermissions);
    }
  };

  // Apply a preset
  const applyPreset = (presetType: PresetType) => {
    if (disabled) return;
    
    switch (presetType) {
      case 'full':
        if (role === 'STAFF') {
          onChange([...FULL_STAFF_PERMISSIONS]);
        } else {
          onChange([...DEFAULT_RIDER_PERMISSIONS]);
        }
        break;
      case 'default':
        onChange(getDefaultPermissions(role));
        break;
      case 'view_only':
        const viewPermissions = availableModules.flatMap(m => 
          m.actions.filter(a => a.id === 'view' || a.id === 'view_assigned').map(a => formatPermission(m.id, a.id))
        );
        onChange(viewPermissions);
        break;
      case 'custom':
        // Don't change anything for custom
        break;
    }
  };

  // Select all permissions
  const selectAll = () => {
    if (disabled) return;
    const allPermissions = availableModules.flatMap(m => 
      m.actions.map(a => formatPermission(m.id, a.id))
    );
    onChange(allPermissions);
  };

  // Clear all permissions
  const clearAll = () => {
    if (disabled) return;
    onChange([]);
  };

  // Expand all modules
  const expandAll = () => {
    setExpandedModules(new Set(availableModules.map(m => m.id)));
  };

  // Collapse all modules
  const collapseAll = () => {
    setExpandedModules(new Set());
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-gray-600" />
            <span className="font-medium text-gray-900">Access Permissions</span>
            <span className="text-sm text-gray-500">
              ({selectedPermissions.length} selected)
            </span>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            {/* Preset dropdown */}
            <select
              value={preset}
              onChange={(e) => applyPreset(e.target.value as PresetType)}
              disabled={disabled}
              className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
            >
              <option value="full">Full Access</option>
              <option value="default">Default</option>
              <option value="view_only">View Only</option>
              <option value="custom">Custom</option>
            </select>
            
            {/* Action buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={selectAll}
                disabled={disabled}
                className="text-xs px-2 py-1 text-primary hover:bg-primary/10 rounded disabled:opacity-50"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={clearAll}
                disabled={disabled}
                className="text-xs px-2 py-1 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={expandedModules.size > 0 ? collapseAll : expandAll}
                className="text-xs px-2 py-1 text-gray-600 hover:bg-gray-100 rounded"
              >
                {expandedModules.size > 0 ? 'Collapse' : 'Expand'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Permission modules */}
      <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
        {availableModules.map((module) => {
          const isExpanded = expandedModules.has(module.id);
          const isFullySelected = isModuleFullySelected(module);
          const isPartiallySelected = isModulePartiallySelected(module);

          return (
            <div key={module.id} className="bg-white">
              {/* Module header */}
              <div
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                  disabled ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                onClick={() => toggleModule(module.id)}
              >
                {/* Expand/collapse icon */}
                <button
                  type="button"
                  className="p-0.5 hover:bg-gray-200 rounded"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleModule(module.id);
                  }}
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  )}
                </button>

                {/* Module checkbox */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleModulePermissions(module);
                  }}
                  disabled={disabled}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    isFullySelected
                      ? 'bg-primary border-primary text-white'
                      : isPartiallySelected
                      ? 'bg-primary/30 border-primary'
                      : 'border-gray-300 hover:border-gray-400'
                  } ${disabled ? 'cursor-not-allowed' : ''}`}
                >
                  {isFullySelected && <Check className="w-3 h-3" />}
                  {isPartiallySelected && (
                    <div className="w-2 h-2 bg-primary rounded-sm" />
                  )}
                </button>

                {/* Module info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{module.name}</span>
                    {isFullySelected && (
                      <ShieldCheck className="w-4 h-4 text-green-600" />
                    )}
                    {!isFullySelected && !isPartiallySelected && (
                      <ShieldX className="w-4 h-4 text-gray-300" />
                    )}
                  </div>
                  <p className="text-sm text-gray-500 truncate">{module.description}</p>
                </div>

                {/* Selected count */}
                <span className="text-sm text-gray-400">
                  {module.actions.filter(a => isPermissionSelected(module.id, a.id)).length}/
                  {module.actions.length}
                </span>
              </div>

              {/* Module actions (expanded) */}
              {isExpanded && (
                <div className="px-4 pb-3 pl-14 bg-gray-50/50">
                  <div className="flex flex-wrap gap-2">
                    {module.actions.map((action) => {
                      const isSelected = isPermissionSelected(module.id, action.id);
                      return (
                        <button
                          key={action.id}
                          type="button"
                          onClick={() => togglePermission(module.id, action.id)}
                          disabled={disabled}
                          title={action.description}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors ${
                            isSelected
                              ? 'bg-primary text-white'
                              : 'bg-white border border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                          } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                          {action.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer info */}
      {availableModules.length === 0 && (
        <div className="p-4 text-center text-gray-500">
          No configurable permissions available for this role.
        </div>
      )}
    </div>
  );
}
