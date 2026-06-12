'use client';

import { useEffect, useState } from 'react';
import { Loader2, MessageCircle } from 'lucide-react';
import DirectChat from '@/components/chat/DirectChat';
import { getCurrentUser } from '@/lib/auth';
import { getUserRole } from '@/lib/roles';

interface Conversation {
  owner_id: string;
  other_name: string;
  last_message: string | null;
  last_at: string | null;
  unread: number;
}

function relativeTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  if (sameDay) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

export default function MessagesPage() {
  const [selfId, setSelfId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Admin/staff
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [u, r] = await Promise.all([getCurrentUser(), getUserRole()]);
        setSelfId(u?.id ?? null);
        setRole(r);
        if (r === 'ADMIN' || r === 'STAFF') {
          const res = await fetch('/api/chat/conversations');
          if (res.ok) setConversations(await res.json());
        }
      } catch (err) {
        console.error('Failed to load messages:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  const isSupport = role === 'ADMIN' || role === 'STAFF';

  // Client / rider: a single always-available conversation with Support.
  if (!isSupport) {
    if (!selfId) {
      return <div className="text-center py-10 text-gray-500">Could not load your account.</div>;
    }
    return (
      <div className="h-full flex flex-col max-w-3xl mx-auto w-full">
        <DirectChat ownerId={selfId} otherName="Support Team" />
      </div>
    );
  }

  // Admin / staff: conversation list + selected chat.
  return (
    <div className="h-full flex flex-col">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 shrink-0">Messages</h1>
      <div className="flex-1 min-h-0 flex gap-4">
        {/* List */}
        <aside
          className={`w-full lg:w-80 lg:shrink-0 bg-white rounded-xl shadow-sm border border-gray-100 overflow-y-auto ${
            selected ? 'hidden lg:block' : 'block'
          }`}
        >
          {conversations.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">No conversations yet.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {conversations.map((c) => (
                <button
                  key={c.owner_id}
                  onClick={() => setSelected(c)}
                  className={`w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 transition-colors ${
                    selected?.owner_id === c.owner_id ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className="relative shrink-0">
                    <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center">
                      <MessageCircle className="w-5 h-5 text-primary" />
                    </div>
                    {c.unread > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full">
                        {c.unread > 9 ? '9+' : c.unread}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-gray-900 truncate">{c.other_name}</p>
                      <span className="text-xs text-gray-400 shrink-0">{relativeTime(c.last_at)}</span>
                    </div>
                    <p
                      className={`text-sm truncate ${
                        c.unread > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'
                      }`}
                    >
                      {c.last_message || 'No messages yet'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </aside>

        {/* Chat */}
        <section className={`flex-1 min-h-0 ${selected ? 'block' : 'hidden lg:block'}`}>
          {selected ? (
            <DirectChat
              ownerId={selected.owner_id}
              otherName={selected.other_name}
              onBack={() => setSelected(null)}
            />
          ) : (
            <div className="h-full flex items-center justify-center bg-white rounded-xl shadow-sm border border-gray-100 text-center text-gray-500 p-8">
              <div>
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <MessageCircle className="w-7 h-7 text-primary" />
                </div>
                <p className="font-semibold text-gray-900">Select a conversation</p>
                <p className="text-sm text-gray-500 mt-1">Choose a client or rider to view and reply.</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
