import { useEffect, useState, useRef } from 'react';
import { supabase, Device } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import { Mic, Play, Square, Loader as Loader2, TriangleAlert as AlertTriangle, Volume2, Clock, Smartphone, RefreshCw, Download, Info } from 'lucide-react';

type AmbientRecording = {
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

export function SurroundListening() {
  const { } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [recordings, setRecordings] = useState<AmbientRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchDevices();
  }, []);

  useEffect(() => {
    if (selectedDevice) {
      fetchRecordings();
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

  const fetchRecordings = async () => {
    if (!selectedDevice) return;
    const { data } = await supabase
      .from('ambient_recordings')
      .select('*')
      .eq('device_id', selectedDevice.id)
      .order('timestamp', { ascending: false })
      .limit(50);
    setRecordings((data || []) as AmbientRecording[]);
  };

  const triggerRecording = async () => {
    if (!selectedDevice) return;
    setTriggering(true);

    const newRecording = {
      device_id: selectedDevice.id,
      duration_seconds: 30,
      file_url: '',
      status: 'pending' as const,
      triggered_by: 'remote' as const,
      timestamp: new Date().toISOString(),
    };

    const { error } = await supabase.from('ambient_recordings').insert(newRecording);

    if (!error) {
      await fetchRecordings();
    }
    setTriggering(false);
  };

  const playRecording = (recording: AmbientRecording) => {
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

  const downloadRecording = (recording: AmbientRecording) => {
    if (!recording.file_url) return;
    const a = document.createElement('a');
    a.href = recording.file_url;
    a.download = `ambient_${format(new Date(recording.timestamp), 'yyyy-MM-dd_HH-mm-ss')}.m4a`;
    a.click();
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Surroundings Listening</h1>
          <p className="text-gray-500 dark:text-gray-400">Trigger ambient audio recordings</p>
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

      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200">Legal Compliance Notice</h3>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              Ambient audio recording may be subject to local, state, and federal laws regarding surveillance and
              consent. Ensure you have proper authorization before using this feature. Some jurisdictions require
              all-party consent for audio recordings. FamilyGuard is not responsible for misuse of this feature.
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
              <strong>Android:</strong> Requires Android 9 or lower for ambient recording. Android 10+ restricts
              background audio recording for privacy reasons.<br />
              <strong>iOS:</strong> Not supported due to iOS privacy restrictions.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-6">
        <div className="flex flex-col items-center justify-center py-8">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/25">
            <Mic className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Start Ambient Recording</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-md mb-6">
            Trigger a 30-second ambient audio recording on {selectedDevice?.device_name || 'the selected device'}.
            The device will record surrounding sounds and upload the audio file.
          </p>
          <button
            onClick={triggerRecording}
            disabled={triggering || !selectedDevice}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg font-medium hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/25"
          >
            {triggering ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Triggering...
              </>
            ) : (
              <>
                <Mic className="w-5 h-5" />
                Start Recording
              </>
            )}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white">Recording History</h3>
          <button
            onClick={fetchRecordings}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          </div>
        ) : recordings.length > 0 ? (
          <div className="divide-y divide-gray-200 dark:divide-slate-700">
            {recordings.map((rec) => (
              <div key={rec.id} className="p-4 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                  rec.status === 'completed'
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                    : rec.status === 'recording'
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}>
                  {rec.status === 'recording' ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <Volume2 className="w-6 h-6" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {rec.duration_seconds}s Recording
                    </span>
                    {getStatusBadge(rec.status)}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(rec.timestamp), 'PPp')}
                    </span>
                    {rec.file_size && (
                      <span>{formatFileSize(rec.file_size)}</span>
                    )}
                    <span className="flex items-center gap-1">
                      <Smartphone className="w-3 h-3" />
                      {selectedDevice?.device_name}
                    </span>
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
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <Mic className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No recordings yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
