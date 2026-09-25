'use client';

import { DollarSign, TrendingUp, FileText, AlertCircle, TrendingDown, Calculator } from 'lucide-react';
import { RecordList, RecordRow } from '@/components/common/RecordList';
import StatStrip from '@/components/common/StatStrip';
import { useT } from '@/lib/i18n';
import { cardClass } from '@/lib/ui';

interface FinancialData {
  revenue: {
    total: number;
    thisWeek: number;
    thisMonth: number;
    filtered?: number;
  };
  expenses: {
    total: number;
    breakdown: Array<{
      categoryName: string;
      amount: number;
    }>;
    trends: Array<{
      date: string;
      amount: number;
    }>;
  };
  profit: {
    total: number;
    margin: number;
  };
  invoices: {
    total: number;
    pending: number;
    paid: number;
    draft: number;
    totalAmount: number;
    pendingAmount: number;
  };
  chargesBreakdown: Array<{
    id: string;
    amount: number;
    description: string | null;
    created_at: string;
    businesses?: {
      id: string;
      name: string;
    };
  }>;
  topBusinesses: Array<{
    businessId: string;
    businessName: string;
    revenue: number;
  }>;
  revenueTrends: Array<{
    date: string;
    revenue: number;
  }>;
  dateRange?: {
    start: string | null;
    end: string | null;
  };
}

interface FinancialDashboardProps {
  data: FinancialData;
}

/** Digits only. The currency unit goes in the tile's label instead: inside a
 *  two-up grid the symbol pushed the number onto a second line and it broke
 *  mid-digit ("TSh 2,502,00" / "0"). */
function formatAmount(amount: number): string {
  return new Intl.NumberFormat('en-TZ', { maximumFractionDigits: 0 }).format(amount);
}

/** The unit as this locale renders it, e.g. "TSh" - derived, not hardcoded. */
const CURRENCY_UNIT =
  new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS', minimumFractionDigits: 0 })
    .formatToParts(0)
    .find((p) => p.type === 'currency')?.value ?? 'TZS';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency: 'TZS',
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export default function FinancialDashboard({ data }: FinancialDashboardProps) {
  const t = useT();
  const displayRevenue = data.revenue.filtered !== undefined ? data.revenue.filtered : data.revenue.total;
  const profitMargin = data.profit.margin;
  const isProfitPositive = data.profit.total >= 0;

  return (
    <div className="space-y-6">
      {/* Summary. Was four `grid-cols-1 md:grid-cols-4` cards, so inside the
          768px measure each one took a full-width row - four screens of
          scrolling on a phone before any content. "This month revenue" is
          dropped: the filtered total beside it answers the same question.
          Currency runs far longer than a count, so these tiles use the smaller
          value size and carry the unit in the label - with the symbol inline
          the number wrapped and broke mid-digit. */}
      <StatStrip
        size="sm"
        stats={[
          {
            label: `${
              data.revenue.filtered !== undefined
                ? t('components.financial.revenueSelected')
                : t('components.financial.totalRevenue')
            } (${CURRENCY_UNIT})`,
            value: formatAmount(displayRevenue),
          },
          {
            label: `${t('components.financial.totalExpenses')} (${CURRENCY_UNIT})`,
            value: formatAmount(data.expenses.total),
          },
          {
            label: `${t('components.financial.profit')} (${CURRENCY_UNIT})`,
            value: formatAmount(data.profit.total),
            tone: isProfitPositive ? 'text-green-600' : 'text-red-600',
          },
          {
            label: t('components.financial.marginLabel'),
            value: `${profitMargin.toFixed(1)}%`,
            tone: isProfitPositive ? 'text-green-600' : 'text-red-600',
          },
        ]}
      />

      {/* Date Range Display */}
      {data.dateRange && (data.dateRange.start || data.dateRange.end) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <span className="font-semibold">{t('components.financial.dateRange')}:</span>{' '}
            {data.dateRange.start ? formatDate(data.dateRange.start) : t('components.financial.allTime')} -{' '}
            {data.dateRange.end ? formatDate(data.dateRange.end) : t('components.financial.today')}
          </p>
        </div>
      )}

      {/* Invoices. The four counts and the two money lines were three separate
          idioms - a grid, then two `flex justify-between` rows with no
          `min-w-0`, where a long TZS figure could collide with its label.
          They are one grid of tiles now. */}
      <StatStrip
        label={t('components.financial.invoicesOverview')}
        stats={[
          { label: t('components.financial.total'), value: data.invoices.total },
          { label: t('components.financial.pending'), value: data.invoices.pending, tone: 'text-yellow-600' },
          { label: t('components.financial.paid'), value: data.invoices.paid, tone: 'text-green-600' },
          { label: t('components.financial.draft'), value: data.invoices.draft, tone: 'text-gray-600' },
        ]}
      />
      <StatStrip
        size="sm"
        stats={[
          {
            label: `${t('components.financial.totalInvoiceAmount')} (${CURRENCY_UNIT})`,
            value: formatAmount(data.invoices.totalAmount),
          },
          {
            label: `${t('components.financial.pendingAmount')} (${CURRENCY_UNIT})`,
            value: formatAmount(data.invoices.pendingAmount),
            tone: 'text-yellow-600',
          },
        ]}
      />

      {/* Top Businesses */}
      <div className={`${cardClass} p-6`}>
        <h3 className="text-lg font-semibold mb-4">{t('components.financial.topBusinesses')}</h3>
        {data.topBusinesses.length === 0 ? (
          <p className="text-gray-500 text-center py-4">{t('components.financial.noBusinessRevenue')}</p>
        ) : (
          <RecordList>
            {data.topBusinesses.map((business, index) => (
              <RecordRow
                key={business.businessId}
                leading={
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-[13px] font-bold text-gray-600">
                    {index + 1}
                  </span>
                }
                title={business.businessName}
                trailing={formatCurrency(business.revenue)}
              />
            ))}
          </RecordList>
        )}
      </div>

      {/* Recent Charges */}
      <div className={`${cardClass} p-6`}>
        <h3 className="text-lg font-semibold mb-4">{t('components.financial.recentCharges')}</h3>
        {data.chargesBreakdown.length === 0 ? (
          <p className="text-gray-500 text-center py-4">{t('components.financial.noRecentCharges')}</p>
        ) : (
          <RecordList>
            {data.chargesBreakdown.slice(0, 20).map((charge) => (
              <RecordRow
                key={charge.id}
                title={charge.businesses?.name || t('components.deliveries.unknown')}
                trailing={formatCurrency(charge.amount)}
                subtitle={charge.description || '—'}
                meta={formatDate(charge.created_at)}
              />
            ))}
          </RecordList>
        )}
      </div>

      {/* Expense Breakdown by Category */}
      {data.expenses.breakdown.length > 0 && (
        <div className={`${cardClass} p-6`}>
          <h3 className="text-lg font-semibold mb-4">{t('components.financial.expensesByCategory')}</h3>
            <RecordList>
              {data.expenses.breakdown.map((item, index) => {
                const percentage =
                  data.expenses.total > 0 ? (item.amount / data.expenses.total) * 100 : 0;
                return (
                  <RecordRow
                    key={index}
                    title={item.categoryName}
                    trailing={formatCurrency(item.amount)}
                    subtitle={
                      <span className="flex items-center gap-2">
                        <span className="h-1.5 w-20 rounded-full bg-gray-200">
                          <span
                            className="block h-1.5 rounded-full bg-red-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </span>
                        {percentage.toFixed(1)}%
                      </span>
                    }
                  />
                );
              })}
            </RecordList>
        </div>
      )}

      {/* Revenue vs Expenses Comparison */}
      <div className={`${cardClass} p-6`}>
        <h3 className="text-lg font-semibold mb-4">{t('components.financial.revenueVsExpenses')}</h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">{t('components.financial.revenue')}</span>
              <span className="font-medium text-gray-900">{formatCurrency(displayRevenue)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-primary h-3 rounded-full"
                style={{
                  width: `${Math.min(100, (displayRevenue / Math.max(displayRevenue, data.expenses.total)) * 100)}%`,
                }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">{t('components.financial.expenses')}</span>
              <span className="font-medium text-gray-900">{formatCurrency(data.expenses.total)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-red-500 h-3 rounded-full"
                style={{
                  width: `${Math.min(100, (data.expenses.total / Math.max(displayRevenue, data.expenses.total)) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Trends */}
      {data.revenueTrends.length > 0 && (
        <div className={`${cardClass} p-6`}>
          <h3 className="text-lg font-semibold mb-4">{t('components.financial.revenueTrends')}</h3>
          <div className="space-y-2">
            {data.revenueTrends.map((trend) => (
              <div key={trend.date} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{formatDate(trend.date)}</span>
                <div className="flex items-center gap-4">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{
                        width: `${
                          (trend.revenue / Math.max(...data.revenueTrends.map((t) => t.revenue))) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-24 text-right">
                    {formatCurrency(trend.revenue)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
