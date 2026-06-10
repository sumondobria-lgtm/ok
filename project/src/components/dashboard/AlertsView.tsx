import { useEffect, useState } from 'react';
import { supabase, Device, RealTimeAlert, KeywordAlert } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { format } from 'date-fns';
import { Bell, MapPin, Battery, Wifi, Lock, TriangleAlert as AlertTriangle, CircleCheck as CheckCircle, Trash2, Plus, Search, RefreshCw, Loader as Loader2, ListFilter as Filter, Eye } from 'lucide-react';

export function AlertsView() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [devices, setDevices] = useState<Device[]>([]);
  const [alerts, setAlerts] = useState<RealTimeAlert[]>([]);
  const [keywords, setKeywords] = useState<KeywordAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'alerts' | 'keywords'>('alerts');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [showKeywordModal, setShowKeywordModal] = useState(false);
  const [newKeyword, setNewKeyword] = useState({
    keyword: '',
    is_case_sensitive: false,
    alert_severity: 'normal' as 'low' | 'normal' | 'high' | 'critical',
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('real_time_alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'real_time_alerts',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setAlerts((prev) => [payload.new as RealTimeAlert, ...prev]);
          showToast('info', (payload.new as RealTimeAlert).title);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, showToast]);

  const fetchData = async () => {
    setLoading(true);

    const { data: devicesData } = await supabase
      .from('devices')
      .select('*')
      .order('created_at', { ascending: false });
    setDevices((devicesData || []) as Device[]);

    const { data: alertsData } = await supabase
      .from('real_time_alerts')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });
    setAlerts((alertsData || []) as RealTimeAlert[]);

    const { data: keywordsData } = await supabase
      .from('keyword_alerts')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });
    setKeywords((keywordsData || []) as KeywordAlert[]);

    setLoading(false);
  };

  const markAsRead = async (alertId: string) => {
    const { error } = await supabase
      .from('real_time_alerts')
      .update({ is_read: true })
      .eq('id', alertId);

    if (!error) {
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, is_read: true } : a))
      );
    }
  };

  const resolveAlert = async (alertId: string) => {
    const { error } = await supabase
      .from('real_time_alerts')
      .update({
        is_resolved: true,
        resolved_at: new Date().toISOString(),
        resolved_by: user!.id,
      })
      .eq('id', alertId);

    if (!error) {
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === alertId
            ? { ...a, is_resolved: true, resolved_at: new Date().toISOString()!, resolved_by: user!.id }
            : a
        )
      );
      showToast('success', 'Alert resolved');
    }
  };

  const deleteAlert = async (alertId: string) => {
    if (!confirm('Are you sure you want to delete this alert?')) return;

    const { error } = await supabase
      .from('real_time_alerts')
      .delete()
      .eq('id', alertId);

    if (!error) {
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      showToast('success', 'Alert deleted');
    }
  };

  const markAllAsRead = async () => {
    const { error } = await supabase
      .from('real_time_alerts')
      .update({ is_read: true })
      .eq('user_id', user!.id)
      .eq('is_read', false);

    if (!error) {
      setAlerts((prev) => prev.map((a) => ({ ...a, is_read: true })));
      showToast('success', 'All alerts marked as read');
    }
  };

  const addKeyword = async () => {
    if (!newKeyword.keyword.trim()) {
      showToast('error', 'Please enter a keyword');
      return;
    }

    const { error } = await supabase.from('keyword_alerts').insert({
      user_id: user!.id,
      keyword: newKeyword.keyword,
      is_case_sensitive: newKeyword.is_case_sensitive,
      alert_severity: newKeyword.alert_severity,
    });

    if (error) {
      showToast('error', error.message);
    } else {
      showToast('success', 'Keyword alert added');
      setShowKeywordModal(false);
      setNewKeyword({
        keyword: '',
        is_case_sensitive: false,
        alert_severity: 'normal',
      });
      fetchData();
    }
  };

  const toggleKeyword = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from('keyword_alerts')
      .update({ is_active: !isActive })
      .eq('id', id);

    if (!error) {
      setKeywords((prev) =>
        prev.map((k) => (k.id === id ? { ...k, is_active: !isActive } : k))
      );
    }
  };

  const deleteKeyword = async (id: string) => {
    if (!confirm('Are you sure you want to delete this keyword alert?')) return;

    const { error } = await supabase
      .from('keyword_alerts')
      .delete()
      .eq('id', id);

    if (!error) {
      setKeywords((prev) => prev.filter((k) => k.id !== id));
      showToast('success', 'Keyword alert deleted');
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'geofence_enter':
      case 'geofence_exit':
        return <MapPin className="w-5 h-5" />;
      case 'keyword':
        return <Search className="w-5 h-5" />;
      case 'suspicious_app':
        return <AlertTriangle className="w-5 h-5" />;
      case 'blocked_access':
        return <Lock className="w-5 h-5" />;
      case 'low_battery':
        return <Battery className="w-5 h-5" />;
      case 'device_offline':
        return <Wifi className="w-5 h-5" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400';
      case 'high':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400';
      case 'normal':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400';
      case 'low':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
    }
  };

  const filteredAlerts = alerts.filter((alert) => {
    if (filterSeverity !== 'all' && alert.severity !== filterSeverity) return false;
    if (filterType !== 'all' && alert.alert_type !== filterType) return false;
    return true;
  });

  const unreadCount = alerts.filter((a) => !a.is_read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Real-Time Alerts</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Monitor alerts and keyword triggers from your devices
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <RefreshCw className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 text-sm"
            >
              Mark All Read ({unreadCount})
            </button>
          )}
        </div>
      </div>

      <div className="border-b border-gray-200 dark:border-slate-700">
        <nav className="flex gap-4 -mb-px">
          <button
            onClick={() => setActiveTab('alerts')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'alerts'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Alerts
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
                  {unreadCount}
                </span>
              )}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('keywords')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'keywords'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              Keyword Alerts
            </span>
          </button>
        </nav>
      </div>

      {activeTab === 'alerts' && (
        <>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm"
                >
                  <option value="all">All Types</option>
                  <option value="geofence_enter">Geofence Enter</option>
                  <option value="geofence_exit">Geofence Exit</option>
                  <option value="keyword">Keyword Detected</option>
                  <option value="suspicious_app">Suspicious App</option>
                  <option value="blocked_access">Blocked Access</option>
                  <option value="low_battery">Low Battery</option>
                  <option value="device_offline">Device Offline</option>
                </select>
              </div>
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="normal">Normal</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
            {filteredAlerts.length > 0 ? (
              <div className="divide-y divide-gray-200 dark:divide-slate-700">
                {filteredAlerts.map((alert) => {
                  const device = devices.find((d) => d.id === alert.device_id);

                  return (
                    <div
                      key={alert.id}
                      className={`p-4 ${!alert.is_read ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : ''}`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getSeverityColor(alert.severity)}`}>
                          {getAlertIcon(alert.alert_type)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                              {alert.title}
                            </h3>
                            {!alert.is_read && (
                              <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                            )}
                            {alert.is_resolved && (
                              <span className="px-2 py-0.5 text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full">
                                Resolved
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                            {alert.message}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                            <span>{device?.device_name || 'Unknown Device'}</span>
                            <span className={`capitalize ${
                              alert.severity === 'critical' ? 'text-red-500' :
                              alert.severity === 'high' ? 'text-orange-500' : ''
                            }`}>
                              {alert.severity} severity
                            </span>
                            <span>{format(new Date(alert.created_at), 'PPp')}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {!alert.is_read && (
                            <button
                              onClick={() => markAsRead(alert.id)}
                              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                              title="Mark as read"
                            >
                              <Eye className="w-4 h-4 text-gray-500" />
                            </button>
                          )}
                          {!alert.is_resolved && (
                            <button
                              onClick={() => resolveAlert(alert.id)}
                              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                              title="Resolve"
                            >
                              <CheckCircle className="w-4 h-4 text-emerald-500" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteAlert(alert.id)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <Bell className="w-12 h-12 text-gray-400 mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No alerts found</p>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'keywords' && (
        <>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Get notified when specific keywords appear in messages or keylogs
              </p>
              <button
                onClick={() => setShowKeywordModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Keyword
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
            {keywords.length > 0 ? (
              <div className="divide-y divide-gray-200 dark:divide-slate-700">
                {keywords.map((kw) => (
                  <div key={kw.id} className="p-4 flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          "{kw.keyword}"
                        </span>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${getSeverityColor(kw.alert_severity)}`}>
                          {kw.alert_severity}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {kw.is_case_sensitive ? 'Case sensitive' : 'Case insensitive'}
                        {' • '}Added {format(new Date(kw.created_at), 'PP')}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleKeyword(kw.id, kw.is_active)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        kw.is_active ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                          kw.is_active ? 'left-7' : 'left-1'
                        }`}
                      />
                    </button>
                    <button
                      onClick={() => deleteKeyword(kw.id)}
                      className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <Search className="w-12 h-12 text-gray-400 mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  No keyword alerts configured
                </p>
                <button
                  onClick={() => setShowKeywordModal(true)}
                  className="mt-4 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 text-sm"
                >
                  Add your first keyword
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {showKeywordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowKeywordModal(false)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md p-6 z-10">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Add Keyword Alert
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Keyword
                </label>
                <input
                  type="text"
                  value={newKeyword.keyword}
                  onChange={(e) => setNewKeyword({ ...newKeyword, keyword: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg"
                  placeholder="e.g., homework, school, location"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Severity
                </label>
                <select
                  value={newKeyword.alert_severity}
                  onChange={(e) =>
                    setNewKeyword({
                      ...newKeyword,
                      alert_severity: e.target.value as 'low' | 'normal' | 'high' | 'critical',
                    })
                  }
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newKeyword.is_case_sensitive}
                  onChange={(e) => setNewKeyword({ ...newKeyword, is_case_sensitive: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Case sensitive matching
                </span>
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowKeywordModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={addKeyword}
                className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
              >
                Add Keyword
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
