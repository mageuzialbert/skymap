'use client';

import {
  LayoutDashboard,
  Package,
  PackagePlus,
  History,
  MessageCircle,
  MessageSquare,
  ReceiptText,
  CircleUser,
  BadgeCheck,
  Building2,
  User,
  BarChart3,
  Receipt,
  Bike,
  Truck,
  Image,
  FileText,
  FolderOpen,
  Settings,
  CreditCard,
} from "lucide-react";
import { usePermissions } from "@/lib/permissions-context";
import { useT } from "@/lib/i18n";

/** Which section of the Account screen a destination belongs to. Items with no
 *  group are the role's most-used destination and sit above the sections. */
export type NavGroup = "work" | "money" | "people" | "content" | "settings" | "account";

// Navigation item with its permission requirements.
export interface NavItem {
  href: string;
  label: string;
  icon: any;
  group?: NavGroup;
  permissions?: string[]; // Required permissions (any of these)
  modules?: string[]; // Required module access (any of these)
}

/** Section order on the Account screen, and the heading for each. */
export const NAV_GROUP_ORDER: NavGroup[] = [
  "work",
  "money",
  "people",
  "content",
  "settings",
  "account",
];

export const NAV_GROUP_LABEL_KEYS: Record<NavGroup, string> = {
  work: "account.groups.work",
  money: "account.groups.money",
  people: "account.groups.people",
  content: "account.groups.content",
  settings: "account.groups.settings",
  account: "account.groups.account",
};

// One chip colour per section, so the colour tells you which part of the app a
// row belongs to instead of cycling by list position. Literal strings so
// Tailwind's JIT can see them.
export const NAV_GROUP_TINTS: Record<NavGroup, string> = {
  work: "bg-sky-100 text-sky-700",
  money: "bg-amber-100 text-amber-700",
  people: "bg-indigo-100 text-indigo-700",
  content: "bg-violet-100 text-violet-700",
  settings: "bg-slate-200 text-slate-700",
  account: "bg-emerald-100 text-emerald-700",
};

/** Chip for the ungrouped, most-used row (Messages). */
export const NAV_PRIMARY_TINT = "bg-primary/10 text-primary";

/**
 * Every destination a role can reach, already filtered by its permissions.
 * Shared by the dashboard shell and the Account hub so the gating lives once.
 */
export function useNavItems(role: string | null): NavItem[] {
  const t = useT();
  const { hasModuleAccess, hasAnyPermission } = usePermissions();

const businessNavItems: NavItem[] = [
  {
    href: "/dashboard/business/request-ride",
    label: t("nav.orderDelivery"),
    icon: PackagePlus,
    group: "work",
  },
  {
    href: "/dashboard/business/rides",
    label: t("nav.ridesHistory"),
    icon: History,
    group: "work",
  },
  {
    href: "/dashboard/business/driver-requests",
    label: t("nav.driverRequests"),
    icon: User,
    group: "work",
  },
  { href: "/dashboard/messages", label: t("nav.messages"), icon: MessageCircle },
  {
    href: "/dashboard/business/invoices",
    label: t("nav.invoices"),
    icon: ReceiptText,
    group: "money",
  },
  {
    href: "/dashboard/business/profile",
    label: t("nav.profile"),
    icon: CircleUser,
    group: "account",
  },
  {
    href: "/dashboard/business/verify",
    label: t("nav.verify"),
    icon: BadgeCheck,
    group: "account",
  },
];

// Admin has access to all items - no permission filtering needed
const adminNavItems: NavItem[] = [
  { href: "/dashboard/admin", label: t("nav.home"), icon: LayoutDashboard, group: "work" },
  {
    href: "/dashboard/admin/businesses",
    label: t("nav.clients"),
    icon: Building2,
    group: "people",
  },
  { href: "/dashboard/admin/users", label: t("nav.users"), icon: User, group: "people" },
  {
    href: "/dashboard/staff/deliveries",
    label: t("nav.deliveries"),
    icon: Package,
    group: "work",
  },
  { href: "/dashboard/messages", label: t("nav.messages"), icon: MessageSquare },
  {
    href: "/dashboard/staff/operations",
    label: t("nav.operations"),
    icon: BarChart3,
    group: "work",
  },
  {
    href: "/dashboard/staff/financial",
    label: t("nav.financial"),
    icon: Receipt,
    group: "money",
  },
  { href: "/dashboard/admin/vehicles", label: t("nav.vehicles"), icon: Bike, group: "work" },
  {
    href: "/dashboard/admin/hire-vehicles",
    label: t("nav.hireVehicles"),
    icon: Truck,
    group: "work",
  },
  {
    href: "/dashboard/admin/driver-requests",
    label: t("nav.driverHireRequests"),
    icon: User,
    group: "work",
  },
  {
    href: "/dashboard/admin/cms/sliders",
    label: t("nav.cmsSliders"),
    icon: Image,
    group: "content",
  },
  {
    href: "/dashboard/admin/cms/content",
    label: t("nav.cmsContent"),
    icon: FileText,
    group: "content",
  },
  {
    href: "/dashboard/admin/sms/templates",
    label: t("nav.sms"),
    icon: MessageSquare,
    group: "content",
  },
  {
    href: "/dashboard/admin/invoices",
    label: t("nav.invoices"),
    icon: ReceiptText,
    group: "money",
  },
  {
    href: "/dashboard/admin/expenses",
    label: t("nav.expenses"),
    icon: BarChart3,
    group: "money",
  },
  {
    href: "/dashboard/admin/expense-categories",
    label: t("nav.expenseCategories"),
    icon: FolderOpen,
    group: "money",
  },
  {
    href: "/dashboard/admin/payment-instructions",
    label: t("nav.payments"),
    icon: CreditCard,
    group: "money",
  },
  {
    href: "/dashboard/admin/delivery-packages",
    label: t("nav.packages"),
    icon: FolderOpen,
    group: "work",
  },
  {
    href: "/dashboard/admin/sms/send",
    label: t("nav.smsSend"),
    icon: MessageSquare,
    group: "content",
  },
  {
    href: "/dashboard/admin/company-profile",
    label: t("nav.company"),
    icon: Settings,
    group: "settings",
  },
];

// Staff nav items with permission requirements
const staffNavItems: NavItem[] = [
  { href: "/dashboard/staff", label: t("nav.home"), icon: LayoutDashboard, group: "work" },
  {
    href: "/dashboard/staff/deliveries",
    label: t("nav.deliveries"),
    icon: Package,
    group: "work",
    modules: ["deliveries"],
  },
  { href: "/dashboard/messages", label: t("nav.messages"), icon: MessageSquare },
  {
    href: "/dashboard/admin/businesses",
    label: t("nav.clients"),
    icon: Building2,
    group: "people",
    modules: ["businesses"],
  },
  {
    href: "/dashboard/admin/users",
    label: t("nav.users"),
    icon: User,
    group: "people",
    modules: ["users"],
  },
  {
    href: "/dashboard/staff/operations",
    label: t("nav.operations"),
    icon: BarChart3,
    group: "work",
    modules: ["operations"],
  },
  {
    href: "/dashboard/staff/financial",
    label: t("nav.financial"),
    icon: Receipt,
    group: "money",
    modules: ["financial"],
  },
  {
    href: "/dashboard/admin/invoices",
    label: t("nav.invoices"),
    icon: FileText,
    group: "money",
    modules: ["invoices"],
  },
  {
    href: "/dashboard/admin/expenses",
    label: t("nav.expenses"),
    icon: BarChart3,
    group: "money",
    modules: ["expenses"],
  },
  {
    href: "/dashboard/admin/delivery-packages",
    label: t("nav.packages"),
    icon: FolderOpen,
    group: "work",
    modules: ["delivery_packages"],
  },
  {
    href: "/dashboard/admin/vehicles",
    label: t("nav.vehicles"),
    icon: Bike,
    group: "work",
    modules: ["vehicles"],
  },
  {
    href: "/dashboard/admin/cms/sliders",
    label: t("nav.cmsSliders"),
    icon: Image,
    group: "content",
    modules: ["cms_sliders"],
  },
  {
    href: "/dashboard/admin/cms/content",
    label: t("nav.cmsContent"),
    icon: FileText,
    group: "content",
    modules: ["cms_content"],
  },
  {
    href: "/dashboard/admin/company-profile",
    label: t("nav.company"),
    icon: Settings,
    group: "settings",
    modules: ["company_profile"],
  },
  {
    href: "/dashboard/admin/payment-instructions",
    label: t("nav.payments"),
    icon: CreditCard,
    group: "money",
    modules: ["payment_instructions"],
  },
];

// Rider nav items with permission requirements
const riderNavItems: NavItem[] = [
  { href: "/dashboard/rider", label: t("nav.home"), icon: LayoutDashboard, group: "work" },
  {
    href: "/dashboard/rider/jobs",
    label: t("nav.myJobs"),
    icon: Package,
    group: "work",
    permissions: ["deliveries.view_assigned"],
  },
  { href: "/dashboard/messages", label: t("nav.messages"), icon: MessageSquare },
  { href: "/dashboard/rider/profile", label: t("nav.profile"), icon: User, group: "account" },
  {
    href: "/dashboard/rider/create-delivery",
    label: t("nav.createDelivery"),
    icon: Package,
    group: "work",
    permissions: ["deliveries.create"],
  },
  {
    href: "/dashboard/rider/register-business",
    label: t("nav.registerBusiness"),
    icon: Building2,
    group: "people",
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

  return getNavItems();
}
