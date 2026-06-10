import { useEffect, useState } from 'react';
import { supabase, Device, Message } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import { MessageSquare, Search, Download, ChevronLeft, ChevronRight, Loader2, ArrowUpRight, ArrowDownLeft, AlertTriangle, Info } from 'lucide-react';

export function MessagesView() {
  const { } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [platform, setPlatform] = useState<string>('all');
  const [type, setType] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'all' | 'whatsapp' | 'messenger'>('all');
  const pageSize = 20;

  useEffect(() => {
    fetchDevices();
  }, []);

  useEffect(() => {
    if (selectedDevice) {
      fetchMessages();
    }
  }, [selectedDevice, search, platform, type, currentPage, activeTab]);

  const fetchDevices = async () => {
    const { data } = await supabase.from('devices').select('*').order('created_at', { ascending: false });
    if (data && data.length > 0) {
      setDevices(data as Device[]);
      setSelectedDevice(data[0] as Device);
    }
    setLoading(false);
  };

  const fetchMessages = async () => {
    if (!selectedDevice) return;
    setLoading(true);

    let query = supabase
      .from('messages')
      .select('*', { count: 'exact' })
      .eq('device_id', selectedDevice.id)
      .order('timestamp', { ascending: false });

    if (activeTab !== 'all') {
      query = query.eq('platform', activeTab);
    } else if (platform !== 'all') {
      query = query.eq('platform', platform);
    }
    if (type !== 'all') {
      query = query.eq('message_type', type);
    }
    if (search) {
      query = query.or(`contact_name.ilike.%${search}%,phone_number.ilike.%${search}%,message_text.ilike.%${search}%`);
    }

    query = query.range((currentPage - 1) * pageSize, currentPage * pageSize - 1);

    const { data, count } = await query;
    setMessages((data || []) as Message[]);
    setTotalCount(count || 0);
    setLoading(false);
  };

  const exportToCSV = () => {
    if (messages.length === 0) return;
    const headers = ['Contact', 'Phone', 'Message', 'Type', 'Platform', 'Timestamp'];
    const rows = messages.map((m) => [
      m.contact_name || 'Unknown',
      m.phone_number,
      `"${m.message_text.replace(/"/g, '""')}"`,
      m.message_type,
      m.platform,
      format(new Date(m.timestamp), 'PPp'),
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `messages_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Messages</h1>
          <p className="text-gray-500 dark:text-gray-400">View SMS and social media messages</p>
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

      {/* Platform Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            setActiveTab('all');
            setPlatform('all');
            setCurrentPage(1);
          }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'all'
              ? 'bg-emerald-500 text-white'
              : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'
          }`}
        >
          All Messages
        </button>
        <button
          onClick={() => {
            setActiveTab('whatsapp');
            setPlatform('whatsapp');
            setCurrentPage(1);
          }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
            activeTab === 'whatsapp'
              ? 'bg-green-500 text-white'
              : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'
          }`}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.4-.346-.647z"/>
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.49l4.67-1.524A11.947 11.947 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.587 0-4.986-.852-6.903-2.285l-.49-.369-4.017 1.31 1.32-3.917-.364-.49A9.937 9.937 0 012 12c0-5.514 4.486-10 10-10s10 4.486 10 10-4.486 10-10 10z"/>
          </svg>
          WhatsApp
        </button>
        <button
          onClick={() => {
            setActiveTab('messenger');
            setPlatform('messenger');
            setCurrentPage(1);
          }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
            activeTab === 'messenger'
              ? 'bg-blue-500 text-white'
              : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'
          }`}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.19 5.44 3.14 7.17.16.13.26.35.27.57l.05 1.77c.03.57.61.94 1.13.71l1.98-.87c.17-.08.37-.1.55-.06.91.25 1.88.38 2.88.38 5.64 0 10-4.13 10-9.7S17.64 2 12 2zm6 7.46l-2.93 4.67c-.47.75-1.47.93-2.17.4l-2.33-1.75a.6.6 0 00-.72 0l-3.15 2.39c-.42.32-.97-.18-.69-.63l2.93-4.67c.47-.75 1.47-.93 2.17-.4l2.33 1.75a.6.6 0 00.72 0l3.15-2.39c.42-.32.97.18.69.63z"/>
          </svg>
          Messenger
        </button>
      </div>

      {/* Compliance Warnings for WhatsApp & Messenger */}
      {(activeTab === 'whatsapp' || activeTab === 'messenger') && (
        <>
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200">Privacy Notice</h3>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  Monitoring {activeTab === 'whatsapp' ? 'WhatsApp' : 'Facebook Messenger'} messages may be subject to
                  platform terms of service and local privacy laws. Ensure you have proper consent and authorization
                  before monitoring these communications.
                </p>
              </div>
            </div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200">Device Compatibility</h3>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  <strong>Android:</strong> Requires accessibility services or notification listener. Works best on
                  Android 8 and below. Android 9+ may have limited functionality due to privacy restrictions.<br />
                  <strong>iOS:</strong> Limited. Only captures messages when the app is in foreground due to iOS
                  sandbox restrictions.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

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
              placeholder="Search messages, contacts..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg"
            />
          </div>
          {activeTab === 'all' && (
            <select
              value={platform}
              onChange={(e) => {
                setPlatform(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg"
            >
              <option value="all">All Platforms</option>
              <option value="sms">SMS</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="telegram">Telegram</option>
              <option value="messenger">Messenger</option>
            </select>
          )}
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg"
          >
            <option value="all">All Types</option>
            <option value="incoming">Incoming</option>
            <option value="outgoing">Outgoing</option>
          </select>
        </div>
      </div>

      {/* Messages List */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          </div>
        ) : messages.length > 0 ? (
          <>
            <div className="divide-y divide-gray-200 dark:divide-slate-700">
              {messages.map((msg) => (
                <div key={msg.id} className="p-4 flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    msg.message_type === 'incoming'
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-500'
                      : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500'
                  }`}>
                    {msg.message_type === 'incoming' ? (
                      <ArrowDownLeft className="w-5 h-5" />
                    ) : (
                      <ArrowUpRight className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {msg.contact_name || msg.phone_number}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        msg.platform === 'sms'
                          ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                          : msg.platform === 'whatsapp'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                          : msg.platform === 'telegram'
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                      }`}>
                        {msg.platform}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{msg.message_text}</p>
                    {msg.contact_name && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{msg.phone_number}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {format(new Date(msg.timestamp), 'p')}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {format(new Date(msg.timestamp), 'PP')}
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
            <MessageSquare className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No messages found</p>
          </div>
        )}
      </div>
    </div>
  );
}
