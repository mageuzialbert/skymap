'use client';

import { Package, UserRound, Clock, ShoppingBag } from 'lucide-react';
import { getServiceType } from '@/lib/serviceTypes';

const ICONS: Record<string, any> = { Package, UserRound, Clock, ShoppingBag };

/**
 * Small pill showing a request's service type (delivery / ride / hire / errand).
 * Used across admin, rider and client views for a consistent look.
 */
export default function ServiceBadge({
  serviceType,
  className = '',
}: {
  serviceType: string | null | undefined;
  className?: string;
}) {
  const def = getServiceType(serviceType);
  const Icon = ICONS[def.icon] || Package;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${def.badgeClass} ${className}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {def.label}
    </span>
  );
}

/** Format a scheduled pickup time, or "ASAP" when none was set. */
export function formatSchedule(scheduledAt: string | null | undefined): string {
  if (!scheduledAt) return 'As soon as possible';
  const d = new Date(scheduledAt);
  if (isNaN(d.getTime())) return 'As soon as possible';
  return d.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
