CREATE TABLE remote_captures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  capture_type TEXT NOT NULL CHECK (capture_type IN ('photo', 'video')),
  camera TEXT NOT NULL DEFAULT 'back' CHECK (camera IN ('front', 'back')),
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  file_size INTEGER,
  duration_seconds INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'capturing', 'completed', 'failed')),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE remote_captures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_remote_captures" ON remote_captures FOR SELECT
  TO authenticated USING (
    device_id IN (SELECT id FROM devices WHERE user_id = auth.uid())
  );

CREATE POLICY "insert_own_remote_captures" ON remote_captures FOR INSERT
  TO authenticated WITH CHECK (
    device_id IN (SELECT id FROM devices WHERE user_id = auth.uid())
  );

CREATE POLICY "delete_own_remote_captures" ON remote_captures FOR DELETE
  TO authenticated USING (
    device_id IN (SELECT id FROM devices WHERE user_id = auth.uid())
  );

CREATE INDEX idx_remote_captures_device ON remote_captures(device_id);
CREATE INDEX idx_remote_captures_timestamp ON remote_captures(timestamp DESC);