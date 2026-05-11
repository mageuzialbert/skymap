'use client';

import { User, Shield, Bike, Building2, X, Edit, Eye, IdCard } from 'lucide-react';

interface UserData {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  active: boolean;
  created_at: string;
  profile_picture_url?: string | null;
  license_number?: string | null;
}

interface UsersTableProps {
  users: UserData[];
  onView?: (user: UserData) => void;
  onEdit?: (user: UserData) => void;
  onDeactivate?: (userId: string) => void;
  showActions?: boolean;
}

const roleIcons: Record<string, any> = {
  ADMIN: Shield,
  STAFF: User,
  RIDER: Bike,
  BUSINESS: Building2,
};

const roleColors: Record<string, string> = {
  ADMIN: 'bg-purple-100 text-purple-800',
  STAFF: 'bg-blue-100 text-blue-800',
  RIDER: 'bg-emerald-100 text-emerald-800',
  BUSINESS: 'bg-amber-100 text-amber-800',
};

export default function UsersTable({
  users,
  onView,
  onEdit,
  onDeactivate,
  showActions = true,
}: UsersTableProps) {
  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                License
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              {showActions && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.length === 0 ? (
              <tr>
                <td
                  colSpan={showActions ? 7 : 6}
                  className="px-6 py-10 text-center text-gray-500"
                >
                  No riders found
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const RoleIcon = roleIcons[user.role] || User;
                return (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-11 w-11 rounded-full overflow-hidden border border-gray-200 bg-gray-100">
                          {user.profile_picture_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={user.profile_picture_url}
                              alt={user.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                              <RoleIcon className="w-5 h-5 text-gray-500" />
                            </div>
                          )}
                        </div>
                        <div className="ml-3 min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">{user.name}</div>
                          <div className="text-xs text-gray-500 truncate">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.license_number ? (
                        <div className="inline-flex items-center gap-1.5 text-sm text-gray-700">
                          <IdCard className="w-4 h-4 text-gray-400" />
                          <span className="font-mono">{user.license_number}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Not set</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          roleColors[user.role] || roleColors.STAFF
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {user.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.created_at)}
                    </td>
                    {showActions && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-1.5">
                          {onView && (
                            <button
                              onClick={() => onView(user)}
                              className="p-1.5 text-gray-600 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                              title="View details"
                              aria-label={`View details of ${user.name}`}
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                          {onEdit && (
                            <button
                              onClick={() => onEdit(user)}
                              className="p-1.5 text-gray-600 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                              title="Edit user"
                              aria-label={`Edit ${user.name}`}
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                          {onDeactivate && user.active && (
                            <button
                              onClick={() => onDeactivate(user.id)}
                              className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Deactivate user"
                              aria-label={`Deactivate ${user.name}`}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
