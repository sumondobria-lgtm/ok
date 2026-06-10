import { useEffect, useState } from 'react';
import { supabase, Device, CallLog } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import { Phone, Search, Download, ChevronLeft, ChevronRight, Loader2, PhoneIncoming, PhoneOutgoing, PhoneMissed } from 'lucide-react';

export function CallLogsView() {
  const { } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [callType, setCallType] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    fetchDevices();
  }, []);

  useEffect(() => {
    if (selectedDevice) {
      fetchCalls();
    }
  }, [selectedDevice, search, callType, currentPage]);

  const fetchDevices = async () => {
    const { data } = await supabase.from('devices').select('*').order('created_at', { ascending: false });
    if (data && data.length > 0) {
      setDevices(data as Device[]);
      setSelectedDevice(data[0] as Device);
    }
    setLoading(false);
  };

  const fetchCalls = async () => {
    if (!selectedDevice) return;
    setLoading(true);

    let query = supabase
      .from('call_logs')
      .select('*', { count: 'exact' })
      .eq('device_id', selectedDevice.id)
      .order('timestamp', { ascending: false });

    if (callType !== 'all') {
      query = query.eq('call_type', callType);
    }
    if (search) {
      query = query.or(`contact_name.ilike.%${search}%,phone_number.ilike.%${search}%`);
    }

    query = query.range((currentPage - 1) * pageSize, currentPage * pageSize - 1);

    const { data, count } = await query;
    setCalls((data || []) as CallLog[]);
    setTotalCount(count || 0);
    setLoading(false);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const exportToCSV = () => {
    if (calls.length === 0) return;
    const headers = ['Contact', 'Phone', 'Type', 'Duration', 'Timestamp'];
    const rows = calls.map((c) => [
      c.contact_name || 'Unknown',
      c.phone_number,
      c.call_type,
      formatDuration(c.duration),
      format(new Date(c.timestamp), 'PPp'),
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `call_logs_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getCallIcon = (type: string) => {
    switch (type) {
      case 'incoming':
        return <PhoneIncoming className="w-5 h-5" />;
      case 'outgoing':
        return <PhoneOutgoing className="w-5 h-5" />;
      case 'missed':
        return <PhoneMissed className="w-5 h-5" />;
      default:
        return <Phone className="w-5 h-5" />;
    }
  };

  const getCallColor = (type: string) => {
    switch (type) {
      case 'incoming':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-500';
      case 'outgoing':
        return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500';
      case 'missed':
        return 'bg-red-100 dark:bg-red-900/30 text-red-500';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-500';
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Call Logs</h1>
          <p className="text-gray-500 dark:text-gray-400">View all incoming, outgoing, and missed calls</p>
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
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-slate-700"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
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
              placeholder="Search contacts or numbers..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg"
            />
          </div>
          <select
            value={callType}
            onChange={(e) => {
              setCallType(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg"
          >
            <option value="all">All Calls</option>
            <option value="incoming">Incoming</option>
            <option value="outgoing">Outgoing</option>
            <option value="missed">Missed</option>
          </select>
        </div>
      </div>

      {/* Call List */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          </div>
        ) : calls.length > 0 ? (
          <>
            <div className="divide-y divide-gray-200 dark:divide-slate-700">
              {calls.map((call) => (
                <div key={call.id} className="p-4 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getCallColor(call.call_type)}`}>
                    {getCallIcon(call.call_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {call.contact_name || call.phone_number}
                    </p>
                    {call.contact_name && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">{call.phone_number}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {call.call_type === 'missed' ? 'Missed' : formatDuration(call.duration)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {format(new Date(call.timestamp), 'PPp')}
                    </p>
                  </div>
                </div>
              ))}
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
            <Phone className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No call logs found</p>
          </div>
        )}
      </div>
    </div>
  );
}
