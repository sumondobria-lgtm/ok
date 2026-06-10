import { useEffect, useState } from 'react';
import { supabase, Device, BrowserHistory, BlockedItem } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { format } from 'date-fns';
import { Globe, Search, Lock, Unlock, ExternalLink, ChevronLeft, ChevronRight, Loader2, Ban } from 'lucide-react';

export function BrowserHistoryView() {
  const { } = useAuth();
  const { showToast } = useToast();
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [history, setHistory] = useState<BrowserHistory[]>([]);
  const [blockedSites, setBlockedSites] = useState<BlockedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    fetchDevices();
  }, []);

  useEffect(() => {
    if (selectedDevice) {
      fetchHistory();
      fetchBlockedSites();
    }
  }, [selectedDevice, search, currentPage]);

  const fetchDevices = async () => {
    const { data } = await supabase.from('devices').select('*').order('created_at', { ascending: false });
    if (data && data.length > 0) {
      setDevices(data as Device[]);
      setSelectedDevice(data[0] as Device);
    }
    setLoading(false);
  };

  const fetchHistory = async () => {
    if (!selectedDevice) return;
    setLoading(true);

    let query = supabase
      .from('browser_history')
      .select('*', { count: 'exact' })
      .eq('device_id', selectedDevice.id)
      .order('timestamp', { ascending: false });

    if (search) {
      query = query.or(`url.ilike.%${search}%,title.ilike.%${search}%`);
    }

    query = query.range((currentPage - 1) * pageSize, currentPage * pageSize - 1);

    const { data, count } = await query;
    setHistory((data || []) as BrowserHistory[]);
    setTotalCount(count || 0);
    setLoading(false);
  };

  const fetchBlockedSites = async () => {
    if (!selectedDevice) return;
    const { data } = await supabase
      .from('blocked_items')
      .select('*')
      .eq('device_id', selectedDevice.id)
      .eq('item_type', 'website');
    setBlockedSites((data || []) as BlockedItem[]);
  };

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  const isBlocked = (url: string) => {
    const domain = getDomain(url);
    return blockedSites.some((b) => domain.includes(b.item_value) || b.item_value.includes(domain));
  };

  const toggleBlock = async (item: BrowserHistory) => {
    const domain = getDomain(item.url);
    const alreadyBlocked = isBlocked(item.url);

    if (alreadyBlocked) {
      const blockItem = blockedSites.find((b) => domain.includes(b.item_value) || b.item_value.includes(domain));
      if (blockItem) {
        await supabase.from('blocked_items').delete().eq('id', blockItem.id);
        showToast('success', `${domain} has been unblocked`);
      }
    } else {
      await supabase.from('blocked_items').insert({
        device_id: selectedDevice!.id,
        item_type: 'website',
        item_value: domain,
        reason: 'Blocked by parent',
      });
      showToast('success', `${domain} has been blocked`);
    }
    fetchBlockedSites();
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Browser History</h1>
          <p className="text-gray-500 dark:text-gray-400">View and manage visited websites</p>
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
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Globe className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Visits</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{totalCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <Ban className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Blocked Sites</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{blockedSites.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <ExternalLink className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Unique Domains</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {new Set(history.map((h) => getDomain(h.url))).size}
              </p>
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
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search URLs or titles..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg"
          />
        </div>
      </div>

      {/* History List */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          </div>
        ) : history.length > 0 ? (
          <>
            <div className="divide-y divide-gray-200 dark:divide-slate-700">
              {history.map((item) => {
                const blocked = isBlocked(item.url);
                const domain = getDomain(item.url);

                return (
                  <div key={item.id} className="p-4 flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      blocked
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-500'
                        : 'bg-gray-100 dark:bg-slate-700 text-gray-500'
                    }`}>
                      <Globe className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {item.title || domain}
                        </p>
                        {blocked && (
                          <span className="px-2 py-0.5 text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full">
                            Blocked
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{item.url}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {item.visit_count} visit{item.visit_count !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {format(new Date(item.timestamp), 'p')}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {format(new Date(item.timestamp), 'PP')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => toggleBlock(item)}
                        className={`p-2 rounded-lg transition-colors ${
                          blocked
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-500 hover:bg-red-200 dark:hover:bg-red-900/50'
                            : 'bg-gray-100 dark:bg-slate-700 text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-600'
                        }`}
                      >
                        {blocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                );
              })}
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
            <Globe className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No browser history found</p>
          </div>
        )}
      </div>
    </div>
  );
}
