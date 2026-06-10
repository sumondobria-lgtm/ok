import { useEffect, useState } from 'react';
import { supabase, Device, Location, Message, CallLog, AppUsage } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  MapPin,
  MessageSquare,
  Phone,
  AppWindow,
  Battery,
  Signal,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface DashboardStats {
  totalMessages: number;
  totalCalls: number;
  totalApps: number;
  lastUpdate: Date | null;
}

export function DashboardHome() {
  const { user, profile } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [latestLocation, setLatestLocation] = useState<Location | null>(null);
  const [recentMessages, setRecentMessages] = useState<Message[]>([]);
  const [recentCalls, setRecentCalls] = useState<CallLog[]>([]);
  const [topApps, setTopApps] = useState<AppUsage[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalMessages: 0,
    totalCalls: 0,
    totalApps: 0,
    lastUpdate: null,
  });
  const [loading, setLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      // Fetch devices
      const { data: devicesData } = await supabase
        .from('devices')
        .select('*')
        .order('created_at', { ascending: false });

      if (devicesData && devicesData.length > 0) {
        setDevices(devicesData as Device[]);
        const firstDevice = devicesData[0] as Device;
        setSelectedDevice(firstDevice);

        // Fetch latest location
        const { data: locationData } = await supabase
          .from('locations')
          .select('*')
          .eq('device_id', firstDevice.id)
          .order('timestamp', { ascending: false })
          .limit(1)
          .single();

        if (locationData) {
          setLatestLocation(locationData as Location);
        }

        // Fetch recent messages
        const { data: messagesData } = await supabase
          .from('messages')
          .select('*')
          .eq('device_id', firstDevice.id)
          .order('timestamp', { ascending: false })
          .limit(5);
        setRecentMessages((messagesData || []) as Message[]);

        // Fetch recent calls
        const { data: callsData } = await supabase
          .from('call_logs')
          .select('*')
          .eq('device_id', firstDevice.id)
          .order('timestamp', { ascending: false })
          .limit(5);
        setRecentCalls((callsData || []) as CallLog[]);

        // Fetch top apps
        const { data: appsData } = await supabase
          .from('app_usage')
          .select('*')
          .eq('device_id', firstDevice.id)
          .order('usage_duration', { ascending: false })
          .limit(5);
        setTopApps((appsData || []) as AppUsage[]);

        // Get counts
        const { count: msgCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('device_id', firstDevice.id);

        const { count: callCount } = await supabase
          .from('call_logs')
          .select('*', { count: 'exact', head: true })
          .eq('device_id', firstDevice.id);

        const { count: appCount } = await supabase
          .from('app_usage')
          .select('*', { count: 'exact', head: true })
          .eq('device_id', firstDevice.id);

        setStats({
          totalMessages: msgCount || 0,
          totalCalls: callCount || 0,
          totalApps: appCount || 0,
          lastUpdate: firstDevice.last_sync ? new Date(firstDevice.last_sync) : null,
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (devices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center mb-4">
          <Signal className="w-8 h-8 text-gray-400" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Devices Connected</h2>
        <p className="text-gray-500 dark:text-gray-400 max-w-md">
          You haven't connected any devices yet. Install the FamilyGuard app on the target device to start monitoring.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Welcome back, {profile?.full_name?.split(' ')[0] || 'there'}!
          </p>
        </div>
        <select
          value={selectedDevice?.id || ''}
          onChange={(e) => {
            const device = devices.find((d) => d.id === e.target.value);
            setSelectedDevice(device || null);
          }}
          className="px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm"
        >
          {devices.map((device) => (
            <option key={device.id} value={device.id}>
              {device.device_name} ({device.device_type})
            </option>
          ))}
        </select>
      </div>

      {/* Device Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Signal className={`w-6 h-6 ${selectedDevice?.is_online ? 'text-emerald-500' : 'text-gray-400'}`} />
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              selectedDevice?.is_online
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}>
              {selectedDevice?.is_online ? 'Online' : 'Offline'}
            </span>
          </div>
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Device Status</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">{selectedDevice?.device_name}</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Battery className="w-6 h-6 text-blue-500" />
            </div>
            <TrendingUp className="w-5 h-5 text-gray-400" />
          </div>
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Battery</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">{selectedDevice?.battery_level || 0}%</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-purple-500" />
            </div>
          </div>
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Messages</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">{stats.totalMessages.toLocaleString()}</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-500" />
            </div>
          </div>
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Last Sync</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {stats.lastUpdate ? formatDistanceToNow(stats.lastUpdate, { addSuffix: true }) : 'Never'}
          </p>
        </div>
      </div>

      {/* Location Map */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-500" />
            Current Location
          </h2>
        </div>
        <div className="h-64">
          {latestLocation ? (
            <MapContainer
              center={[latestLocation.latitude, latestLocation.longitude]}
              zoom={15}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={[latestLocation.latitude, latestLocation.longitude]}>
                <Popup>
                  Last seen: {format(new Date(latestLocation.timestamp), 'PPp')}
                </Popup>
              </Marker>
            </MapContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
              No location data available
            </div>
          )}
        </div>
      </div>

      {/* Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Messages */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
          <div className="p-5 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-purple-500" />
              Recent Messages
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">Last 5</span>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-slate-700">
            {recentMessages.length > 0 ? (
              recentMessages.map((msg) => (
                <div key={msg.id} className="p-4 flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    msg.message_type === 'incoming'
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-500'
                      : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500'
                  }`}>
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {msg.contact_name || msg.phone_number}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{msg.message_text}</p>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true })}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">No messages yet</div>
            )}
          </div>
        </div>

        {/* Recent Calls */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
          <div className="p-5 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Phone className="w-5 h-5 text-amber-500" />
              Recent Calls
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">Last 5</span>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-slate-700">
            {recentCalls.length > 0 ? (
              recentCalls.map((call) => (
                <div key={call.id} className="p-4 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    call.call_type === 'missed'
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-500'
                      : call.call_type === 'incoming'
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-500'
                      : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500'
                  }`}>
                    <Phone className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {call.contact_name || call.phone_number}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {call.call_type === 'missed' ? 'Missed' : `${Math.floor(call.duration / 60)}m ${call.duration % 60}s`}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {formatDistanceToNow(new Date(call.timestamp), { addSuffix: true })}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">No calls yet</div>
            )}
          </div>
        </div>
      </div>

      {/* Top Apps */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
        <div className="p-5 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <AppWindow className="w-5 h-5 text-emerald-500" />
            Top Apps by Usage
          </h2>
        </div>
        <div className="p-5">
          {topApps.length > 0 ? (
            <div className="space-y-4">
              {topApps.map((app, index) => {
                const maxDuration = topApps[0]?.usage_duration || 1;
                const percentage = (app.usage_duration / maxDuration) * 100;
                return (
                  <div key={app.id} className="flex items-center gap-4">
                    <span className="text-sm text-gray-500 dark:text-gray-400 w-6">{index + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{app.app_name}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {Math.floor(app.usage_duration / 3600)}h {Math.floor((app.usage_duration % 3600) / 60)}m
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">No app usage data</div>
          )}
        </div>
      </div>
    </div>
  );
}
