'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search, Filter, Eye, Edit, Trash2, FileText, Loader2 } from 'lucide-react';
import { getUserRole } from '@/lib/roles';
import { supabase } from '@/lib/supabase';
import Alert from '@/components/common/Alert';
import { EmptyState, ListToolbar, RecordList, RecordRow } from '@/components/common/RecordList';
import { useT } from '@/lib/i18n';
import {
  INVOICE_DOT,
  INVOICE_TEXT,
  invoiceStatusLabelKey,
  invoiceTone,
} from '@/lib/invoiceStatus';
import { cardClass, inputClass, pageTitle, pillPrimary } from '@/lib/ui';

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
          <h1 className={pageTitle}>{t("admin.invoices.title")}</h1>
          <p className="text-gray-600 mt-2">
            {t('admin.invoices.subtitle')}
          </p>
        </div>
        <Link href="/dashboard/admin/invoices/create" className={pillPrimary}>
          <Plus className="h-5 w-5" />
          <span className="hidden sm:inline">{t('admin.invoices.create')}</span>
        </Link>
      </div>

      {error && (
        <Alert tone="error" className="mb-4">
          {error}
        </Alert>
      )}

      <div className={`${cardClass} mb-4 p-3`}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={t('admin.invoices.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`${inputClass} pl-11`}
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className={inputClass}
          >
            <option value="ALL">{t('admin.invoices.allTypes')}</option>
            <option value="INVOICE">{t('admin.invoices.typeInvoice')}</option>
            <option value="PROFORMA">{t('admin.invoices.typeProforma')}</option>
          </select>
        </div>
      </div>

      <ListToolbar
        chips={[
          { key: 'ALL', label: t('admin.invoices.allStatuses') },
          { key: 'DRAFT', label: t('business.invoices.status.draft') },
          { key: 'PROFORMA', label: t('business.invoices.status.proforma') },
          { key: 'SENT', label: t('business.invoices.status.sent') },
          { key: 'PAID', label: t('business.invoices.status.paid') },
          { key: 'CANCELLED', label: t('business.invoices.status.cancelled') },
        ]}
        active={statusFilter}
        onChange={setStatusFilter}
      />

      {invoices.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={loading ? t('common.loading') : t('admin.invoices.empty')}
        />
      ) : (
        <RecordList>
          {invoices.map((invoice) => {
            const tone = invoiceTone(invoice.status);
            return (
              <RecordRow
                key={invoice.id}
                title={<span className="font-mono">{invoice.invoice_number}</span>}
                trailing={`TZS ${invoice.total_amount.toLocaleString()}`}
                subtitle={invoice.businesses?.name || t('admin.common.unknown')}
                meta={`${new Date(invoice.week_start).toLocaleDateString()} – ${new Date(
                  invoice.week_end
                ).toLocaleDateString()}`}
                status={{
                  dot: INVOICE_DOT[tone],
                  text: INVOICE_TEXT[tone],
                  label: `${t(invoiceStatusLabelKey(invoice.status))} · ${invoice.invoice_type}`,
                }}
                actions={
                  <>
                    <Action href={`/dashboard/admin/invoices/${invoice.id}/view`}>
                      {t('admin.invoices.viewInvoice')}
                    </Action>
                    {invoice.status === 'PROFORMA' && (
                      <Action onClick={() => handleConvertToInvoice(invoice.id)}>
                        {t('admin.invoices.convertToInvoice')}
                      </Action>
                    )}
                    {role === 'ADMIN' && invoice.status !== 'PAID' && (
                      <Action
                        onClick={() => handleDelete(invoice.id, invoice.invoice_number)}
                        tone="danger"
                      >
                        {t('admin.invoices.deleteInvoice')}
                      </Action>
                    )}
                  </>
                }
              />
            );
          })}
        </RecordList>
      )}
    </div>
  );
}

/** A small secondary action under a row. */
function Action({
  children,
  onClick,
  href,
  tone,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  tone?: 'danger';
}) {
  const cls = `inline-flex min-h-[2.25rem] items-center rounded-full border px-3 text-[13px] font-semibold transition-colors ${
    tone === 'danger'
      ? 'border-red-200 text-red-600 active:bg-red-50'
      : 'border-gray-200 text-gray-700 active:bg-gray-100'
  }`;
  return href ? (
    <Link href={href} className={cls}>
      {children}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  );
}
