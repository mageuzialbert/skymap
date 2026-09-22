'use client';

import Link from 'next/link';
import { ChevronRight, User } from 'lucide-react';
import { useT } from '@/lib/i18n';

/**
 * Who the request is coming from, read-only, taken from the business profile.
 * Replaces an inline grey box that was the only `rounded-lg bg-gray-50` outlier
 * among the wizard's surfaces.
 */
export default function ContactCard({ name, phone }: { name: string; phone: string }) {
  const t = useT();
  return (
    <Link
      href="/dashboard/business/profile"
      className="-m-1 flex min-h-[3.5rem] items-center gap-3 rounded-xl p-1 transition-colors active:bg-gray-50"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
        <User className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-gray-900">
          {name || '—'}
        </span>
        <span className="mt-0.5 block truncate text-[13px] text-gray-500">
          {phone || t('components.rideWizard.yourContact')}
        </span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-gray-300" />
    </Link>
  );
}
