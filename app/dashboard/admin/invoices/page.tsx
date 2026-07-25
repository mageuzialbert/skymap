'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search, Filter, Eye, Edit, Trash2, FileText, Loader2 } from 'lucide-react';
import { getUserRole } from '@/lib/roles';
import { supabase } from '@/lib/supabase';
import { useT } from '@/lib/i18n';

interface Invoice {
  id: string;
  invoice_number: string;
  week_start: string;
  week_end: string;
  total_amount: number;
  status: string;
  invoice_type: string;
  generated_at: string;
  due_date: string | null;
  businesses?: {
    id: string;
    name: string;
  };
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  PROFORMA: 'bg-purple-100 text-purple-800',
  SENT: 'bg-blue-100 text-blue-800',
  PAID: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

export default function AdminInvoicesPage() {
  const router = useRouter();
  const t = useT();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [error, setError] = useState('');

  useEffect(() => {
    async function checkRole() {
      const userRole = await getUserRole();
      if (userRole !== 'ADMIN' && userRole !== 'STAFF') {
        router.push('/dashboard/business');
        return;
      }
      setRole(userRole);
      loadInvoices();
    }
    checkRole();
  }, [router]);

  useEffect(() => {
    loadInvoices();
  }, [statusFilter, typeFilter]);

  async function loadInvoices() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          businesses (
            id,
            name
          )
        `)
        .order('generated_at', { ascending: false });

      if (error) throw error;

      let filtered = data || [];

      // Apply filters
      if (statusFilter !== 'ALL') {
        filtered = filtered.filter((inv) => inv.status === statusFilter);
      }

      if (typeFilter !== 'ALL') {
        filtered = filtered.filter((inv) => inv.invoice_type === typeFilter);
      }

      // Apply search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(
          (inv) =>
            inv.invoice_number.toLowerCase().includes(query) ||
            inv.businesses?.name?.toLowerCase().includes(query)
        );
      }

      setInvoices(filtered);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.invoices.errLoad'));
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string, invoiceNumber: string) {
    if (!confirm(t('admin.invoices.confirmDelete', { number: invoiceNumber }))) return;

    try {
      const response = await fetch(`/api/admin/invoices/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t('admin.invoices.errDelete'));
      }

      loadInvoices();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.invoices.errDelete'));
    }
  }

  async function handleConvertToInvoice(id: string) {
    try {
      const response = await fetch(`/api/admin/invoices/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'DRAFT' }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t('admin.invoices.errConvert'));
      }

      loadInvoices();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.invoices.errConvert'));
    }
  }

  if (loading && !role) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('admin.invoices.title')}</h1>
          <p className="text-gray-600 mt-2">
            {t('admin.invoices.subtitle')}
          </p>
        </div>
        <Link
          href="/dashboard/admin/invoices/create"
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors"
        >
          <Plus className="w-5 h-5" />
          {t('admin.invoices.create')}
        </Link>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder={t('admin.invoices.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="ALL">{t('admin.invoices.allStatuses')}</option>
              <option value="DRAFT">{t('admin.invoices.statusDraft')}</option>
              <option value="PROFORMA">{t('admin.invoices.statusProforma')}</option>
              <option value="SENT">{t('admin.invoices.statusSent')}</option>
              <option value="PAID">{t('admin.invoices.statusPaid')}</option>
              <option value="CANCELLED">{t('admin.invoices.statusCancelled')}</option>
            </select>
          </div>
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="ALL">{t('admin.invoices.allTypes')}</option>
              <option value="INVOICE">{t('admin.invoices.typeInvoice')}</option>
              <option value="PROFORMA">{t('admin.invoices.typeProforma')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin.invoices.colNumber')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin.invoices.colBusiness')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin.invoices.colPeriod')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin.invoices.colAmount')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin.invoices.colType')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('common.status')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin.invoices.colGenerated')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                    {loading ? t('common.loading') : t('admin.invoices.empty')}
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      {invoice.invoice_number}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {invoice.businesses?.name || t('admin.common.unknown')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(invoice.week_start).toLocaleDateString()} -{' '}
                      {new Date(invoice.week_end).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      TZS {invoice.total_amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          invoice.invoice_type === 'PROFORMA'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {invoice.invoice_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          statusColors[invoice.status] || statusColors.DRAFT
                        }`}
                      >
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(invoice.generated_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/dashboard/admin/invoices/${invoice.id}/view`}
                          className="text-primary hover:text-primary-dark"
                          title={t('admin.invoices.viewInvoice')}
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        {invoice.status === 'PROFORMA' && (
                          <button
                            onClick={() => handleConvertToInvoice(invoice.id)}
                            className="text-green-600 hover:text-green-800"
                            title={t('admin.invoices.convertToInvoice')}
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        )}
                        {role === 'ADMIN' && invoice.status !== 'PAID' && (
                          <button
                            onClick={() => handleDelete(invoice.id, invoice.invoice_number)}
                            className="text-red-600 hover:text-red-800"
                            title={t('admin.invoices.deleteInvoice')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
