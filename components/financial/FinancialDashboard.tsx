'use client';

import { DollarSign, TrendingUp, FileText, AlertCircle, TrendingDown, Calculator } from 'lucide-react';

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
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export default function FinancialDashboard({ data }: FinancialDashboardProps) {
  const displayRevenue = data.revenue.filtered !== undefined ? data.revenue.filtered : data.revenue.total;
  const profitMargin = data.profit.margin;
  const isProfitPositive = data.profit.total >= 0;

  return (
    <div className="space-y-6">
      {/* Revenue, Expenses, and Profit Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                {data.revenue.filtered !== undefined ? 'Revenue (Selected Period)' : 'Total Revenue'}
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(displayRevenue)}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-primary" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Expenses</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(data.expenses.total)}
              </p>
            </div>
            <TrendingDown className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Profit</p>
              <p className={`text-2xl font-bold mt-1 ${isProfitPositive ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(data.profit.total)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Margin: {profitMargin.toFixed(1)}%
              </p>
            </div>
            <Calculator className={`w-8 h-8 ${isProfitPositive ? 'text-green-500' : 'text-red-500'}`} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">This Month Revenue</p>
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
            <span className="font-semibold">Date Range:</span>{' '}
            {data.dateRange.start ? formatDate(data.dateRange.start) : 'All time'} -{' '}
            {data.dateRange.end ? formatDate(data.dateRange.end) : 'Today'}
          </p>
        </div>
      )}

      {/* Invoices Overview */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Invoices Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">Total</p>
            <p className="text-xl font-bold text-gray-900">{data.invoices.total}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Pending</p>
            <p className="text-xl font-bold text-yellow-600">{data.invoices.pending}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Paid</p>
            <p className="text-xl font-bold text-green-600">{data.invoices.paid}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Draft</p>
            <p className="text-xl font-bold text-gray-600">{data.invoices.draft}</p>
          </div>
        </div>
        <div className="border-t pt-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Total Invoice Amount</span>
            <span className="text-lg font-semibold text-gray-900">
              {formatCurrency(data.invoices.totalAmount)}
            </span>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-sm text-gray-600">Pending Amount</span>
            <span className="text-lg font-semibold text-yellow-600">
              {formatCurrency(data.invoices.pendingAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* Top Businesses */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Top Businesses by Revenue</h3>
        {data.topBusinesses.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No business revenue data</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Rank
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Business
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.topBusinesses.map((business, index) => (
                  <tr key={business.businessId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">#{index + 1}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {business.businessName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {formatCurrency(business.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Charges */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Charges (Last 30 Days)</h3>
        {data.chargesBreakdown.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No recent charges</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Business
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.chargesBreakdown.slice(0, 20).map((charge) => (
                  <tr key={charge.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatDate(charge.created_at)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {charge.businesses?.name || 'Unknown'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {charge.description || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {formatCurrency(charge.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Expense Breakdown by Category */}
      {data.expenses.breakdown.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Expenses by Category</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Percentage
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.expenses.breakdown.map((item, index) => {
                  const percentage = data.expenses.total > 0 
                    ? (item.amount / data.expenses.total) * 100 
                    : 0;
                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {item.categoryName}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatCurrency(item.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-red-500 h-2 rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600 w-12">
                            {percentage.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Revenue vs Expenses Comparison */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Revenue vs Expenses</h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Revenue</span>
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
              <span className="text-gray-600">Expenses</span>
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
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Revenue Trends (Last 7 Days)</h3>
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
