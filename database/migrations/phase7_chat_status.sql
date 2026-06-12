-- Phase 7: WhatsApp-style chat status — delivered/read ticks. Idempotent.

-- Track when the recipient's device received the message (distinct from read_at).
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;

-- So realtime UPDATE events (delivered/read changes) carry the full row to
-- subscribers, letting the sender's bubble flip its ticks live.
ALTER TABLE chat_messages REPLICA IDENTITY FULL;

CREATE INDEX IF NOT EXISTS idx_chat_messages_delivered ON chat_messages(delivery_id, delivered_at);
