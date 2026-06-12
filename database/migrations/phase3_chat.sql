-- Phase 3: Live client <-> rider chat (delivery-scoped). Idempotent.

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_id UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_role TEXT,
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_delivery ON chat_messages(delivery_id, created_at);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- A user participates in a ride's chat if they own the ride's business, are the
-- assigned rider, or are ADMIN/STAFF (support visibility).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='chat_messages' AND policyname='chat_select') THEN
    CREATE POLICY chat_select ON chat_messages FOR SELECT USING (
      delivery_id IN (
        SELECT id FROM deliveries
        WHERE business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
           OR assigned_rider_id = auth.uid()
      )
      OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ADMIN','STAFF'))
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='chat_messages' AND policyname='chat_insert') THEN
    CREATE POLICY chat_insert ON chat_messages FOR INSERT WITH CHECK (
      sender_id = auth.uid()
      AND (
        delivery_id IN (
          SELECT id FROM deliveries
          WHERE business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
             OR assigned_rider_id = auth.uid()
        )
        OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ADMIN','STAFF'))
      )
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='chat_messages' AND policyname='chat_update_read') THEN
    CREATE POLICY chat_update_read ON chat_messages FOR UPDATE USING (
      delivery_id IN (
        SELECT id FROM deliveries
        WHERE business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
           OR assigned_rider_id = auth.uid()
      )
    );
  END IF;
END $$;

-- Stream INSERTs to subscribed browsers (Postgres Changes).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
  END IF;
END $$;
