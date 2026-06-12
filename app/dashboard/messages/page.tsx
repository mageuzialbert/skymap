'use client';

import { useEffect, useState } from 'react';
import { Loader2, MessageCircle } from 'lucide-react';
import ChatLauncher from '@/components/chat/ChatLauncher';

interface Conversation {
  delivery_id: string;
  other_name: string;
  status: string;
  service_type: string | null;
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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/chat/conversations');
        if (res.ok) setConversations(await res.json());
      } catch (err) {
        console.error('Failed to load conversations:', err);
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

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">Messages</h1>

      {conversations.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10 text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <MessageCircle className="w-7 h-7 text-primary" />
          </div>
          <p className="text-gray-900 font-semibold">No conversations yet</p>
          <p className="text-sm text-gray-500 mt-1">
            Chats appear here once a rider is assigned to a request.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100 overflow-hidden">
          {conversations.map((c) => (
            <ChatLauncher
              key={c.delivery_id}
              deliveryId={c.delivery_id}
              otherName={c.other_name}
              variant="row"
              preview={c.last_message}
              timeText={relativeTime(c.last_at)}
              initialUnread={c.unread}
            />
          ))}
        </div>
      )}
    </div>
  );
}
