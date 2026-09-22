'use client';

import type { ReactNode } from 'react';
import ServiceIcon from '@/components/common/ServiceIcon';
import { getServiceType, type ServiceTypeKey } from '@/lib/serviceTypes';

/**
 * The heading of a wizard step.
 *
 * Deliberately *not* a titled card: the redesigned screens never put a title
 * inside a card - they use a Sora heading with quiet grey labels above the
 * surfaces below it. So the step's question is the page heading, and the
 * service is carried by an accent chip beside it.
 */
export default function StepShell({
  service,
  title,
  subtitle,
  children,
}: {
  service: ServiceTypeKey;
  /** The question this step asks, e.g. "Where is it going?" */
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const { accent } = getServiceType(service);
  return (
    <div>
      <header className="mb-5 flex items-start gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accent.bg} ${accent.text}`}
        >
          <ServiceIcon serviceType={service} className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-[22px] font-bold leading-tight tracking-tight text-gray-900">
            {title}
          </h1>
          {subtitle && <p className="mt-1 text-[15px] leading-snug text-gray-500">{subtitle}</p>}
        </div>
      </header>
      <div className="space-y-5">{children}</div>
    </div>
  );
}
