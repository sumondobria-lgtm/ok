CREATE TABLE ambient_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  duration_seconds INTEGER NOT NULL DEFAULT 30,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'recording', 'completed', 'failed')),
  triggered_by TEXT NOT NULL DEFAULT 'remote' CHECK (triggered_by IN ('remote', 'scheduled')),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ambient_recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_ambient_recordings" ON ambient_recordings FOR SELECT
  TO authenticated USING (
    device_id IN (SELECT id FROM devices WHERE user_id = auth.uid())
  );

CREATE POLICY "insert_own_ambient_recordings" ON ambient_recordings FOR INSERT
  TO authenticated WITH CHECK (
    device_id IN (SELECT id FROM devices WHERE user_id = auth.uid())
  );

CREATE POLICY "delete_own_ambient_recordings" ON ambient_recordings FOR DELETE
  TO authenticated USING (
    device_id IN (SELECT id FROM devices WHERE user_id = auth.uid())
  );

CREATE INDEX idx_ambient_recordings_device ON ambient_recordings(device_id);
CREATE INDEX idx_ambient_recordings_timestamp ON ambient_recordings(timestamp DESC);