CREATE TABLE screen_stream_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  webrtc_offer TEXT,
  webrtc_answer TEXT,
  ice_candidates TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'connecting', 'streaming', 'ended', 'failed')),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE screen_stream_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_sessions" ON screen_stream_sessions FOR SELECT
  TO authenticated USING (
    device_id IN (SELECT id FROM devices WHERE user_id = auth.uid())
  );

CREATE POLICY "insert_own_sessions" ON screen_stream_sessions FOR INSERT
  TO authenticated WITH CHECK (
    device_id IN (SELECT id FROM devices WHERE user_id = auth.uid())
  );

CREATE POLICY "update_own_sessions" ON screen_stream_sessions FOR UPDATE
  TO authenticated USING (
    device_id IN (SELECT id FROM devices WHERE user_id = auth.uid())
  );

CREATE INDEX idx_screen_sessions_device ON screen_stream_sessions(device_id);
CREATE INDEX idx_screen_sessions_created ON screen_stream_sessions(created_at DESC);