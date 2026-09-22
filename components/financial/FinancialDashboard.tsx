'use client';

import { DollarSign, TrendingUp, FileText, AlertCircle, TrendingDown, Calculator } from 'lucide-react';
import { RecordList, RecordRow } from '@/components/common/RecordList';
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
      {/* Revenue, Expenses, and Profit Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={`${cardClass} p-6`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                {data.revenue.filtered !== undefined ? t('components.financial.revenueSelected') : t('components.financial.totalRevenue')}
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(displayRevenue)}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-primary" />
          </div>
        </div>

        <div className={`${cardClass} p-6`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t('components.financial.totalExpenses')}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(data.expenses.total)}
              </p>
            </div>
            <TrendingDown className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <div className={`${cardClass} p-6`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t('components.financial.profit')}</p>
              <p className={`text-2xl font-bold mt-1 ${isProfitPositive ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(data.profit.total)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {t('components.financial.margin', { value: profitMargin.toFixed(1) })}
              </p>
            </div>
            <Calculator className={`w-8 h-8 ${isProfitPositive ? 'text-green-500' : 'text-red-500'}`} />
          </div>
        </div>

        <div className={`${cardClass} p-6`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t('components.financial.thisMonthRevenue')}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(data.revenue.thisMonth)}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-500" />
          </div>
        </div>
      </div>

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

      {/* Invoices Overview */}
      <div className={`${cardClass} p-6`}>
        <h3 className="text-lg font-semibold mb-4">{t('components.financial.invoicesOverview')}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">{t('components.financial.total')}</p>
            <p className="text-xl font-bold text-gray-900">{data.invoices.total}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">{t('components.financial.pending')}</p>
            <p className="text-xl font-bold text-yellow-600">{data.invoices.pending}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">{t('components.financial.paid')}</p>
            <p className="text-xl font-bold text-green-600">{data.invoices.paid}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">{t('components.financial.draft')}</p>
            <p className="text-xl font-bold text-gray-600">{data.invoices.draft}</p>
          </div>
        </div>
        <div className="border-t pt-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">{t('components.financial.totalInvoiceAmount')}</span>
            <span className="text-lg font-semibold text-gray-900">
              {formatCurrency(data.invoices.totalAmount)}
            </span>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-sm text-gray-600">{t('components.financial.pendingAmount')}</span>
            <span className="text-lg font-semibold text-yellow-600">
              {formatCurrency(data.invoices.pendingAmount)}
            </span>
          </div>
        </div>
      </div>

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
