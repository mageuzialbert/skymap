"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Package,
  Receipt,
  LogOut,
  Loader2,
  User,
  Shield,
  FileText,
  BarChart3,
  Image,
  Menu,
  X,
  Building2,
  Settings,
  CreditCard,
  FolderOpen,
} from "lucide-react";
import { getCurrentUser, logout } from "@/lib/auth";
import { getUserRole } from "@/lib/roles";
import { PermissionsProvider, usePermissions } from "@/lib/permissions-context";
import VerificationBanner from "./business/components/VerificationBanner";

// Navigation item interface with permission requirements
interface NavItem {
  href: string;
  label: string;
  icon: any;
  permissions?: string[]; // Required permissions (any of these)
  modules?: string[]; // Required module access (any of these)
}

function DashboardContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const {
    hasPermission,
    hasModuleAccess,
    hasAnyPermission,
    loading: permissionsLoading,
  } = usePermissions();

  useEffect(() => {
    async function checkAuth() {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        router.push("/login");
        return;
      }

      const userRole = await getUserRole();
      if (!userRole) {
        router.push("/login");
        return;
      }

      setUser(currentUser);
      setRole(userRole);
      setLoading(false);
    }

    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  if (loading || permissionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Get base dashboard path based on role
  const getDashboardBase = () => {
    switch (role) {
      case "BUSINESS":
        return "/dashboard/business";
      case "STAFF":
        return "/dashboard/staff";
      case "RIDER":
        return "/dashboard/rider";
      case "ADMIN":
        return "/dashboard/admin";
      default:
        return "/dashboard";
    }
  };

  const businessNavItems: NavItem[] = [
    { href: "/dashboard/business", label: "Overview", icon: LayoutDashboard },
    {
      href: "/dashboard/business/deliveries",
      label: "Deliveries",
      icon: Package,
    },
    { href: "/dashboard/business/invoices", label: "Invoices", icon: Receipt },
    { href: "/dashboard/business/profile", label: "Profile", icon: User },
    { href: "/dashboard/business/verify", label: "Verify", icon: Shield },
  ];

  // Admin has access to all items - no permission filtering needed
  const adminNavItems: NavItem[] = [
    { href: "/dashboard/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/admin/businesses", label: "Clients", icon: Building2 },
    { href: "/dashboard/admin/users", label: "Users", icon: User },
    { href: "/dashboard/staff/deliveries", label: "Deliveries", icon: Package },
    {
      href: "/dashboard/staff/operations",
      label: "Operations",
      icon: BarChart3,
    },
    { href: "/dashboard/staff/financial", label: "Financial", icon: Receipt },
    { href: "/dashboard/admin/cms/sliders", label: "CMS Sliders", icon: Image },
    {
      href: "/dashboard/admin/cms/content",
      label: "CMS Content",
      icon: FileText,
    },
  ];

  // Staff nav items with permission requirements
  const staffNavItems: NavItem[] = [
    { href: "/dashboard/staff", label: "Dashboard", icon: LayoutDashboard },
    {
      href: "/dashboard/staff/deliveries",
      label: "Deliveries",
      icon: Package,
      modules: ["deliveries"],
    },
    {
      href: "/dashboard/admin/businesses",
      label: "Clients",
      icon: Building2,
      modules: ["businesses"],
    },
    {
      href: "/dashboard/admin/users",
      label: "Users",
      icon: User,
      modules: ["users"],
    },
    {
      href: "/dashboard/staff/operations",
      label: "Operations",
      icon: BarChart3,
      modules: ["operations"],
    },
    {
      href: "/dashboard/staff/financial",
      label: "Financial",
      icon: Receipt,
      modules: ["financial"],
    },
    {
      href: "/dashboard/admin/invoices",
      label: "Invoices",
      icon: FileText,
      modules: ["invoices"],
    },
    {
      href: "/dashboard/admin/expenses",
      label: "Expenses",
      icon: BarChart3,
      modules: ["expenses"],
    },
    {
      href: "/dashboard/admin/delivery-packages",
      label: "Packages",
      icon: FolderOpen,
      modules: ["delivery_packages"],
    },
    {
      href: "/dashboard/admin/cms/sliders",
      label: "CMS Sliders",
      icon: Image,
      modules: ["cms_sliders"],
    },
    {
      href: "/dashboard/admin/cms/content",
      label: "CMS Content",
      icon: FileText,
      modules: ["cms_content"],
    },
    {
      href: "/dashboard/admin/company-profile",
      label: "Company",
      icon: Settings,
      modules: ["company_profile"],
    },
    {
      href: "/dashboard/admin/payment-instructions",
      label: "Payments",
      icon: CreditCard,
      modules: ["payment_instructions"],
    },
  ];

  // Rider nav items with permission requirements
  const riderNavItems: NavItem[] = [
    { href: "/dashboard/rider", label: "Dashboard", icon: LayoutDashboard },
    {
      href: "/dashboard/rider/jobs",
      label: "My Jobs",
      icon: Package,
      permissions: ["deliveries.view_assigned"],
    },
    {
      href: "/dashboard/rider/create-delivery",
      label: "Create Delivery",
      icon: Package,
      permissions: ["deliveries.create"],
    },
    {
      href: "/dashboard/rider/register-business",
      label: "Register Business",
      icon: Building2,
      permissions: ["businesses.create"],
    },
  ];

  // Filter nav items based on permissions
  const filterNavItems = (items: NavItem[]): NavItem[] => {
    return items.filter((item) => {
      // Always show items without permission requirements
      if (!item.permissions && !item.modules) return true;

      // Check module access
      if (item.modules) {
        for (const mod of item.modules) {
          if (hasModuleAccess(mod)) return true;
        }
      }

      // Check specific permissions
      if (item.permissions) {
        if (hasAnyPermission(item.permissions)) return true;
      }

      return false;
    });
  };

  const getNavItems = (): NavItem[] => {
    if (role === "BUSINESS") return businessNavItems;
    if (role === "ADMIN") return adminNavItems;
    if (role === "STAFF") return filterNavItems(staffNavItems);
    if (role === "RIDER") return filterNavItems(riderNavItems);
    return [];
  };

  const navItems = getNavItems();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              {/* Mobile menu button */}
              {navItems.length > 0 && (
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="lg:hidden mr-3 p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  aria-label="Toggle sidebar"
                >
                  {sidebarOpen ? (
                    <X className="w-6 h-6" />
                  ) : (
                    <Menu className="w-6 h-6" />
                  )}
                </button>
              )}
              <Link href={getDashboardBase()} className="flex items-center">
                <span className="text-2xl font-bold text-primary">
                  Kasi Courier
                </span>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 hidden sm:inline">
                {user?.user_metadata?.business_name || user?.email}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md hover:bg-gray-100"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex relative overflow-hidden">
        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar Navigation */}
        {navItems.length > 0 && (
          <aside
            className={`
              fixed lg:static
              top-16 left-0
              w-64 bg-white border-r border-gray-200
              min-h-[calc(100vh-4rem)] lg:min-h-[calc(100vh-4rem)]
              z-50 lg:z-auto
              transform transition-transform duration-300 ease-in-out
              ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
            `}
          >
            <nav className="p-4 space-y-2">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-md transition-colors ${
                      isActive
                        ? "bg-primary text-white"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 p-6 w-full lg:w-auto min-w-0 overflow-x-auto">
          {role === "BUSINESS" && <VerificationBanner />}
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PermissionsProvider>
      <DashboardContent>{children}</DashboardContent>
    </PermissionsProvider>
  );
}
