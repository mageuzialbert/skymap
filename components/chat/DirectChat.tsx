'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  MessageCircle,
  Send,
  Volume2,
  VolumeX,
  Loader2,
  Check,
  CheckCheck,
  ArrowLeft,
} from 'lucide-react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { playChime } from '@/lib/chime';

interface DirectMessage {
  id: string;
  owner_id: string;
  sender_id: string;
  sender_role: string | null;
  body: string;
  created_at: string;
  delivered_at: string | null;
  read_at: string | null;
}

interface DirectChatProps {
  /** The conversation owner (the client/rider user id). */
  ownerId: string;
  /** Name shown in the header (e.g. "Support Team" for clients, the user's name for admins). */
  otherName: string;
  /** Optional back handler (admin list → conversation on mobile). */
  onBack?: () => void;
}

const MUTE_KEY = 'skymap_chat_muted';

function MessageTicks({ m }: { m: DirectMessage }) {
  if (m.read_at) return <CheckCheck className="w-4 h-4 text-sky-500" />;
  if (m.delivered_at) return <CheckCheck className="w-4 h-4 text-gray-400" />;
  return <Check className="w-4 h-4 text-gray-400" />;
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (same(d, today)) return 'Today';
  if (same(d, yest)) return 'Yesterday';
  return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * General-purpose inline chat panel for a delivery-independent conversation
 * (client/rider <-> support). WhatsApp-style bubbles + delivery/read ticks,
 * live typing indicator, presence and per-message date/time stamps.
 */
export default function DirectChat({ ownerId, otherName, onBack }: DirectChatProps) {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [selfId, setSelfId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [muted, setMuted] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [otherOnline, setOtherOnline] = useState(false);

  const selfIdRef = useRef<string | null>(null);
  const lastIdRef = useRef<string | null>(null);
  const initializedRef = useRef(false);
  const mutedRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastTypingSentRef = useRef(0);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  selfIdRef.current = selfId;
  mutedRef.current = muted;

  useEffect(() => {
    try {
      setMuted(localStorage.getItem(MUTE_KEY) === '1');
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSelfId(data.user?.id ?? null));
  }, []);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/chat/direct/${ownerId}`);
    if (!res.ok) return;
    const data: DirectMessage[] = await res.json();
    setMessages(data);

    const latest = data[data.length - 1];
    const isNew = latest && latest.id !== lastIdRef.current;
    const fromOther = latest && latest.sender_id !== selfIdRef.current;
    if (initializedRef.current && isNew && fromOther && !mutedRef.current) playChime();
    if (latest) lastIdRef.current = latest.id;
    initializedRef.current = true;
  }, [ownerId]);

  // Initial load.
  useEffect(() => {
    if (!selfId) return;
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [selfId, refresh]);

  // Realtime: messages (insert + delivered/read updates), typing, presence.
  useEffect(() => {
    if (!selfId) return;
    const channel = supabase.channel(`direct:${ownerId}`, {
      config: { broadcast: { self: false }, presence: { key: selfId } },
    });
    channelRef.current = channel;

    channel
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'direct_messages', filter: `owner_id=eq.${ownerId}` },
        () => refresh()
      )
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload?.id && payload.id !== selfIdRef.current) {
          setOtherTyping(true);
          if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
          typingTimerRef.current = setTimeout(() => setOtherTyping(false), 3000);
        }
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState() as Record<string, Array<{ id?: string }>>;
        const others = Object.values(state)
          .flat()
          .filter((p) => p.id && p.id !== selfIdRef.current);
        setOtherOnline(others.length > 0);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') channel.track({ id: selfId });
      });

    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [ownerId, selfId, refresh]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, otherTyping]);

  function toggleMute() {
    setMuted((m) => {
      const next = !m;
      try {
        localStorage.setItem(MUTE_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  function notifyTyping() {
    const ch = channelRef.current;
    if (!ch || !selfId) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current < 1500) return;
    lastTypingSentRef.current = now;
    ch.send({ type: 'broadcast', event: 'typing', payload: { id: selfId } });
  }

  async function send() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setDraft('');
    try {
      const res = await fetch(`/api/chat/direct/${ownerId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      if (res.ok) await refresh();
      else setDraft(body);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3.5 bg-primary text-white shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          {onBack && (
            <button onClick={onBack} className="p-1 -ml-1 lg:hidden text-white/90 hover:text-white" aria-label="Back">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold truncate leading-tight">{otherName}</p>
            <p className="text-[11px] text-white/80 leading-tight">
              {otherTyping ? 'typing…' : otherOnline ? 'online' : 'tap to chat'}
            </p>
          </div>
        </div>
        <button
          onClick={toggleMute}
          className="p-2 text-white/80 hover:text-white rounded-lg hover:bg-white/10"
          title={muted ? 'Unmute notification sound' : 'Mute notification sound'}
          aria-label={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-1" style={{ backgroundColor: '#ece5dd' }}>
        {loading ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center text-sm text-gray-500 px-6">
            No messages yet. Send a message — we&apos;re here to help anytime.
          </div>
        ) : (
          messages.map((m, i) => {
            const mine = m.sender_id === selfId;
            const prev = messages[i - 1];
            const showDay = !prev || dayLabel(prev.created_at) !== dayLabel(m.created_at);
            const sameAsPrev = !showDay && prev && prev.sender_id === m.sender_id;
            return (
              <div key={m.id}>
                {showDay && (
                  <div className="flex justify-center my-3">
                    <span className="px-3 py-1 rounded-full bg-white/80 text-gray-600 text-[11px] font-medium shadow-sm">
                      {dayLabel(m.created_at)}
                    </span>
                  </div>
                )}
                <div className={`flex ${mine ? 'justify-end' : 'justify-start'} ${sameAsPrev ? 'mt-0.5' : 'mt-2'}`}>
                  <div
                    className={`relative max-w-[80%] pl-3 pr-2 py-1.5 text-sm shadow-sm ${
                      mine
                        ? 'bg-[#dcf8c6] text-gray-900 rounded-2xl rounded-br-md'
                        : 'bg-white text-gray-800 rounded-2xl rounded-bl-md'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words leading-snug">{m.body}</p>
                    <div className="flex items-center justify-end gap-1 mt-0.5 -mr-0.5">
                      <span className="text-[10px] text-gray-500">{timeLabel(m.created_at)}</span>
                      {mine && <MessageTicks m={m} />}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {otherTyping && (
          <div className="flex justify-start mt-2">
            <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="p-2.5 border-t border-gray-100 flex items-end gap-2 bg-white shrink-0">
        <textarea
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            notifyTyping();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          placeholder="Type a message…"
          className="flex-1 resize-none max-h-28 px-3.5 py-2.5 text-sm border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
        />
        <button
          onClick={send}
          disabled={sending || !draft.trim()}
          className="p-2.5 bg-primary text-white rounded-full hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          aria-label="Send"
        >
          {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}
