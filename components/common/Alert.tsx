'use client';

import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

export type AlertTone = 'error' | 'success' | 'warning' | 'info';

const TONES: Record<AlertTone, { box: string; icon: string; Icon: any }> = {
  error: { box: 'border-red-200 bg-red-50 text-red-700', icon: 'text-red-500', Icon: AlertCircle },
  success: {
    box: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    icon: 'text-emerald-500',
    Icon: CheckCircle2,
  },
  warning: {
    box: 'border-amber-200 bg-amber-50 text-amber-800',
    icon: 'text-amber-500',
    Icon: TriangleAlert,
  },
  info: { box: 'border-blue-200 bg-blue-50 text-blue-800', icon: 'text-blue-500', Icon: Info },
};

/**
 * An inline message about what just happened.
 *
 * Every form in the app had grown its own tinted box - green, red, yellow and
 * blue variants with different radii, paddings and text sizes, sometimes three
 * of them on one screen.
 */
export default function Alert({
  tone = 'info',
  children,
  className = '',
}: {
  tone?: AlertTone;
  children: ReactNode;
  className?: string;
}) {
  const { box, icon, Icon } = TONES[tone];
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-2.5 rounded-xl border p-3.5 text-[15px] leading-snug ${box} ${className}`}
    >
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${icon}`} />
      <span className="min-w-0 flex-1">{children}</span>
    </div>
  );
}
