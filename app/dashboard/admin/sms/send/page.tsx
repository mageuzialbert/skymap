'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getUserRole } from '@/lib/roles';
import {
  Loader2,
  Send,
  Search,
  X,
  Check,
  Users,
  ArrowLeft,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useT } from '@/lib/i18n';

interface Business {
  id: string;
  name: string;
  phone: string;
}

export default function SmsSendPage() {
  const router = useRouter();
  const t = useT();
  const [loading, setLoading] = useState(true);

  // Compose state
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [recipientType, setRecipientType] = useState<'all_clients' | 'selected'>('selected');
  const [selectedRecipients, setSelectedRecipients] = useState<Business[]>([]);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);

  // Recipient search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Business[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    async function init() {
      const role = await getUserRole();
      if (role !== 'ADMIN') {
        router.push('/dashboard/business');
        return;
      }
      setLoading(false);
    }
    init();
  }, [router]);

  // Debounced search
  const searchRecipients = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/admin/sms/recipients?search=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
      }
    } catch {
      // ignore
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchRecipients(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchRecipients]);

  function addRecipient(business: Business) {
    if (!selectedRecipients.find((r) => r.id === business.id)) {
      setSelectedRecipients((prev) => [...prev, business]);
    }
    setSearchQuery('');
    setSearchResults([]);
  }

  function removeRecipient(id: string) {
    setSelectedRecipients((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleSend() {
    if (!message.trim()) return;
    if (recipientType === 'selected' && selectedRecipients.length === 0) return;

    setSending(true);
    setSendResult(null);

    try {
      const res = await fetch('/api/admin/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subject || null,
          message: message.trim(),
          recipient_type: recipientType,
          recipient_ids: selectedRecipients.map((r) => r.id),
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || t('admin.sms.send.failToSend'));

      const sent = data.total_sent ?? 0;
      const failed = data.total_failed ?? 0;
      const reason = Array.isArray(data.errors) && data.errors.length ? ` - ${data.errors.join('; ')}` : '';
      const allFailed = sent === 0 && failed > 0;

      setSendResult({
        success: failed === 0,
        message: allFailed
          ? t('admin.sms.send.noneSent', { failed, reason })
          : t('admin.sms.send.sentSummary', { sent, failed, total: data.total_recipients, reason: failed ? reason : '' }),
      });

      // Keep the message in the box if everything failed so it can be retried.
      if (!allFailed) {
        setMessage('');
        setSubject('');
        setSelectedRecipients([]);
      }
    } catch (err) {
      setSendResult({
        success: false,
        message: err instanceof Error ? err.message : t('admin.sms.send.failToSend'),
      });
    } finally {
      setSending(false);
    }
  }

  const canSend =
    message.trim() &&
    (recipientType === 'all_clients' || selectedRecipients.length > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link
            href="/dashboard/admin/sms/templates"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('admin.sms.send.backToTemplates')}
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{t('admin.sms.send.title')}</h1>
          <p className="text-gray-600 mt-1">
            {t('admin.sms.send.subtitle')}
          </p>
        </div>
      </div>

      {/* Compose Section */}
      <div className="max-w-3xl space-y-4">
        {/* Result banner */}
        {sendResult && (
          <div
            className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
              sendResult.success
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}
          >
            {sendResult.success ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 flex-shrink-0" />
            )}
            {sendResult.message}
            <button onClick={() => setSendResult(null)} className="ml-auto font-bold">
              ×
            </button>
          </div>
        )}

        {/* Subject (optional) */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('admin.sms.send.subjectLabel')}
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={t('admin.sms.send.subjectPlaceholder')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
          />
        </div>

        {/* Message */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('admin.sms.send.messageLabel')} <span className="text-red-500">*</span>
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            placeholder={t('admin.sms.send.messagePlaceholder')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">
            {t('admin.sms.send.chars', { count: message.length })}{message.length > 160 ? t('admin.sms.send.parts', { parts: Math.ceil(message.length / 160) }) : ''}
          </p>
        </div>

        {/* Recipient Type */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            {t('admin.sms.send.recipients')}
          </label>
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => setRecipientType('selected')}
              className={`flex-1 px-4 py-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                recipientType === 'selected'
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
              }`}
            >
              <Users className="w-5 h-5 mx-auto mb-1" />
              {t('admin.sms.send.selectClients')}
            </button>
            <button
              onClick={() => setRecipientType('all_clients')}
              className={`flex-1 px-4 py-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                recipientType === 'all_clients'
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
              }`}
            >
              <Users className="w-5 h-5 mx-auto mb-1" />
              {t('admin.sms.send.allClients')}
            </button>
          </div>

          {/* Search & Select Recipients */}
          {recipientType === 'selected' && (
            <div>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('admin.sms.send.searchPlaceholder')}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                />
                {searching && (
                  <Loader2 className="absolute right-3 top-2.5 w-4 h-4 animate-spin text-gray-400" />
                )}
              </div>

              {/* Search results dropdown */}
              {searchResults.length > 0 && (
                <div className="border border-gray-200 rounded-lg max-h-40 overflow-y-auto mb-3 bg-white shadow-sm">
                  {searchResults.map((biz) => (
                    <button
                      key={biz.id}
                      onClick={() => addRecipient(biz)}
                      disabled={!!selectedRecipients.find((r) => r.id === biz.id)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div>
                        <span className="font-medium text-gray-900">{biz.name}</span>
                        <span className="text-gray-500 ml-2">{biz.phone}</span>
                      </div>
                      {selectedRecipients.find((r) => r.id === biz.id) ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : null}
                    </button>
                  ))}
                </div>
              )}

              {/* Selected recipients */}
              {selectedRecipients.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedRecipients.map((r) => (
                    <span
                      key={r.id}
                      className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-full text-xs font-medium"
                    >
                      {r.name}
                      <button
                        onClick={() => removeRecipient(r.id)}
                        className="hover:text-red-500 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {selectedRecipients.length === 0 && !searchQuery && (
                <p className="text-sm text-gray-400 text-center py-2">
                  {t('admin.sms.send.selectHint')}
                </p>
              )}
            </div>
          )}

          {recipientType === 'all_clients' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
              ⚠️ {t('admin.sms.send.warnPre')} <strong>{t('admin.sms.send.warnStrong')}</strong> {t('admin.sms.send.warnPost')}
            </div>
          )}
        </div>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={!canSend || sending}
          className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {t('common.sending')}
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              {t('admin.sms.send.send')}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
