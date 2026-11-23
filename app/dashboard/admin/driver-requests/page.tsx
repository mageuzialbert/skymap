'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowDownUp, Loader2, Phone, Search, User, X } from 'lucide-react';
import Alert from '@/components/common/Alert';
import Sheet from '@/components/common/Sheet';
import { EmptyState, ListToolbar, RecordList, RecordRow } from '@/components/common/RecordList';
import RequestFields, {
  FieldCard,
  StatusPill,
  formatStampFull,
  type DriverRequestRecord,
} from '@/components/driverHire/RequestFields';
import { useT } from '@/lib/i18n';
import {
  DRIVER_REQUEST_STATUSES,
  adminNextStatuses,
  formatDateAndTime,
  statusLabelKey,
  statusTone,
} from '@/lib/driverHire';
import {
  cardClass,
  fieldLabel,
  inputClass,
  pageTitle,
  pillGhost,
  pillPrimary,
  sectionLabel,
  textareaClass,
} from '@/lib/ui';

interface Customer {
  name: string;
  phone: string;
  email: string;
}
interface AdminRequest extends DriverRequestRecord {
  admin_notes: string | null;
  customer: Customer;
}
interface HistoryEntry {
  id: string;
  previous_status: string | null;
  new_status: string;
  note: string | null;
  created_at: string;
  changed_by_name: string | null;
  by_customer: boolean;
}

type StatusFilter = 'ALL' | (typeof DRIVER_REQUEST_STATUSES)[number];

async function readError(res: Response): Promise<string> {
  try {
    return (await res.json())?.error || `Request failed (HTTP ${res.status})`;
  } catch {
    return `Request failed (HTTP ${res.status})`;
  }
}

/**
 * Driver Hire requests, for the admin team: find a request, read it, phone the
 * customer, and move it through the workflow. Customers never see this screen
 * or the internal notes kept here.
 */
export default function AdminDriverRequestsPage() {
  const t = useT();

  const [rows, setRows] = useState<AdminRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters.
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [category, setCategory] = useState('');
  const [transmission, setTransmission] = useState('');
  const [date, setDate] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');

  // The open request.
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminRequest | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [nextStatus, setNextStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState<'' | 'status' | 'notes'>('');
  const [saved, setSaved] = useState('');

  // Typing searches after a short pause rather than on every key.
  useEffect(() => {
    const id = setTimeout(() => setQ(search.trim()), 300);
    return () => clearTimeout(id);
  }, [search]);

  const load = useCallback(async () => {
    try {
      const sp = new URLSearchParams();
      if (q) sp.set('q', q);
      if (status !== 'ALL') sp.set('status', status);
      if (category) sp.set('category', category);
      if (transmission) sp.set('transmission', transmission);
      if (date) sp.set('date', date);
      sp.set('sort', sort);
      const res = await fetch(`/api/admin/driver-requests?${sp}`);
      if (!res.ok) throw new Error(await readError(res));
      setRows(await res.json());
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('driverHire.admin.loadFailed'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status, category, transmission, date, sort]);

  useEffect(() => {
    load();
  }, [load]);

  function applyDetail(data: { request: AdminRequest; history: HistoryEntry[] }) {
    setDetail(data.request);
    setHistory(data.history || []);
    setNotes(data.request.admin_notes || '');
    setNextStatus('');
    setStatusNote('');
  }

  async function open(id: string) {
    setOpenId(id);
    setDetail(null);
    setHistory([]);
    setDetailError('');
    setSaved('');
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/driver-requests/${id}`);
      if (!res.ok) throw new Error(await readError(res));
      applyDetail(await res.json());
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : t('driverHire.admin.loadFailed'));
    } finally {
      setDetailLoading(false);
    }
  }

  async function save(kind: 'status' | 'notes') {
    if (!detail || saving) return;
    setSaving(kind);
    setDetailError('');
    setSaved('');
    try {
      const res = await fetch(`/api/admin/driver-requests/${detail.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          kind === 'status' ? { status: nextStatus, note: statusNote } : { admin_notes: notes }
        ),
      });
      if (!res.ok) throw new Error(await readError(res));
      applyDetail(await res.json());
      setSaved(t(kind === 'status' ? 'driverHire.admin.statusSaved' : 'driverHire.admin.notesSaved'));
      load();
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : t('driverHire.admin.saveFailed'));
    } finally {
      setSaving('');
    }
  }

  const anyFilter = !!(q || category || transmission || date || status !== 'ALL');
  const nextOptions = detail ? adminNextStatuses(detail.status) : [];

  return (
    <div>
      <div className="mb-4">
        <h1 className={pageTitle}>{t('driverHire.admin.title')}</h1>
        <p className="mt-1 text-sm text-gray-500">{t('driverHire.admin.subtitle')}</p>
      </div>

      <ListToolbar<StatusFilter>
        chips={[
          { key: 'ALL', label: t('driverHire.admin.all') },
          ...DRIVER_REQUEST_STATUSES.map((s) => ({ key: s, label: t(statusLabelKey(s)) })),
        ]}
        active={status}
        onChange={setStatus}
      />

      <div className={`${cardClass} mb-4 space-y-3 p-4`}>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('driverHire.admin.searchPlaceholder')}
            aria-label={t('driverHire.admin.searchPlaceholder')}
            className={`${inputClass} pl-10`}
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="block">
            <span className={fieldLabel}>{t('driverHire.fields.category')}</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
              <option value="">{t('driverHire.admin.any')}</option>
              <option value="light">{t('driverHire.categories.light.title')}</option>
              <option value="heavy">{t('driverHire.categories.heavy.title')}</option>
            </select>
          </label>
          <label className="block">
            <span className={fieldLabel}>{t('driverHire.fields.transmission')}</span>
            <select
              value={transmission}
              onChange={(e) => setTransmission(e.target.value)}
              className={inputClass}
            >
              <option value="">{t('driverHire.admin.any')}</option>
              <option value="manual">{t('driverHire.transmissions.manual.title')}</option>
              <option value="automatic">{t('driverHire.transmissions.automatic.title')}</option>
            </select>
          </label>
          <label className="block">
            <span className={fieldLabel}>{t('driverHire.fields.travelDate')}</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputClass}
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setSort((s) => (s === 'newest' ? 'oldest' : 'newest'))}
            className="inline-flex min-h-[2.5rem] items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 text-[13px] font-semibold text-gray-700 active:bg-gray-100"
          >
            <ArrowDownUp className="h-4 w-4" />
            {t(sort === 'newest' ? 'driverHire.admin.newestFirst' : 'driverHire.admin.oldestFirst')}
          </button>
          <span className="flex items-center gap-3 text-[13px] text-gray-500">
            {t('driverHire.admin.count', { n: rows.length })}
            {anyFilter && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setCategory('');
                  setTransmission('');
                  setDate('');
                  setStatus('ALL');
                }}
                className="inline-flex items-center gap-1 font-semibold text-gray-700 active:text-gray-900"
              >
                <X className="h-3.5 w-3.5" />
                {t('driverHire.admin.clearFilters')}
              </button>
            )}
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-4">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={User}
          title={t(anyFilter ? 'driverHire.admin.emptyFiltered' : 'driverHire.admin.emptyTitle')}
          body={anyFilter ? undefined : t('driverHire.admin.emptyBody')}
        />
      ) : (
        <RecordList>
          {rows.map((r) => (
            <RecordRow
              key={r.id}
              onClick={() => open(r.id)}
              title={r.customer.name || r.customer.phone || t('driverHire.admin.unknownCustomer')}
              trailing={r.reference_number}
              subtitle={`${t(`driverHire.categories.${r.vehicle_category}.short`)} · ${r.pickup_location} → ${r.destination}`}
              meta={formatDateAndTime(r.departure_date, r.departure_time)}
              status={{ ...statusTone(r.status), label: t(statusLabelKey(r.status)) }}
            />
          ))}
        </RecordList>
      )}

      <Sheet
        open={!!openId}
        onClose={() => setOpenId(null)}
        title={detail?.reference_number || t('driverHire.admin.title')}
      >
        <div className="space-y-5 p-4">
          {detailLoading && (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          {detailError && <Alert tone="error">{detailError}</Alert>}
          {saved && <Alert tone="success">{saved}</Alert>}

          {detail && (
            <>
              <FieldCard
                label={t('driverHire.sections.request')}
                rows={[
                  [t('driverHire.fields.reference'), detail.reference_number],
                  [t('driverHire.fields.submitted'), formatStampFull(detail.created_at)],
                  [t('driverHire.fields.status'), <StatusPill key="s" status={detail.status} />],
                ]}
              />

              <FieldCard
                label={t('driverHire.sections.customer')}
                rows={[
                  [t('driverHire.fields.customerName'), detail.customer.name],
                  [
                    t('driverHire.fields.phone'),
                    detail.customer.phone ? (
                      <a
                        key="p"
                        href={`tel:${detail.customer.phone}`}
                        className="inline-flex items-center gap-1.5 font-semibold text-primary"
                      >
                        <Phone className="h-4 w-4" />
                        {detail.customer.phone}
                      </a>
                    ) : (
                      ''
                    ),
                  ],
                  [t('driverHire.fields.email'), detail.customer.email],
                ]}
              />

              <RequestFields request={detail} />

              {/* ---------------------------------------- change status */}
              <section>
                <h2 className={sectionLabel}>{t('driverHire.admin.updateStatus')}</h2>
                <div className={`${cardClass} space-y-3 p-4`}>
                  {nextOptions.length === 0 ? (
                    <p className="text-[14px] text-gray-500">{t('driverHire.admin.statusLocked')}</p>
                  ) : (
                    <>
                      <label className="block">
                        <span className={fieldLabel}>{t('driverHire.admin.newStatus')}</span>
                        <select
                          value={nextStatus}
                          onChange={(e) => setNextStatus(e.target.value)}
                          className={inputClass}
                        >
                          <option value="">{t('driverHire.admin.chooseStatus')}</option>
                          {nextOptions.map((s) => (
                            <option key={s} value={s}>
                              {t(statusLabelKey(s))}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        <span className={fieldLabel}>{t('driverHire.admin.statusNote')}</span>
                        <input
                          value={statusNote}
                          onChange={(e) => setStatusNote(e.target.value)}
                          maxLength={1000}
                          className={inputClass}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => save('status')}
                        disabled={!nextStatus || !!saving}
                        className={`${pillPrimary} h-11 w-full`}
                      >
                        {saving === 'status' && <Loader2 className="h-5 w-5 animate-spin" />}
                        {t('driverHire.admin.saveStatus')}
                      </button>
                    </>
                  )}
                </div>
              </section>

              {/* --------------------------------------- internal notes */}
              <section>
                <h2 className={sectionLabel}>{t('driverHire.admin.internalNotes')}</h2>
                <div className={`${cardClass} space-y-3 p-4`}>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    maxLength={4000}
                    placeholder={t('driverHire.admin.notesPlaceholder')}
                    aria-label={t('driverHire.admin.internalNotes')}
                    className={textareaClass}
                  />
                  <button
                    type="button"
                    onClick={() => save('notes')}
                    disabled={!!saving || notes === (detail.admin_notes || '')}
                    className={`${pillGhost} h-11 w-full`}
                  >
                    {saving === 'notes' && <Loader2 className="h-5 w-5 animate-spin" />}
                    {t('driverHire.admin.saveNotes')}
                  </button>
                </div>
              </section>

              {/* ---------------------------------------------- history */}
              {history.length > 0 && (
                <section>
                  <h2 className={sectionLabel}>{t('driverHire.admin.history')}</h2>
                  <ol className={`${cardClass} divide-y divide-gray-100 overflow-hidden`}>
                    {history.map((h) => (
                      <li key={h.id} className="px-4 py-3">
                        <p className="flex items-center gap-2 text-[15px] text-gray-900">
                          <span className={`h-2 w-2 shrink-0 rounded-full ${statusTone(h.new_status).dot}`} />
                          <span className="min-w-0 flex-1">
                            {h.previous_status
                              ? `${t(statusLabelKey(h.previous_status))} → ${t(statusLabelKey(h.new_status))}`
                              : t(statusLabelKey(h.new_status))}
                          </span>
                        </p>
                        <p className="mt-0.5 pl-4 text-[13px] text-gray-500">
                          {formatStampFull(h.created_at)} ·{' '}
                          {h.by_customer
                            ? t('driverHire.admin.byCustomer')
                            : h.changed_by_name || t('driverHire.admin.byAdmin')}
                        </p>
                        {h.note && <p className="mt-1 pl-4 text-[14px] text-gray-700">{h.note}</p>}
                      </li>
                    ))}
                  </ol>
                </section>
              )}
            </>
          )}
        </div>
      </Sheet>
    </div>
  );
}
