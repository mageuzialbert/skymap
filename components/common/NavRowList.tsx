'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import {
  NAV_GROUP_LABEL_KEYS,
  NAV_GROUP_ORDER,
  NAV_GROUP_TINTS,
  NAV_PRIMARY_TINT,
  type NavGroup,
  type NavItem,
} from '@/lib/navItems';
import { useT } from '@/lib/i18n';
import { cardClass, sectionLabel } from '@/lib/ui';

/** One destination. The chip colour marks which part of the app it belongs to. */
export function NavRow({ item, tint }: { item: NavItem; tint: string }) {
  return (
    <Link
      href={item.href}
      className="flex min-h-[3.5rem] items-center gap-3 px-4 transition-colors hover:bg-gray-50 active:bg-gray-100"
    >
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tint}`}>
        <item.icon className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-gray-900">
        {item.label}
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-gray-300" />
    </Link>
  );
}

/** Hairline between rows, inset to start under the label like a native list. */
export function NavRowDivider() {
  return <span className="ml-[3.25rem] block h-px bg-gray-100" />;
}

/** One card of rows, optionally titled. */
export function NavRowCard({ items, tint, label }: { items: NavItem[]; tint: string; label?: string }) {
  if (items.length === 0) return null;
  return (
    <section>
      {label && <h2 className={sectionLabel}>{label}</h2>}
      <div className={`${cardClass} overflow-hidden`}>
        <ul>
          {items.map((item, i) => (
            <li key={item.href}>
              <NavRow item={item} tint={tint} />
              {i < items.length - 1 && <NavRowDivider />}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/**
 * A role's destinations, grouped and tinted.
 *
 * Shared by the Account hub and the admin home so there is one menu rather
 * than two hand-maintained copies - the admin tile grid this replaces had
 * already drifted, and was the only route to seven screens.
 */
export default function NavRowList({
  items,
  only,
  exclude,
}: {
  items: NavItem[];
  /** Render just these groups, in this order. Ungrouped items are dropped. */
  only?: NavGroup[];
  /** Hrefs to leave out, e.g. destinations that already have their own tab. */
  exclude?: Set<string>;
}) {
  const t = useT();
  const visible = exclude ? items.filter((i) => !exclude.has(i.href)) : items;
  const groups = only || NAV_GROUP_ORDER;

  return (
    <div className="space-y-6">
      {!only && (
        <NavRowCard items={visible.filter((i) => !i.group)} tint={NAV_PRIMARY_TINT} />
      )}
      {groups.map((g) => (
        <NavRowCard
          key={g}
          items={visible.filter((i) => i.group === g)}
          tint={NAV_GROUP_TINTS[g]}
          label={t(NAV_GROUP_LABEL_KEYS[g])}
        />
      ))}
    </div>
  );
}
