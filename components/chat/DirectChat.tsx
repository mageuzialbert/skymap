'use client';

import ChatThread from '@/components/chat/ChatThread';

interface DirectChatProps {
  /** The conversation owner (the client/rider user id). */
  ownerId: string;
  /** Name shown in the header (e.g. "Support Team" for clients, the user's name for admins). */
  otherName: string;
  /** Optional back handler (admin list → conversation on mobile). */
  onBack?: () => void;
}

/**
 * General-purpose (delivery-independent) chat between a client/rider and support.
 * Thin wrapper around the shared ChatThread core.
 */
export default function DirectChat({ ownerId, otherName, onBack }: DirectChatProps) {
  return (
    <div className="h-full rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <ChatThread
        endpoint={`/api/chat/direct/${ownerId}`}
        channelName={`direct:${ownerId}`}
        realtimeTable="direct_messages"
        realtimeFilter={`owner_id=eq.${ownerId}`}
        storagePrefix={`direct/${ownerId}`}
        otherName={otherName}
        onBack={onBack}
      />
    </div>
  );
}
