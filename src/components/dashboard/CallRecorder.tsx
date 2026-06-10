import { useEffect, useState, useRef } from 'react';
import { supabase, Device, CallRecording } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import { Phone, PhoneIncoming, PhoneOutgoing, Play, Square, Loader as Loader2, AlertTriangle, Info, RefreshCw, Download, Clock, Search } from 'lucide-react';

export function CallRecorder() {
  const { } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [recordings, setRecordings] = useState<CallRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchDevices();
  }, []);

  useEffect(() => {
    if (selectedDevice) {
      fetchRecordings();
    }
  }, [selectedDevice, search]);

  const fetchDevices = async () => {
    const { data } = await supabase.from('devices').select('*').order('created_at', { ascending: false });
    if (data && data.length > 0) {
      setDevices(data as Device[]);
      setSelectedDevice(data[0] as Device);
    }
    setLoading(false);
  };

  const fetchRecordings = async () => {
    if (!selectedDevice) return;
    setLoading(true);

    let query = supabase
      .from('call_recordings')
      .select('*')
      .eq('device_id', selectedDevice.id)
      .order('timestamp', { ascending: false });

    if (search) {
      query = query.or(`contact_name.ilike.%${search}%,phone_number.ilike.%${search}%`);
    }

    const { data } = await query.limit(100);
    setRecordings((data || []) as CallRecording[]);
    setLoading(false);
  };

  const playRecording = (recording: CallRecording) => {
    if (currentlyPlaying === recording.id) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setCurrentlyPlaying(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (recording.file_url) {
        audioRef.current = new Audio(recording.file_url);
        audioRef.current.onended = () => setCurrentlyPlaying(null);
        audioRef.current.play();
        setCurrentlyPlaying(recording.id);
      }
    }
  };

  const downloadRecording = (recording: CallRecording) => {
    if (!recording.file_url) return;
    const a = document.createElement('a');
    a.href = recording.file_url;
    a.download = `call_${format(new Date(recording.timestamp), 'yyyy-MM-dd_HH-mm-ss')}.m4a`;
    a.click();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="px-2 py-1 text-xs rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">Completed</span>;
      case 'recording':
        return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">Recording</span>;
      case 'pending':
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400">Pending</span>;
      case 'failed':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">Failed</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Call Recorder</h1>
          <p className="text-gray-500 dark:text-gray-400">Listen to recorded phone calls</p>
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

      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-red-800 dark:text-red-200">Legal Warning - Phone Call Recording</h3>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
              Recording phone calls may be illegal in your jurisdiction without proper consent. Many regions
              require one-party or all-party consent for call recording. Ensure you have proper authorization
              before enabling or using this feature. FamilyGuard is not responsible for misuse of this feature
              or any legal consequences arising from its use.
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
              <strong>Android:</strong> Requires Android 8 or lower for automatic call recording. Android 9+ restricts
              background call recording for privacy reasons. May require accessibility services.<br />
              <strong>iOS:</strong> Not supported due to iOS privacy restrictions. Apple does not allow apps to record calls.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by contact name or phone number..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg"
            />
          </div>
          <button
            onClick={fetchRecordings}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <RefreshCw className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          </div>
        ) : recordings.length > 0 ? (
          <div className="divide-y divide-gray-200 dark:divide-slate-700">
            {recordings.map((rec) => (
              <div key={rec.id} className="p-4 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                  rec.call_type === 'incoming'
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                }`}>
                  {rec.call_type === 'incoming' ? (
                    <PhoneIncoming className="w-6 h-6" />
                  ) : (
                    <PhoneOutgoing className="w-6 h-6" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {rec.contact_name || rec.phone_number}
                    </span>
                    {getStatusBadge(rec.status)}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    {rec.contact_name && (
                      <span>{rec.phone_number}</span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDuration(rec.duration)}
                    </span>
                    <span>{format(new Date(rec.timestamp), 'PPp')}</span>
                    {rec.file_size && (
                      <span>{formatFileSize(rec.file_size)}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {rec.status === 'completed' && rec.file_url && (
                    <>
                      <button
                        onClick={() => playRecording(rec)}
                        className={`p-2 rounded-lg transition-colors ${
                          currentlyPlaying === rec.id
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                            : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {currentlyPlaying === rec.id ? (
                          <Square className="w-5 h-5" />
                        ) : (
                          <Play className="w-5 h-5" />
                        )}
                      </button>
                      <button
                        onClick={() => downloadRecording(rec)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-gray-500 dark:text-gray-400"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Phone className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No call recordings found</p>
          </div>
        )}
      </div>
    </div>
  );
}
