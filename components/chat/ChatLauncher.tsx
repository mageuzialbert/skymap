'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { MessageCircle, X, Send, Volume2, VolumeX, Loader2, Check, CheckCheck } from 'lucide-react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { playChime } from '@/lib/chime';

interface ChatMessage {
  id: string;
  delivery_id: string;
  sender_id: string;
  sender_role: string | null;
  body: string;
  created_at: string;
  delivered_at: string | null;
  read_at: string | null;
}

interface ChatLauncherProps {
  deliveryId: string;
  /** Display name of the other participant (rider for the client, client for the rider). */
  otherName?: string;
  /** Button label, e.g. "Chat with rider". */
  label?: string;
  /** Trigger appearance: a full-width button (default) or a conversation-list row. */
  variant?: 'button' | 'row';
  /** Row variant: last-message preview text. */
  preview?: string | null;
  /** Row variant: small right-aligned timestamp/subtitle. */
  timeText?: string | null;
  /** Seed the unread badge (e.g. from a conversations list). */
  initialUnread?: number;
}

const MUTE_KEY = 'skymap_chat_muted';

/** Single grey ✓ = sent, double grey ✓✓ = delivered, double blue ✓✓ = read. */
function MessageTicks({ m }: { m: ChatMessage }) {
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
 * Self-contained WhatsApp-style chat: a button with an unread badge, plus a
 * slide-over message panel. Subscribes to Supabase Realtime so new messages,
 * delivery/read ticks and the typing indicator update live; rings a chime
 * (unless muted) even while the panel is closed.
 */
export default function ChatLauncher({
  deliveryId,
  otherName,
  label = 'Chat',
  variant = 'button',
  preview,
  timeText,
  initialUnread = 0,
}: ChatLauncherProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selfId, setSelfId] = useState<string | null>(null);
  const [unread, setUnread] = useState(initialUnread);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [muted, setMuted] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [otherOnline, setOtherOnline] = useState(false);

  const openRef = useRef(open);
  const selfIdRef = useRef<string | null>(null);
  const lastIdRef = useRef<string | null>(null);
  const initializedRef = useRef(false);
  const mutedRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastTypingSentRef = useRef(0);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  openRef.current = open;
  selfIdRef.current = selfId;
  mutedRef.current = muted;

  useEffect(() => {
    try {
      setMuted(localStorage.getItem(MUTE_KEY) === '1');
    } catch {
      /* ignore */
    }
  }, []);

  // Resolve the current user id once.
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSelfId(data.user?.id ?? null));
  }, []);

  // Fetch messages. peek=true counts unread without marking read (panel closed).
  const refresh = useCallback(
    async (peek: boolean) => {
      const res = await fetch(`/api/deliveries/${deliveryId}/chat${peek ? '?peek=1' : ''}`);
      if (!res.ok) return;
      const data: ChatMessage[] = await res.json();
      setMessages(data);

      const latest = data[data.length - 1];
      const isNew = latest && latest.id !== lastIdRef.current;
      const fromOther = latest && latest.sender_id !== selfIdRef.current;

      // Ring + badge only for genuinely new incoming messages after the first load.
      if (initializedRef.current && isNew && fromOther) {
        if (!mutedRef.current) playChime();
        if (!openRef.current) setUnread((u) => u + 1);
      }
      if (latest) lastIdRef.current = latest.id;
      initializedRef.current = true;

      if (!peek) setUnread(0);
    },
    [deliveryId]
  );

  // Initial load (peek so we don't clear unread before the user opens the panel).
  useEffect(() => {
    if (!selfId) return;
    refresh(true);
  }, [selfId, refresh]);

  // Realtime: messages (insert + delivered/read updates), typing broadcast, presence.
  useEffect(() => {
    if (!selfId) return;
    const channel = supabase.channel(`chat:${deliveryId}`, {
      config: { broadcast: { self: false }, presence: { key: selfId } },
    });
    channelRef.current = channel;

    channel
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages', filter: `delivery_id=eq.${deliveryId}` },
        () => {
          // If the panel is open we mark read; otherwise peek to keep the badge.
          refresh(!openRef.current);
        }
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
  }, [deliveryId, selfId, refresh]);

  // Scroll to bottom when messages / typing change while open.
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, otherTyping, open]);

  async function handleOpen() {
    setOpen(true);
    setLoading(true);
    await refresh(false); // marks read + clears unread
    setLoading(false);
  }

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

  // Broadcast a throttled "typing" ping to the other participant.
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
      const res = await fetch(`/api/deliveries/${deliveryId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      if (res.ok) {
        await refresh(false);
      } else {
        setDraft(body); // restore on failure
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {variant === 'row' ? (
        <button
          type="button"
          onClick={handleOpen}
          className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 transition-colors"
        >
          <div className="relative shrink-0">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-primary" />
            </div>
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-gray-900 truncate">{otherName || 'Chat'}</p>
              {timeText && <span className="text-xs text-gray-400 shrink-0">{timeText}</span>}
            </div>
            <p className={`text-sm truncate ${unread > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
              {preview || 'Tap to open the conversation'}
            </p>
          </div>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleOpen}
          className="relative inline-flex items-center justify-center gap-2 w-full py-3 bg-primary/10 text-primary font-semibold rounded-xl hover:bg-primary/15 transition-colors"
        >
          <MessageCircle className="w-5 h-5" />
          <span>{label}</span>
          {unread > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col h-[85dvh] sm:h-[70vh] min-h-[420px] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-3.5 border-b border-gray-100 bg-primary text-white">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold truncate leading-tight">{otherName || 'Chat'}</p>
                  <p className="text-[11px] text-white/80 leading-tight">
                    {otherTyping ? 'typing…' : otherOnline ? 'online' : `Ride ${deliveryId.slice(0, 8)}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={toggleMute}
                  className="p-2 text-white/80 hover:text-white rounded-lg hover:bg-white/10"
                  title={muted ? 'Unmute notification sound' : 'Mute notification sound'}
                  aria-label={muted ? 'Unmute' : 'Mute'}
                >
                  {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="p-2 text-white/80 hover:text-white rounded-lg hover:bg-white/10"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto px-3 py-4 space-y-1"
              style={{ backgroundColor: '#ece5dd' }}
            >
              {loading ? (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-center text-sm text-gray-500 px-6">
                  No messages yet. Say hello to coordinate the ride.
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

              {/* Typing bubble */}
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
            <div className="p-2.5 border-t border-gray-100 flex items-end gap-2 bg-white">
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
        </div>
      )}
    </>
  );
}
