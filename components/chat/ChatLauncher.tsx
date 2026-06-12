'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { MessageCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { playChime } from '@/lib/chime';
import ChatThread from '@/components/chat/ChatThread';

interface ChatMessage {
  id: string;
  sender_id: string;
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
  preview?: string | null;
  timeText?: string | null;
  initialUnread?: number;
}

const MUTE_KEY = 'skymap_chat_muted';

/**
 * Entry point for the per-delivery chat: a trigger (button or list row) with an
 * unread badge + a background realtime subscription that rings a chime, and an
 * overlay panel powered by the shared ChatThread (text, attachments, voice,
 * camera, dictation, location).
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
  const [unread, setUnread] = useState(initialUnread);
  const [selfId, setSelfId] = useState<string | null>(null);

  const selfIdRef = useRef<string | null>(null);
  const lastIdRef = useRef<string | null>(null);
  const initializedRef = useRef(false);
  const openRef = useRef(open);
  openRef.current = open;
  selfIdRef.current = selfId;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSelfId(data.user?.id ?? null));
  }, []);

  // Background peek: keep the unread badge fresh without marking messages read.
  const peek = useCallback(async () => {
    const res = await fetch(`/api/deliveries/${deliveryId}/chat?peek=1`);
    if (!res.ok) return;
    const data: ChatMessage[] = await res.json();
    const unreadCount = data.filter((m) => m.sender_id !== selfIdRef.current && !m.read_at).length;
    const latest = data[data.length - 1];
    const isNew = latest && latest.id !== lastIdRef.current;
    const fromOther = latest && latest.sender_id !== selfIdRef.current;
    if (initializedRef.current && isNew && fromOther && !openRef.current) {
      let muted = false;
      try {
        muted = localStorage.getItem(MUTE_KEY) === '1';
      } catch {
        /* ignore */
      }
      if (!muted) playChime();
    }
    if (latest) lastIdRef.current = latest.id;
    initializedRef.current = true;
    if (!openRef.current) setUnread(unreadCount);
  }, [deliveryId]);

  useEffect(() => {
    if (!selfId) return;
    peek();
    const channel = supabase
      .channel(`chat-badge:${deliveryId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages', filter: `delivery_id=eq.${deliveryId}` },
        () => peek()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [deliveryId, selfId, peek]);

  function handleOpen() {
    setUnread(0);
    setOpen(true);
  }
  function handleClose() {
    setOpen(false);
    peek();
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
          <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
          <div className="relative w-full sm:max-w-md h-[88dvh] sm:h-[78vh] min-h-[440px] bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">
            <ChatThread
              endpoint={`/api/deliveries/${deliveryId}/chat`}
              channelName={`chat:${deliveryId}`}
              realtimeTable="chat_messages"
              realtimeFilter={`delivery_id=eq.${deliveryId}`}
              storagePrefix={`delivery/${deliveryId}`}
              otherName={otherName || 'Chat'}
              subtitle={`Ride ${deliveryId.slice(0, 8)}`}
              onClose={handleClose}
            />
          </div>
        </div>
      )}
    </>
  );
}
