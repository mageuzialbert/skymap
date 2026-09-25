'use client';

import StatStrip from '@/components/common/StatStrip';
import { useT } from '@/lib/i18n';
import { BUCKET_DOT, BUCKET_TEXT, statusBucket, statusLabelKey } from '@/lib/deliveryStatus';
import { cardClass } from '@/lib/ui';

interface OperationsData {
  metrics: {
    totalDeliveries: number;
    activeDeliveries: number;
    todayDeliveries: number;
    completedToday: number;
    avgDeliveryTimeHours: number;
  };
  statusCounts: Record<string, number>;
}

interface OperationsDashboardProps {
  data: OperationsData;
}


export default function OperationsDashboard({ data }: OperationsDashboardProps) {
  const t = useT();
  return (
    <div className="space-y-6">
      {/* Key metrics. Total and Active are one tap away on the staff hub, so
          only the two numbers that appear nowhere else are kept here. */}
      <StatStrip
        stats={[
          {
            label: t('components.operations.completedToday'),
            value: data.metrics.completedToday,
          },
          {
            label: t('components.operations.avgDeliveryTime'),
            value: `${data.metrics.avgDeliveryTimeHours.toFixed(1)}h`,
          },
        ]}
      />

      {/* Status Distribution */}
      <div className={`${cardClass} p-6`}>
        <h3 className="text-lg font-semibold mb-4">{t('components.operations.byStatus')}</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {Object.entries(data.statusCounts).map(([status, count]) => (
            <div key={status} className="text-center">
              <span
                className={`mb-2 inline-flex items-center gap-1.5 text-[13px] font-medium ${
                  BUCKET_TEXT[statusBucket(status)]
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${BUCKET_DOT[statusBucket(status)]}`} />
                {t(statusLabelKey(status))}
              </span>
              <p className="text-2xl font-bold text-gray-900">{count}</p>
            </div>
          ))}
        </div>
      </div>

      {/* The "Recent deliveries" table lived here. It was the last <table> on
          any dashboard - a sideways-scrolling strip on a phone - and it showed
          the same four fields as /dashboard/staff/deliveries, which renders
          them as card rows and can filter, paginate and act on them. */}
    </div>
  );
}
