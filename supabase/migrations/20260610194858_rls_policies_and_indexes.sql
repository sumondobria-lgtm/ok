-- Comprehensive RLS policies for all tables

-- Profiles: users can read/update their own profile
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id);

CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

-- Admins can read all profiles
CREATE POLICY "admin_read_profiles" ON profiles FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Devices: users own their devices
CREATE POLICY "select_own_devices" ON devices FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "insert_own_devices" ON devices FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_devices" ON devices FOR UPDATE
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "delete_own_devices" ON devices FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Locations
CREATE POLICY "select_own_locations" ON locations FOR SELECT
  TO authenticated USING (
    device_id IN (SELECT id FROM devices WHERE user_id = auth.uid())
  );

CREATE POLICY "insert_own_locations" ON locations FOR INSERT
  TO authenticated WITH CHECK (
    device_id IN (SELECT id FROM devices WHERE user_id = auth.uid())
  );

-- Geofences
CREATE POLICY "select_own_geofences" ON geofences FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "insert_own_geofences" ON geofences FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_geofences" ON geofences FOR UPDATE
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "delete_own_geofences" ON geofences FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Geofence alerts
CREATE POLICY "select_own_geofence_alerts" ON geofence_alerts FOR SELECT
  TO authenticated USING (
    device_id IN (SELECT id FROM devices WHERE user_id = auth.uid())
  );

CREATE POLICY "insert_own_geofence_alerts" ON geofence_alerts FOR INSERT
  TO authenticated WITH CHECK (
    device_id IN (SELECT id FROM devices WHERE user_id = auth.uid())
  );

-- Messages
CREATE POLICY "select_own_messages" ON messages FOR SELECT
  TO authenticated USING (
    device_id IN (SELECT id FROM devices WHERE user_id = auth.uid())
  );

CREATE POLICY "insert_own_messages" ON messages FOR INSERT
  TO authenticated WITH CHECK (
    device_id IN (SELECT id FROM devices WHERE user_id = auth.uid())
  );

-- Call logs
CREATE POLICY "select_own_call_logs" ON call_logs FOR SELECT
  TO authenticated USING (
    device_id IN (SELECT id FROM devices WHERE user_id = auth.uid())
  );

CREATE POLICY "insert_own_call_logs" ON call_logs FOR INSERT
  TO authenticated WITH CHECK (
    device_id IN (SELECT id FROM devices WHERE user_id = auth.uid())
  );

-- App usage
CREATE POLICY "select_own_app_usage" ON app_usage FOR SELECT
  TO authenticated USING (
    device_id IN (SELECT id FROM devices WHERE user_id = auth.uid())
  );

CREATE POLICY "insert_own_app_usage" ON app_usage FOR INSERT
  TO authenticated WITH CHECK (
    device_id IN (SELECT id FROM devices WHERE user_id = auth.uid())
  );

CREATE POLICY "update_own_app_usage" ON app_usage FOR UPDATE
  TO authenticated USING (
    device_id IN (SELECT id FROM devices WHERE user_id = auth.uid())
  );

-- Keylogs
CREATE POLICY "select_own_keylogs" ON keylogs FOR SELECT
  TO authenticated USING (
    device_id IN (SELECT id FROM devices WHERE user_id = auth.uid())
  );

CREATE POLICY "insert_own_keylogs" ON keylogs FOR INSERT
  TO authenticated WITH CHECK (
    device_id IN (SELECT id FROM devices WHERE user_id = auth.uid())
  );

-- Browser history
CREATE POLICY "select_own_browser_history" ON browser_history FOR SELECT
  TO authenticated USING (
    device_id IN (SELECT id FROM devices WHERE user_id = auth.uid())
  );

CREATE POLICY "insert_own_browser_history" ON browser_history FOR INSERT
  TO authenticated WITH CHECK (
    device_id IN (SELECT id FROM devices WHERE user_id = auth.uid())
  );

CREATE POLICY "update_own_browser_history" ON browser_history FOR UPDATE
  TO authenticated USING (
    device_id IN (SELECT id FROM devices WHERE user_id = auth.uid())
  );

-- Media files
CREATE POLICY "select_own_media_files" ON media_files FOR SELECT
  TO authenticated USING (
    device_id IN (SELECT id FROM devices WHERE user_id = auth.uid())
  );

CREATE POLICY "insert_own_media_files" ON media_files FOR INSERT
  TO authenticated WITH CHECK (
    device_id IN (SELECT id FROM devices WHERE user_id = auth.uid())
  );

CREATE POLICY "delete_own_media_files" ON media_files FOR DELETE
  TO authenticated USING (
    device_id IN (SELECT id FROM devices WHERE user_id = auth.uid())
  );

-- Subscriptions
CREATE POLICY "select_own_subscriptions" ON subscriptions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "insert_own_subscriptions" ON subscriptions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "admin_read_subscriptions" ON subscriptions FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Support tickets
CREATE POLICY "select_own_support_tickets" ON support_tickets FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "insert_own_support_tickets" ON support_tickets FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_support_tickets" ON support_tickets FOR UPDATE
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "admin_manage_support_tickets" ON support_tickets FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- System logs - admin only
CREATE POLICY "admin_read_system_logs" ON system_logs FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Blocked items
CREATE POLICY "select_own_blocked_items" ON blocked_items FOR SELECT
  TO authenticated USING (
    device_id IN (SELECT id FROM devices WHERE user_id = auth.uid())
  );

CREATE POLICY "insert_own_blocked_items" ON blocked_items FOR INSERT
  TO authenticated WITH CHECK (
    device_id IN (SELECT id FROM devices WHERE user_id = auth.uid())
  );

CREATE POLICY "delete_own_blocked_items" ON blocked_items FOR DELETE
  TO authenticated USING (
    device_id IN (SELECT id FROM devices WHERE user_id = auth.uid())
  );

-- Additional indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_devices_is_online ON devices(is_online);
CREATE INDEX IF NOT EXISTS idx_devices_last_sync ON devices(last_sync DESC);
CREATE INDEX IF NOT EXISTS idx_locations_device_timestamp ON locations(device_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_messages_device_timestamp ON messages(device_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_call_logs_device_timestamp ON call_logs(device_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_geofences_device_active ON geofences(device_id, is_active);