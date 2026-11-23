'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Alert from '@/components/common/Alert';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import RequestFields, {
  StatusPill,
  formatStampFull,
  type DriverRequestRecord,
} from '@/components/driverHire/RequestFields';
import { useT } from '@/lib/i18n';
import { CUSTOMER_CANCELLABLE, statusLabelKey, statusTone, type DriverRequestStatus } from '@/lib/driverHire';
import { cardClass, pillGhost, sectionLabel } from '@/lib/ui';

interface HistoryEntry {
  id: string;
  new_status: string;
  created_at: string;
}

/** One of the customer's own driver requests: what was asked, where it has
 *  got to, and a way to cancel while that is still possible. */
export default function DriverRequestDetailPage({ params }: { params: { id: string } }) {
  const t = useT();
  const [request, setRequest] = useState<DriverRequestRecord | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  async function load() {
    try {
      const res = await fetch(`/api/client/driver-requests/${params.id}`);
      if (!res.ok) throw new Error(res.status === 404 ? 'notFound' : 'loadFailed');
      const data = await res.json();
      setRequest(data.request);
      setHistory(data.history || []);
      setError('');
    } catch (err) {
      setError(
        t(
          err instanceof Error && err.message === 'notFound'
            ? 'driverHire.detail.notFound'
            : 'driverHire.list.loadFailed'
        )
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function cancel() {
    setCancelling(true);
    try {
      const res = await fetch(`/api/client/driver-requests/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      });
      if (!res.ok) throw new Error();
      setConfirming(false);
      await load();
    } catch {
      setConfirming(false);
      setError(t('driverHire.detail.cancelFailed'));
      load();
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const canCancel =
    !!request && CUSTOMER_CANCELLABLE.includes(request.status as DriverRequestStatus);

  return (
    <div className="mx-auto w-full max-w-md space-y-5">
      <Link
        href="/dashboard/business/driver-requests"
        className="-ml-1 inline-flex items-center gap-1.5 text-[14px] font-semibold text-gray-600 active:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('driverHire.list.title')}
      </Link>

      {error && <Alert tone="error">{error}</Alert>}

      {request && (
        <>
          <div className={`${cardClass} px-4 py-4`}>
            <p className="text-[13px] text-gray-500">{t('driverHire.fields.reference')}</p>
            <p className="font-display text-[22px] font-bold leading-tight tracking-tight text-gray-900">
              {request.reference_number}
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <StatusPill status={request.status} />
              <span className="text-[13px] text-gray-500">
                {t('driverHire.fields.submitted')} {formatStampFull(request.created_at)}
              </span>
            </div>
            <p className="mt-3 text-[14px] leading-snug text-gray-600">
              {t(`driverHire.statusHelp.${request.status}`)}
            </p>
          </div>

          <RequestFields request={request} />

          {history.length > 0 && (
            <section>
              <h2 className={sectionLabel}>{t('driverHire.sections.progress')}</h2>
              <ol className={`${cardClass} divide-y divide-gray-100 overflow-hidden`}>
                {history.map((h) => (
                  <li key={h.id} className="flex items-center gap-3 px-4 py-3">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${statusTone(h.new_status).dot}`} />
                    <span className="min-w-0 flex-1 text-[15px] text-gray-900">
                      {t(statusLabelKey(h.new_status))}
                    </span>
                    <span className="shrink-0 text-[13px] text-gray-500">
                      {formatStampFull(h.created_at)}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {canCancel && (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className={`${pillGhost} h-12 w-full border-red-200 text-base text-red-700`}
            >
              {t('driverHire.detail.cancel')}
            </button>
          )}
        </>
      )}

      <ConfirmDialog
        isOpen={confirming}
        tone="danger"
        title={t('driverHire.detail.cancelTitle')}
        message={t('driverHire.detail.cancelMessage')}
        confirmLabel={t('driverHire.detail.cancelConfirm')}
        cancelLabel={t('driverHire.detail.cancelKeep')}
        loading={cancelling}
        onConfirm={cancel}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
