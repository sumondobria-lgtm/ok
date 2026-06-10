import { useEffect, useState } from 'react';
import { supabase, Device, AppUsage, BlockedItem } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { AppWindow, Search, Lock, Unlock, Clock, BarChart3, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function AppUsageView() {
  const { } = useAuth();
  const { showToast } = useToast();
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [apps, setApps] = useState<AppUsage[]>([]);
  const [blockedApps, setBlockedApps] = useState<BlockedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'chart'>('list');

  useEffect(() => {
    fetchDevices();
  }, []);

  useEffect(() => {
    if (selectedDevice) {
      fetchApps();
      fetchBlockedApps();
    }
  }, [selectedDevice]);

  const fetchDevices = async () => {
    const { data } = await supabase.from('devices').select('*').order('created_at', { ascending: false });
    if (data && data.length > 0) {
      setDevices(data as Device[]);
      setSelectedDevice(data[0] as Device);
    }
    setLoading(false);
  };

  const fetchApps = async () => {
    if (!selectedDevice) return;
    const { data } = await supabase
      .from('app_usage')
      .select('*')
      .eq('device_id', selectedDevice.id)
      .order('usage_duration', { ascending: false });
    setApps((data || []) as AppUsage[]);
  };

  const fetchBlockedApps = async () => {
    if (!selectedDevice) return;
    const { data } = await supabase
      .from('blocked_items')
      .select('*')
      .eq('device_id', selectedDevice.id)
      .eq('item_type', 'app');
    setBlockedApps((data || []) as BlockedItem[]);
  };

  const toggleBlock = async (app: AppUsage) => {
    const isBlocked = blockedApps.some((b) => b.item_value === app.package_name);

    if (isBlocked) {
      const blockItem = blockedApps.find((b) => b.item_value === app.package_name);
      if (blockItem) {
        await supabase.from('blocked_items').delete().eq('id', blockItem.id);
        showToast('success', `${app.app_name} has been unblocked`);
      }
    } else {
      await supabase.from('blocked_items').insert({
        device_id: selectedDevice!.id,
        item_type: 'app',
        item_value: app.package_name,
        reason: 'Blocked by parent',
      });
      showToast('success', `${app.app_name} has been blocked`);
    }
    fetchBlockedApps();
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const filteredApps = apps.filter(
    (app) =>
      app.app_name.toLowerCase().includes(search.toLowerCase()) ||
      app.package_name.toLowerCase().includes(search.toLowerCase())
  );

  const chartData = apps.slice(0, 10).map((app) => ({
    name: app.app_name.length > 10 ? app.app_name.substring(0, 10) + '...' : app.app_name,
    duration: Math.round(app.usage_duration / 60),
    fullName: app.app_name,
  }));

  const totalScreenTime = apps.reduce((acc, app) => acc + app.usage_duration, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">App Usage</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Monitor and manage app usage on the target device
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedDevice?.id || ''}
            onChange={(e) => setSelectedDevice(devices.find((d) => d.id === e.target.value) || null)}
            className="px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm"
          >
            {devices.map((device) => (
              <option key={device.id} value={device.id}>
                {device.device_name}
              </option>
            ))}
          </select>
          <div className="flex bg-gray-100 dark:bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-700 shadow-sm'
                  : ''
              }`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('chart')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                viewMode === 'chart'
                  ? 'bg-white dark:bg-slate-700 shadow-sm'
                  : ''
              }`}
            >
              Chart
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Clock className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Screen Time</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {Math.floor(totalScreenTime / 3600)}h {Math.floor((totalScreenTime % 3600) / 60)}m
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <AppWindow className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Apps Used</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{apps.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <Lock className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Blocked Apps</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{blockedApps.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search apps..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg"
          />
        </div>
      </div>

      {/* Chart View */}
      {viewMode === 'chart' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-500" />
            Top 10 Apps by Usage (minutes)
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <YAxis dataKey="name" type="category" tick={{ fill: '#9ca3af', fontSize: 12 }} width={100} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#f1f5f9' }}
                  itemStyle={{ color: '#10b981' }}
                  formatter={(value) => [`${value} minutes`, 'Usage']}
                  labelFormatter={(label, payload) => payload[0]?.payload?.fullName || label}
                />
                <Bar dataKey="duration" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-200 dark:divide-slate-700">
            {filteredApps.length > 0 ? (
              filteredApps.map((app) => {
                const isBlocked = blockedApps.some((b) => b.item_value === app.package_name);
                const maxDuration = apps[0]?.usage_duration || 1;
                const percentage = (app.usage_duration / maxDuration) * 100;

                return (
                  <div key={app.id} className="p-4">
                    <div className="flex items-center gap-4 mb-2">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isBlocked
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-500'
                          : 'bg-gray-100 dark:bg-slate-700 text-gray-500'
                      }`}>
                        <AppWindow className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{app.app_name}</p>
                          {isBlocked && (
                            <span className="px-2 py-0.5 text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full">
                              Blocked
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{app.package_name}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatDuration(app.usage_duration)}
                        </p>
                      </div>
                      <button
                        onClick={() => toggleBlock(app)}
                        className={`p-2 rounded-lg transition-colors ${
                          isBlocked
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-500 hover:bg-red-200 dark:hover:bg-red-900/50'
                            : 'bg-gray-100 dark:bg-slate-700 text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-600'
                        }`}
                      >
                        {isBlocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                      </button>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          isBlocked ? 'bg-red-500' : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <AppWindow className="w-12 h-12 text-gray-400 mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No apps found</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
