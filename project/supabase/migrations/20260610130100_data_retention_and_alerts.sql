-- Real-time alerts table for geofence breaches and keyword detection
CREATE TABLE real_time_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('geofence_enter', 'geofence_exit', 'keyword', 'suspicious_app', 'blocked_access', 'low_battery', 'device_offline')),
  severity TEXT NOT NULL DEFAULT 'normal' CHECK (severity IN ('low', 'normal', 'high', 'critical')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  is_read BOOLEAN DEFAULT false,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE real_time_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_alerts" ON real_time_alerts FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "insert_own_alerts" ON real_time_alerts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_alerts" ON real_time_alerts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_real_time_alerts_user ON real_time_alerts(user_id);
CREATE INDEX idx_real_time_alerts_device ON real_time_alerts(device_id);
CREATE INDEX idx_real_time_alerts_unread ON real_time_alerts(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_real_time_alerts_created ON real_time_alerts(created_at DESC);

-- Keyword blacklist for alert triggers
CREATE TABLE keyword_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  is_case_sensitive BOOLEAN DEFAULT false,
  alert_severity TEXT DEFAULT 'normal' CHECK (alert_severity IN ('low', 'normal', 'high', 'critical')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE keyword_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_keyword_alerts" ON keyword_alerts FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "insert_own_keyword_alerts" ON keyword_alerts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_keyword_alerts" ON keyword_alerts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "delete_own_keyword_alerts" ON keyword_alerts FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_keyword_alerts_user ON keyword_alerts(user_id);
CREATE INDEX idx_keyword_alerts_active ON keyword_alerts(user_id, is_active) WHERE is_active = true;

-- Admin 2FA backup codes
CREATE TABLE admin_2fa_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  is_used BOOLEAN DEFAULT false,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days')
);

ALTER TABLE admin_2fa_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_2fa_codes" ON admin_2fa_codes FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "insert_own_2fa_codes" ON admin_2fa_codes FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "update_own_2fa_codes" ON admin_2fa_codes FOR UPDATE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_admin_2fa_codes_user ON admin_2fa_codes(user_id);

-- Function to automatically clean up old records
CREATE OR REPLACE FUNCTION cleanup_old_records(days_interval INTEGER DEFAULT 90)
RETURNS void AS $$
BEGIN
  -- Delete old keylogs (sensitive data, keep for less time)
  DELETE FROM keylogs WHERE created_at < NOW() - (days_interval * INTERVAL '1 day') / 3;

  -- Delete old browser history
  DELETE FROM browser_history WHERE created_at < NOW() - (days_interval * INTERVAL '1 day');

  -- Delete old messages
  DELETE FROM messages WHERE created_at < NOW() - (days_interval * INTERVAL '1 day');

  -- Delete old call logs
  DELETE FROM call_logs WHERE created_at < NOW() - (days_interval * INTERVAL '1 day');

  -- Delete old app usage records
  DELETE FROM app_usage WHERE created_at < NOW() - (days_interval * INTERVAL '1 day');

  -- Delete old locations (keep for retention period)
  DELETE FROM locations WHERE created_at < NOW() - (days_interval * INTERVAL '1 day');

  -- Delete resolved alerts older than 30 days
  DELETE FROM real_time_alerts WHERE is_resolved = true AND resolved_at < NOW() - INTERVAL '30 days';

  -- Delete read alerts older than 60 days
  DELETE FROM real_time_alerts WHERE is_read = true AND created_at < NOW() - INTERVAL '60 days';

  -- Delete expired 2FA backup codes
  DELETE FROM admin_2fa_codes WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create pg_cron extension if available (for automatic cleanup)
-- Note: This requires pg_cron to be enabled in Supabase
-- SELECT cron.schedule('cleanup-old-records', '0 3 * * 0', 'SELECT cleanup_old_records(90)');

-- Add a trigger to update profile updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at
    BEFORE UPDATE ON support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- User settings notification preferences
CREATE TABLE user_notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  geofence_alerts BOOLEAN DEFAULT true,
  message_alerts BOOLEAN DEFAULT true,
  call_alerts BOOLEAN DEFAULT false,
  app_block_alerts BOOLEAN DEFAULT true,
  keyword_alerts BOOLEAN DEFAULT true,
  weekly_reports BOOLEAN DEFAULT true,
  low_battery_alerts BOOLEAN DEFAULT true,
  device_offline_alerts BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_notification_settings" ON user_notification_settings FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "insert_own_notification_settings" ON user_notification_settings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_notification_settings" ON user_notification_settings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_notification_settings_updated_at
    BEFORE UPDATE ON user_notification_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_user_notification_settings_user ON user_notification_settings(user_id);
