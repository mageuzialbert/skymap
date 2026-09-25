"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import NextImage from "next/image";
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
  Home,
  Building2,
  Settings,
  CreditCard,
  FolderOpen,
  MessageSquare,
  Bike,
  Truck,
  PackagePlus,
  History,
  MessageCircle,
  ReceiptText,
  CircleUser,
  BadgeCheck,
} from "lucide-react";
import { getCurrentUser, logout } from "@/lib/auth";
import { getUserRole } from "@/lib/roles";
import { PermissionsProvider, usePermissions } from "@/lib/permissions-context";
import { useT } from "@/lib/i18n";
import { useNavItems } from "@/lib/navItems";
import LanguageSwitcher from "@/components/common/LanguageSwitcher";
import { dashboardPathForRole } from '@/lib/dashboardRoutes';


function DashboardContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useT();
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const {
    hasPermission,
    hasModuleAccess,
    hasAnyPermission,
    loading: permissionsLoading,
  } = usePermissions();

  // Hooks must run on every render, so this sits above the loading early-return
  // below. It returns [] until the role resolves.
  const navItems = useNavItems(role);

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
          <p className="mt-4 text-gray-600">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  // Get base dashboard path based on role


  // The whole of navigation, in three destinations. Activity is each role's
  // "what's happening" list; everything else is reached through Account.
  const activityHref =
    role === "BUSINESS"
      ? "/dashboard/business/rides"
      : role === "RIDER"
        ? "/dashboard/rider/jobs"
        : "/dashboard/staff/deliveries";
  const homeHref = dashboardPathForRole(role);

  // Prefix matching, not equality: a detail route like /rides/[id] has to keep
  // its tab lit, and anything not under Home or Activity belongs to Account.
  const onHome = pathname === homeHref;
  const onActivity = pathname.startsWith(activityHref);
  const tabs = [
    { key: "home", href: homeHref, label: t("nav.home"), icon: Home, active: onHome },
    {
      key: "activity",
      href: activityHref,
      label: t("nav.activity"),
      icon: History,
      active: onActivity,
    },
    {
      key: "account",
      href: "/dashboard/account",
      label: t("nav.account"),
      icon: CircleUser,
      active: !onHome && !onActivity,
    },
  ];

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden bg-gray-50">
      {/* Top bar - desktop only. It carries the three tabs there; on a phone
          the tab bar does that job, and Account already holds the language
          switcher and logout, so the bar was pure chrome. */}
      <nav className="hidden lg:block shrink-0 bg-white border-b border-gray-200 pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              {/* No hamburger on mobile: the bottom bar's "More" tab opens the same
                  drawer, and when a role has four or fewer destinations they all fit
                  in the bar, so there is nothing left for a drawer to show. */}
              <Link href={dashboardPathForRole(role)} className="flex items-center">
                <NextImage
                  src="/logo-cropped.webp"
                  alt="The Skymap"
                  width={686}
                  height={339}
                  priority
                  className="h-8 w-auto object-contain sm:h-9"
                />
              </Link>
            </div>
            {/* Desktop: the same three tabs, in the header. A bottom bar
                stretched across a wide display reads as a phone UI. */}
            <div className="hidden lg:flex items-stretch gap-1">
              {tabs.map((tab) => (
                <Link
                  key={tab.key}
                  href={tab.href}
                  aria-current={tab.active ? "page" : undefined}
                  className={`inline-flex items-center gap-2 border-b-2 px-4 text-sm transition-colors ${
                    tab.active
                      ? "border-gray-900 font-semibold text-gray-900"
                      : "border-transparent font-medium text-gray-500 hover:text-gray-900"
                  }`}
                >
                  <tab.icon className="h-4 w-4" strokeWidth={tab.active ? 2.5 : 2} />
                  {tab.label}
                </Link>
              ))}
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 hidden sm:inline">
                {user?.user_metadata?.business_name || user?.email}
              </span>
              <LanguageSwitcher variant="dark" />
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-full hover:bg-gray-100"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">{t("common.logout")}</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content - the only scrollable region. With no side column it
          gets a centred measure so text does not run the full width of a
          desktop display. */}
      <main className="flex-1 w-full min-w-0 overflow-auto overscroll-contain pt-[env(safe-area-inset-top)] lg:pt-0">
        <div className="mx-auto w-full max-w-3xl p-4 sm:p-6">{children}</div>
      </main>

      {/* Bottom tab bar - three destinations, every screen size. There is no
          sidebar: everything else lives behind the Account tab. */}
      {role && (
        <nav className="lg:hidden shrink-0 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
          <div className="mx-auto flex max-w-3xl items-stretch">
            {tabs.map((tab) => (
              <Link
                key={tab.key}
                href={tab.href}
                aria-current={tab.active ? "page" : undefined}
                className={`flex min-h-[3.5rem] flex-1 flex-col items-center justify-center gap-1 px-1 py-2 transition-colors ${
                  tab.active ? "text-gray-900" : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <tab.icon className="h-5 w-5 shrink-0" strokeWidth={tab.active ? 2.5 : 2} />
                <span
                  className={`w-full truncate text-center text-[11px] leading-none ${
                    tab.active ? "font-semibold" : "font-medium"
                  }`}
                >
                  {tab.label}
                </span>
              </Link>
            ))}
          </div>
        </nav>
      )}
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
