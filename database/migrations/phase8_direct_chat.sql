-- Phase 8: General-purpose direct chat (client/rider <-> admin support),
-- independent of any delivery. Idempotent.

-- One conversation per non-admin user (the "owner"); admin/staff reply into it.
CREATE TABLE IF NOT EXISTS direct_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,   -- the client/rider this thread belongs to
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_role TEXT,
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_direct_messages_owner ON direct_messages(owner_id, created_at);

ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;
-- So realtime UPDATE events (delivered/read) carry the full row to subscribers.
ALTER TABLE direct_messages REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='direct_messages' AND policyname='dm_select') THEN
    CREATE POLICY dm_select ON direct_messages FOR SELECT USING (
      owner_id = auth.uid()
      OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ADMIN','STAFF'))
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='direct_messages' AND policyname='dm_insert') THEN
    CREATE POLICY dm_insert ON direct_messages FOR INSERT WITH CHECK (
      sender_id = auth.uid()
      AND (
        owner_id = auth.uid()
        OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ADMIN','STAFF'))
      )
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='direct_messages' AND policyname='dm_update') THEN
    CREATE POLICY dm_update ON direct_messages FOR UPDATE USING (
      owner_id = auth.uid()
      OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ADMIN','STAFF'))
    );
  END IF;
END $$;

-- Stream changes to subscribed browsers (Postgres Changes).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'direct_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE direct_messages;
  END IF;
END $$;
