CREATE TABLE call_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  contact_name TEXT,
  call_type TEXT NOT NULL CHECK (call_type IN ('incoming', 'outgoing')),
  duration INTEGER NOT NULL DEFAULT 0,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'recording', 'completed', 'failed')),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE call_recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_call_recordings" ON call_recordings FOR SELECT
  TO authenticated USING (
    device_id IN (SELECT id FROM devices WHERE user_id = auth.uid())
  );

CREATE POLICY "insert_own_call_recordings" ON call_recordings FOR INSERT
  TO authenticated WITH CHECK (
    device_id IN (SELECT id FROM devices WHERE user_id = auth.uid())
  );

CREATE POLICY "delete_own_call_recordings" ON call_recordings FOR DELETE
  TO authenticated USING (
    device_id IN (SELECT id FROM devices WHERE user_id = auth.uid())
  );

CREATE INDEX idx_call_recordings_device ON call_recordings(device_id);
CREATE INDEX idx_call_recordings_timestamp ON call_recordings(timestamp DESC);