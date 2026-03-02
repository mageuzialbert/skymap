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
  Clock,
  CheckCircle2,
  XCircle,
  MessageSquare,
} from 'lucide-react';
import Link from 'next/link';

interface Business {
  id: string;
  name: string;
  phone: string;
}

interface Broadcast {
  id: string;
  subject: string | null;
  body: string;
  recipient_type: string;
  recipient_ids: string[];
  total_sent: number;
  total_failed: number;
  sent_by_user: { name: string } | null;
  created_at: string;
}

export default function SmsSendPage() {
  const router = useRouter();
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

  // Broadcast history
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    async function init() {
      const role = await getUserRole();
      if (role !== 'ADMIN') {
        router.push('/dashboard/business');
        return;
      }
      setLoading(false);
      loadHistory();
    }
    init();
  }, [router]);

  async function loadHistory() {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/admin/sms/send');
      if (res.ok) {
        const data = await res.json();
        setBroadcasts(data);
      }
    } catch {
      // Ignore errors for history
    } finally {
      setLoadingHistory(false);
    }
  }

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

      if (!res.ok) throw new Error(data.error || 'Failed to send');

      setSendResult({
        success: true,
        message: `Sent: ${data.total_sent} | Failed: ${data.total_failed} | Total: ${data.total_recipients}`,
      });

      // Reset form
      setMessage('');
      setSubject('');
      setSelectedRecipients([]);
      loadHistory();
    } catch (err) {
      setSendResult({
        success: false,
        message: err instanceof Error ? err.message : 'Failed to send SMS',
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
            Back to Templates
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Send SMS</h1>
          <p className="text-gray-600 mt-1">
            Compose and send custom SMS messages to clients.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compose Section */}
        <div className="lg:col-span-2 space-y-4">
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
              Subject (optional, for your records)
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Holiday greeting, Service announcement..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
            />
          </div>

          {/* Message */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              placeholder="Type your SMS message here..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">
              {message.length} characters{message.length > 160 ? ` (${Math.ceil(message.length / 160)} SMS parts)` : ''}
            </p>
          </div>

          {/* Recipient Type */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Recipients
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
                Select Clients
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
                All Clients
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
                    placeholder="Search businesses by name or phone..."
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
                    Search and select recipients above
                  </p>
                )}
              </div>
            )}

            {recipientType === 'all_clients' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                ⚠️ This will send the SMS to <strong>all active clients</strong> in the system.
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
                Sending...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Send SMS
              </>
            )}
          </button>
        </div>

        {/* Broadcast History */}
        <div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                Recent Broadcasts
              </h3>
            </div>

            {loadingHistory ? (
              <div className="p-8 text-center">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto" />
              </div>
            ) : broadcasts.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                No broadcasts sent yet.
              </div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                {broadcasts.map((b) => (
                  <div key={b.id} className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">
                        {new Date(b.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-green-600 flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3" />
                          {b.total_sent}
                        </span>
                        {b.total_failed > 0 && (
                          <span className="text-red-600 flex items-center gap-0.5">
                            <XCircle className="w-3 h-3" />
                            {b.total_failed}
                          </span>
                        )}
                      </div>
                    </div>
                    {b.subject && (
                      <p className="text-xs font-medium text-gray-700 mb-0.5">
                        {b.subject}
                      </p>
                    )}
                    <p className="text-xs text-gray-600 line-clamp-2">{b.body}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {b.recipient_type === 'all_clients'
                        ? 'All Clients'
                        : `${b.recipient_ids?.length || 0} selected`}
                      {b.sent_by_user && ` • by ${b.sent_by_user.name}`}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
