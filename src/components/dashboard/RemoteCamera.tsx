import { useEffect, useState } from 'react';
import { supabase, Device, RemoteCapture } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import { Camera, Camera as CameraIcon, Video, RefreshCw, Download, RotateCcw, Loader as Loader2, AlertTriangle, Info, Play } from 'lucide-react';

export function RemoteCamera() {
  const { } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [captures, setCaptures] = useState<RemoteCapture[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState<'front' | 'back'>('back');

  useEffect(() => {
    fetchDevices();
  }, []);

  useEffect(() => {
    if (selectedDevice) {
      fetchCaptures();
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

  const fetchCaptures = async () => {
    if (!selectedDevice) return;
    const { data } = await supabase
      .from('remote_captures')
      .select('*')
      .eq('device_id', selectedDevice.id)
      .order('timestamp', { ascending: false })
      .limit(50);
    setCaptures((data || []) as RemoteCapture[]);
  };

  const triggerCapture = async (type: 'photo' | 'video') => {
    if (!selectedDevice) return;
    setTriggering(true);

    const newCapture = {
      device_id: selectedDevice.id,
      capture_type: type,
      camera: selectedCamera,
      file_url: '',
      status: 'pending' as const,
      timestamp: new Date().toISOString(),
    };

    const { error } = await supabase.from('remote_captures').insert(newCapture);

    if (!error) {
      await fetchCaptures();
    }
    setTriggering(false);
  };

  const downloadCapture = (capture: RemoteCapture) => {
    if (!capture.file_url) return;
    const a = document.createElement('a');
    a.href = capture.file_url;
    const ext = capture.capture_type === 'video' ? 'mp4' : 'jpg';
    a.download = `capture_${format(new Date(capture.timestamp), 'yyyy-MM-dd_HH-mm-ss')}.${ext}`;
    a.click();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="px-2 py-1 text-xs rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">Completed</span>;
      case 'capturing':
        return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">Capturing</span>;
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Remote Camera</h1>
          <p className="text-gray-500 dark:text-gray-400">Capture photos and videos remotely</p>
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
              Remote camera activation may violate privacy laws in your jurisdiction. Ensure you have proper
              authorization and consent before using this feature. This feature should only be used for legitimate
              parental monitoring purposes. FamilyGuard is not responsible for misuse of this feature.
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
              <strong>Android:</strong> Supported on Android 5.0+. Front and back camera available.<br />
              <strong>iOS:</strong> Limited support. Only works when app is in foreground due to iOS privacy restrictions.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-6">
        <div className="flex flex-col items-center justify-center py-6">
          <div className="flex items-center gap-2 mb-6">
            <button
              onClick={() => setSelectedCamera('back')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedCamera === 'back'
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              <Camera className="w-4 h-4" />
              Back Camera
            </button>
            <button
              onClick={() => setSelectedCamera('front')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedCamera === 'front'
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              <RotateCcw className="w-4 h-4" />
              Front Camera
            </button>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => triggerCapture('photo')}
              disabled={triggering || !selectedDevice}
              className="flex flex-col items-center gap-2 px-8 py-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/25"
            >
              {triggering ? (
                <Loader2 className="w-8 h-8 animate-spin" />
              ) : (
                <CameraIcon className="w-8 h-8" />
              )}
              <span>Photo</span>
            </button>
            <button
              onClick={() => triggerCapture('video')}
              disabled={triggering || !selectedDevice}
              className="flex flex-col items-center gap-2 px-8 py-6 bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-xl font-medium hover:from-rose-600 hover:to-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-rose-500/25"
            >
              {triggering ? (
                <Loader2 className="w-8 h-8 animate-spin" />
              ) : (
                <Video className="w-8 h-8" />
              )}
              <span>Video (30s)</span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white">Capture History</h3>
          <button
            onClick={fetchCaptures}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          </div>
        ) : captures.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 p-2">
            {captures.map((capture) => (
              <div key={capture.id} className="group relative aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-slate-700">
                {capture.thumbnail_url || capture.file_url ? (
                  <img
                    src={capture.thumbnail_url || capture.file_url}
                    alt={`Capture ${format(new Date(capture.timestamp), 'PPp')}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                  {getStatusBadge(capture.status)}
                  <div className="text-white text-xs text-center">
                    <p>{format(new Date(capture.timestamp), 'p')}</p>
                    <p>{format(new Date(capture.timestamp), 'PP')}</p>
                  </div>
                  {capture.status === 'completed' && capture.file_url && (
                    <button
                      onClick={() => downloadCapture(capture)}
                      className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                    >
                      <Download className="w-5 h-5 text-white" />
                    </button>
                  )}
                </div>
                {capture.capture_type === 'video' && capture.status === 'completed' && (
                  <div className="absolute top-2 left-2">
                    <Play className="w-5 h-5 text-white drop-shadow" />
                  </div>
                )}
                <div className="absolute bottom-2 right-2">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    capture.camera === 'front' ? 'bg-blue-500' : 'bg-gray-700'
                  } text-white`}>
                    {capture.camera}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <CameraIcon className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No captures yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
