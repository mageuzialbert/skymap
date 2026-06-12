'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  MessageCircle, Send, Volume2, VolumeX, Loader2, Check, CheckCheck, ArrowLeft, X,
  Plus, Camera, Image as ImageIcon, FileText, MapPin, Mic, Play, Pause, Trash2, Download, Video,
} from 'lucide-react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { playChime } from '@/lib/chime';
import CameraCapture from '@/components/common/CameraCapture';

export interface ChatAttachment {
  type: 'image' | 'video' | 'audio' | 'file' | 'location';
  url?: string;
  name?: string;
  mime?: string;
  size?: number;
  duration?: number;
  lat?: number;
  lng?: number;
}

export interface ChatThreadMessage {
  id: string;
  sender_id: string;
  sender_role: string | null;
  body: string | null;
  attachment: ChatAttachment | null;
  created_at: string;
  delivered_at: string | null;
  read_at: string | null;
}

interface ChatThreadProps {
  endpoint: string; // e.g. /api/chat/direct/{ownerId}
  channelName: string; // e.g. direct:{ownerId}
  realtimeTable: string; // 'direct_messages' | 'chat_messages'
  realtimeFilter: string; // 'owner_id=eq.{ownerId}'
  storagePrefix: string; // path prefix in the chat-attachments bucket
  otherName: string;
  subtitle?: string;
  onBack?: () => void;
  onClose?: () => void;
}

const MUTE_KEY = 'skymap_chat_muted';
const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

/* ----------------------------- helpers ----------------------------- */

function MessageTicks({ m }: { m: ChatThreadMessage }) {
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

function formatBytes(n?: number): string {
  if (!n) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function formatDuration(s?: number): string {
  if (!s || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

/* --------------------------- audio player -------------------------- */

function AudioMessage({ url, duration, mine }: { url: string; duration?: number; mine: boolean }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) a.pause();
    else a.play();
  }

  return (
    <div className="flex items-center gap-2 min-w-[180px]">
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setProgress(0); }}
        onTimeUpdate={(e) => {
          const a = e.currentTarget;
          if (a.duration) setProgress((a.currentTime / a.duration) * 100);
        }}
      />
      <button
        type="button"
        onClick={toggle}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
          mine ? 'bg-primary text-white' : 'bg-primary/10 text-primary'
        }`}
      >
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>
      <div className="flex-1">
        <div className="h-1.5 rounded-full bg-gray-300/60 overflow-hidden">
          <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
        </div>
        <div className="text-[10px] text-gray-500 mt-1">{formatDuration(duration)}</div>
      </div>
    </div>
  );
}

/* ------------------------- attachment view ------------------------- */

function AttachmentView({ a, mine }: { a: ChatAttachment; mine: boolean }) {
  if (a.type === 'image' && a.url) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <a href={a.url} target="_blank" rel="noopener noreferrer" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={a.url} alt={a.name || 'image'} className="rounded-lg max-w-[230px] max-h-[280px] object-cover" />
      </a>
    );
  }
  if (a.type === 'video' && a.url) {
    return <video src={a.url} controls className="rounded-lg max-w-[240px] max-h-[300px]" />;
  }
  if (a.type === 'audio' && a.url) {
    return <AudioMessage url={a.url} duration={a.duration} mine={mine} />;
  }
  if (a.type === 'file' && a.url) {
    return (
      <a
        href={a.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2.5 min-w-[180px] max-w-[240px]"
      >
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <FileText className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 truncate">{a.name || 'Document'}</p>
          <p className="text-[11px] text-gray-500">{formatBytes(a.size)}</p>
        </div>
        <Download className="w-4 h-4 text-gray-400 shrink-0" />
      </a>
    );
  }
  if (a.type === 'location' && a.lat != null && a.lng != null) {
    const maps = `https://www.google.com/maps?q=${a.lat},${a.lng}`;
    const staticUrl = MAPS_KEY
      ? `https://maps.googleapis.com/maps/api/staticmap?center=${a.lat},${a.lng}&zoom=15&size=300x150&scale=2&markers=color:red%7C${a.lat},${a.lng}&key=${MAPS_KEY}`
      : '';
    return (
      <a href={maps} target="_blank" rel="noopener noreferrer" className="block w-[230px]">
        {staticUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={staticUrl} alt="Shared location" className="rounded-lg w-full h-[120px] object-cover" />
        ) : (
          <div className="rounded-lg w-full h-[90px] bg-gray-100 flex items-center justify-center">
            <MapPin className="w-7 h-7 text-primary" />
          </div>
        )}
        <div className="flex items-center gap-1.5 mt-1 text-sm text-primary font-medium">
          <MapPin className="w-4 h-4" /> Open location
        </div>
      </a>
    );
  }
  return null;
}

function audioMimeCandidate(): string {
  const cands = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
  if (typeof MediaRecorder === 'undefined') return '';
  for (const c of cands) {
    try {
      if (MediaRecorder.isTypeSupported(c)) return c;
    } catch {
      /* ignore */
    }
  }
  return '';
}

/* ----------------------------- component ----------------------------- */

export default function ChatThread({
  endpoint,
  channelName,
  realtimeTable,
  realtimeFilter,
  storagePrefix,
  otherName,
  subtitle = 'tap to chat',
  onBack,
  onClose,
}: ChatThreadProps) {
  const [messages, setMessages] = useState<ChatThreadMessage[]>([]);
  const [selfId, setSelfId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [draft, setDraft] = useState('');
  const [muted, setMuted] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [otherOnline, setOtherOnline] = useState(false);
  const [error, setError] = useState('');
  const [attachOpen, setAttachOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);

  const selfIdRef = useRef<string | null>(null);
  const lastIdRef = useRef<string | null>(null);
  const initializedRef = useRef(false);
  const mutedRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastTypingSentRef = useRef(0);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const galleryInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordSecondsRef = useRef(0);
  const cancelRecordRef = useRef(false);

  const dictationSupported =
    typeof window !== 'undefined' && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

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
    const res = await fetch(endpoint);
    if (!res.ok) return;
    const data: ChatThreadMessage[] = await res.json();
    setMessages(data);
    const latest = data[data.length - 1];
    const isNew = latest && latest.id !== lastIdRef.current;
    const fromOther = latest && latest.sender_id !== selfIdRef.current;
    if (initializedRef.current && isNew && fromOther && !mutedRef.current) playChime();
    if (latest) lastIdRef.current = latest.id;
    initializedRef.current = true;
  }, [endpoint]);

  useEffect(() => {
    if (!selfId) return;
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [selfId, refresh]);

  // Realtime: messages + typing + presence.
  useEffect(() => {
    if (!selfId) return;
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false }, presence: { key: selfId } },
    });
    channelRef.current = channel;
    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: realtimeTable, filter: realtimeFilter }, () =>
        refresh()
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
        const others = Object.values(state).flat().filter((p) => p.id && p.id !== selfIdRef.current);
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
  }, [channelName, realtimeTable, realtimeFilter, selfId, refresh]);

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

  const postMessage = useCallback(
    async (payload: { body?: string; attachment?: ChatAttachment }) => {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) await refresh();
      return res.ok;
    },
    [endpoint, refresh]
  );

  async function sendText() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setDraft('');
    const ok = await postMessage({ body });
    if (!ok) setDraft(body);
    setSending(false);
  }

  async function uploadFile(file: File): Promise<Omit<ChatAttachment, 'type'> | null> {
    try {
      const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
      const key = `${storagePrefix}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('chat-attachments')
        .upload(key, file, { contentType: file.type || undefined });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('chat-attachments').getPublicUrl(key);
      return { url: data.publicUrl, name: file.name, mime: file.type, size: file.size };
    } catch (e) {
      console.error('Upload failed:', e);
      return null;
    }
  }

  async function uploadAndSend(file: File, type: ChatAttachment['type'], extra: Partial<ChatAttachment> = {}) {
    if (file.size > 50 * 1024 * 1024) {
      setError('File too large (max 50MB)');
      return;
    }
    setError('');
    setAttachOpen(false);
    setUploading(true);
    const up = await uploadFile(file);
    if (up) {
      const caption = draft.trim();
      await postMessage({ body: caption || undefined, attachment: { type, ...up, ...extra } });
      setDraft('');
    } else {
      setError('Could not upload the attachment');
    }
    setUploading(false);
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>, fallbackType: ChatAttachment['type']) {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = '';
    if (!file) return;
    const mime = file.type || '';
    const type: ChatAttachment['type'] = mime.startsWith('image/')
      ? 'image'
      : mime.startsWith('video/')
      ? 'video'
      : mime.startsWith('audio/')
      ? 'audio'
      : fallbackType;
    uploadAndSend(file, type);
  }

  function handleCameraCapture(file: File) {
    setCameraOpen(false);
    uploadAndSend(file, 'image');
  }

  function shareLocation() {
    setAttachOpen(false);
    if (!navigator.geolocation) {
      setError('Location is not available on this device');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => postMessage({ attachment: { type: 'location', lat: pos.coords.latitude, lng: pos.coords.longitude } }),
      () => setError('Could not get your location')
    );
  }

  /* ----- voice recording ----- */
  async function startRecording() {
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices) {
      setError('Voice recording is not supported on this device');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = audioMimeCandidate();
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      cancelRecordRef.current = false;
      mr.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (recordTimerRef.current) clearInterval(recordTimerRef.current);
        const seconds = recordSecondsRef.current;
        setRecording(false);
        if (cancelRecordRef.current) return;
        const type = mr.mimeType || 'audio/webm';
        const ext = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm';
        const file = new File(chunksRef.current, `voice-${Date.now()}.${ext}`, { type });
        await uploadAndSend(file, 'audio', { duration: seconds });
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setRecording(true);
      setRecordSeconds(0);
      recordSecondsRef.current = 0;
      recordTimerRef.current = setInterval(() => {
        recordSecondsRef.current += 1;
        setRecordSeconds(recordSecondsRef.current);
      }, 1000);
    } catch {
      setError('Microphone permission denied');
    }
  }

  function stopRecording(send: boolean) {
    cancelRecordRef.current = !send;
    mediaRecorderRef.current?.stop();
  }

  /* ----- dictation (speech-to-text) ----- */
  function toggleDictation() {
    if (!dictationSupported) return;
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.onresult = (e: any) => {
      let finalText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
      }
      if (finalText.trim()) setDraft((d) => (d ? d + ' ' : '') + finalText.trim());
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  }

  const headerStatus = otherTyping ? 'typing…' : otherOnline ? 'online' : subtitle;

  return (
    <div className="flex flex-col h-full min-h-0 bg-white overflow-hidden">
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
            <p className="text-[11px] text-white/80 leading-tight">{headerStatus}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleMute}
            className="p-2 text-white/80 hover:text-white rounded-lg hover:bg-white/10"
            title={muted ? 'Unmute' : 'Mute'}
            aria-label={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          {onClose && (
            <button onClick={onClose} className="p-2 text-white/80 hover:text-white rounded-lg hover:bg-white/10" aria-label="Close">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-1" style={{ backgroundColor: '#ece5dd' }}>
        {loading ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center text-sm text-gray-500 px-6">
            No messages yet. Send a message, photo, voice note or your location.
          </div>
        ) : (
          messages.map((m, i) => {
            const mine = m.sender_id === selfId;
            const prev = messages[i - 1];
            const showDay = !prev || dayLabel(prev.created_at) !== dayLabel(m.created_at);
            const sameAsPrev = !showDay && prev && prev.sender_id === m.sender_id;
            const hasAttachment = !!m.attachment;
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
                    className={`relative max-w-[82%] p-1.5 ${hasAttachment ? '' : 'pl-3 pr-2'} text-sm shadow-sm ${
                      mine
                        ? 'bg-[#dcf8c6] text-gray-900 rounded-2xl rounded-br-md'
                        : 'bg-white text-gray-800 rounded-2xl rounded-bl-md'
                    }`}
                  >
                    {hasAttachment && (
                      <div className={m.body ? 'mb-1' : ''}>
                        <AttachmentView a={m.attachment as ChatAttachment} mine={mine} />
                      </div>
                    )}
                    {m.body && <p className={`whitespace-pre-wrap break-words leading-snug ${hasAttachment ? 'px-1.5' : ''}`}>{m.body}</p>}
                    <div className={`flex items-center justify-end gap-1 mt-0.5 ${hasAttachment ? 'px-1.5 pb-0.5' : '-mr-0.5'}`}>
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

      {error && (
        <div className="px-3 py-1.5 bg-red-50 text-red-700 text-xs border-t border-red-100">{error}</div>
      )}

      {/* Composer */}
      <div className="border-t border-gray-100 bg-white shrink-0 relative">
        {/* Attachment menu */}
        {attachOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setAttachOpen(false)} />
            <div className="absolute bottom-full left-2 mb-2 z-20 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 grid grid-cols-2 gap-1 w-56">
              <AttachTile icon={Camera} label="Camera" color="text-rose-600 bg-rose-50" onClick={() => { setAttachOpen(false); setCameraOpen(true); }} />
              <AttachTile icon={ImageIcon} label="Photo/Video" color="text-violet-600 bg-violet-50" onClick={() => galleryInputRef.current?.click()} />
              <AttachTile icon={Video} label="Record video" color="text-blue-600 bg-blue-50" onClick={() => videoInputRef.current?.click()} />
              <AttachTile icon={FileText} label="Document" color="text-amber-600 bg-amber-50" onClick={() => docInputRef.current?.click()} />
              <AttachTile icon={MapPin} label="Location" color="text-emerald-600 bg-emerald-50" onClick={shareLocation} />
            </div>
          </>
        )}

        {recording ? (
          <div className="flex items-center gap-3 p-3">
            <button onClick={() => stopRecording(false)} className="p-2 text-red-600 hover:bg-red-50 rounded-full" aria-label="Cancel">
              <Trash2 className="w-5 h-5" />
            </button>
            <div className="flex-1 flex items-center gap-2 text-red-600">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
              <span className="text-sm font-medium tabular-nums">{formatDuration(recordSeconds)}</span>
              <span className="text-xs text-gray-400">Recording… tap send to finish</span>
            </div>
            <button onClick={() => stopRecording(true)} className="p-2.5 bg-primary text-white rounded-full" aria-label="Send voice">
              <Send className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="flex items-end gap-1.5 p-2.5">
            <button
              type="button"
              onClick={() => setAttachOpen((o) => !o)}
              disabled={uploading}
              className="p-2.5 text-gray-500 hover:text-primary hover:bg-gray-100 rounded-full transition-colors shrink-0"
              aria-label="Attach"
            >
              <Plus className="w-5 h-5" />
            </button>

            <div className="flex-1 flex items-end bg-gray-100 rounded-3xl px-2">
              <textarea
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  notifyTyping();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendText();
                  }
                }}
                rows={1}
                placeholder={uploading ? 'Uploading…' : 'Type a message…'}
                disabled={uploading}
                className="flex-1 resize-none max-h-28 bg-transparent px-2 py-2.5 text-sm focus:outline-none"
              />
              {dictationSupported && (
                <button
                  type="button"
                  onClick={toggleDictation}
                  className={`p-2 rounded-full shrink-0 ${listening ? 'text-red-600 animate-pulse' : 'text-gray-500 hover:text-primary'}`}
                  title="Dictate"
                  aria-label="Dictate"
                >
                  <Mic className="w-5 h-5" />
                </button>
              )}
            </div>

            {uploading ? (
              <div className="p-2.5 shrink-0">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : draft.trim() ? (
              <button
                onClick={sendText}
                disabled={sending}
                className="p-2.5 bg-primary text-white rounded-full hover:bg-primary-dark transition-colors disabled:opacity-50 shrink-0"
                aria-label="Send"
              >
                {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            ) : (
              <button
                onClick={startRecording}
                className="p-2.5 bg-primary text-white rounded-full hover:bg-primary-dark transition-colors shrink-0"
                aria-label="Record voice message"
              >
                <Mic className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Hidden inputs + camera */}
      <input ref={galleryInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={(e) => onPick(e, 'file')} />
      <input ref={videoInputRef} type="file" accept="video/*" capture="environment" className="hidden" onChange={(e) => onPick(e, 'video')} />
      <input
        ref={docInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,application/pdf"
        className="hidden"
        onChange={(e) => onPick(e, 'file')}
      />
      <CameraCapture isOpen={cameraOpen} onClose={() => setCameraOpen(false)} onCapture={handleCameraCapture} />
    </div>
  );
}

function AttachTile({
  icon: Icon,
  label,
  color,
  onClick,
}: {
  icon: any;
  label: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl hover:bg-gray-50 transition-colors"
    >
      <span className={`w-10 h-10 rounded-full flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </span>
      <span className="text-xs text-gray-700">{label}</span>
    </button>
  );
}
