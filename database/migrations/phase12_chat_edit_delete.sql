-- Phase 12: Edit / delete chat messages (both per-delivery and direct chat).
-- - edited_at: set when a message body is edited (UI shows "edited").
-- - deleted_at: "delete for everyone" tombstone (UI shows "This message was deleted").
-- - deleted_for: per-user "delete for me" (message hidden only for those user ids).
-- Idempotent. (Both tables already have REPLICA IDENTITY FULL for realtime.)

ALTER TABLE chat_messages   ADD COLUMN IF NOT EXISTS edited_at  TIMESTAMP WITH TIME ZONE;
ALTER TABLE chat_messages   ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE chat_messages   ADD COLUMN IF NOT EXISTS deleted_for UUID[] NOT NULL DEFAULT '{}';

ALTER TABLE direct_messages ADD COLUMN IF NOT EXISTS edited_at  TIMESTAMP WITH TIME ZONE;
ALTER TABLE direct_messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE direct_messages ADD COLUMN IF NOT EXISTS deleted_for UUID[] NOT NULL DEFAULT '{}';
