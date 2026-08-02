'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { getUserRole } from '@/lib/roles';
import FinancialDashboard from '@/components/financial/FinancialDashboard';
import { useT } from '@/lib/i18n';

export default function StaffFinancialPage() {
  const t = useT();
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [dateRange, setDateRange] = useState({
    start: '',
    end: '',
  });

  useEffect(() => {
    async function checkRole() {
      const userRole = await getUserRole();
      if (userRole !== 'STAFF' && userRole !== 'ADMIN') {
        router.push('/dashboard/business');
        return;
      }
      setRole(userRole);
      loadFinancialData();
    }
    checkRole();
  }, [router]);

  useEffect(() => {
    if (role) {
      loadFinancialData();
    }
  }, [dateRange, role]);

  async function loadFinancialData() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (dateRange.start) params.set('start_date', dateRange.start);
      if (dateRange.end) params.set('end_date', dateRange.end);

      const response = await fetch(`/api/staff/financial?${params.toString()}`);
      if (response.ok) {
        const financialData = await response.json();
        setData(financialData);
      }
    } catch (error) {
      console.error('Error loading financial data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-8 text-gray-500">
        {t('staff.financial.loadFailed')}
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{t('staff.financial.title')}</h1>
      </div>

      {/* Date Range Selector */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <label className="text-sm font-medium text-gray-700">{t('staff.financial.dateRange')}</label>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          <span className="text-gray-500">{t('staff.financial.to')}</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          {(dateRange.start || dateRange.end) && (
            <button
              onClick={() => setDateRange({ start: '', end: '' })}
              className="text-sm text-gray-600 hover:text-gray-800 px-3 py-2 border border-gray-300 rounded-xl hover:bg-gray-50"
            >
              {t('staff.financial.clear')}
            </button>
          )}
        </div>
      </div>

      <FinancialDashboard data={data} />
    </div>
  );
}
