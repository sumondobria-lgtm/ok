-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  subscription_status TEXT DEFAULT 'none' CHECK (subscription_status IN ('none', 'active', 'expired', 'cancelled')),
  subscription_plan TEXT CHECK (subscription_plan IN ('basic', 'premium', 'family')),
  subscription_end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Devices table
CREATE TABLE devices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  device_name TEXT NOT NULL,
  device_type TEXT NOT NULL CHECK (device_type IN ('android', 'ios')),
  device_id TEXT NOT NULL UNIQUE,
  last_sync TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  battery_level INTEGER,
  is_online BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Locations table
CREATE TABLE locations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy DECIMAL(10, 2),
  address TEXT,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Geofences table
CREATE TABLE geofences (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  radius INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  notify_on_enter BOOLEAN DEFAULT true,
  notify_on_exit BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Geofence alerts table
CREATE TABLE geofence_alerts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  geofence_id UUID REFERENCES geofences(id) ON DELETE CASCADE NOT NULL,
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('entered', 'exited')),
  timestamp TIMESTAMPTZ NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages table
CREATE TABLE messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE NOT NULL,
  contact_name TEXT,
  phone_number TEXT NOT NULL,
  message_text TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('incoming', 'outgoing')),
  platform TEXT DEFAULT 'sms' CHECK (platform IN ('sms', 'whatsapp', 'telegram', 'messenger')),
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Call logs table
CREATE TABLE call_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE NOT NULL,
  contact_name TEXT,
  phone_number TEXT NOT NULL,
  duration INTEGER NOT NULL DEFAULT 0,
  call_type TEXT NOT NULL CHECK (call_type IN ('incoming', 'outgoing', 'missed')),
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- App usage table
CREATE TABLE app_usage (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE NOT NULL,
  app_name TEXT NOT NULL,
  package_name TEXT NOT NULL,
  usage_duration INTEGER NOT NULL DEFAULT 0,
  is_blocked BOOLEAN DEFAULT false,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Keylogs table
CREATE TABLE keylogs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE NOT NULL,
  text_input TEXT NOT NULL,
  app_name TEXT,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Browser history table
CREATE TABLE browser_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  title TEXT,
  visit_count INTEGER DEFAULT 1,
  is_blocked BOOLEAN DEFAULT false,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Media files table
CREATE TABLE media_files (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'video')),
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  file_size INTEGER,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('basic', 'premium', 'family')),
  price DECIMAL(10, 2) NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  stripe_payment_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Support tickets table
CREATE TABLE support_tickets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- System logs table
CREATE TABLE system_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blocked items table (websites and apps)
CREATE TABLE blocked_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('website', 'app')),
  item_value TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_devices_user_id ON devices(user_id);
CREATE INDEX idx_locations_device_id ON locations(device_id);
CREATE INDEX idx_locations_timestamp ON locations(timestamp DESC);
CREATE INDEX idx_geofences_user_id ON geofences(user_id);
CREATE INDEX idx_messages_device_id ON messages(device_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp DESC);
CREATE INDEX idx_call_logs_device_id ON call_logs(device_id);
CREATE INDEX idx_call_logs_timestamp ON call_logs(timestamp DESC);
CREATE INDEX idx_app_usage_device_id ON app_usage(device_id);
CREATE INDEX idx_keylogs_device_id ON keylogs(device_id);
CREATE INDEX idx_keylogs_timestamp ON keylogs(timestamp DESC);
CREATE INDEX idx_browser_history_device_id ON browser_history(device_id);
CREATE INDEX idx_media_files_device_id ON media_files(device_id);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);