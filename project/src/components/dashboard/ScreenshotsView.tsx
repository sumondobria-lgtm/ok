import { useEffect, useState } from 'react';
import { supabase, Device, Screenshot } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import {
  CameraIcon,
  RefreshCw,
  Download,
  Loader2,
  AlertTriangle,
  Info,
  Image as ImageIcon,
  ZoomIn,
  X,
} from 'lucide-react';

export function ScreenshotsView() {
  const { } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [selectedImage, setSelectedImage] = useState<Screenshot | null>(null);

  useEffect(() => {
    fetchDevices();
  }, []);

  useEffect(() => {
    if (selectedDevice) {
      fetchScreenshots();
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

  const fetchScreenshots = async () => {
    if (!selectedDevice) return;
    const { data } = await supabase
      .from('screenshots')
      .select('*')
      .eq('device_id', selectedDevice.id)
      .order('timestamp', { ascending: false })
      .limit(100);
    setScreenshots((data || []) as Screenshot[]);
  };

  const triggerScreenshot = async () => {
    if (!selectedDevice) return;
    setTriggering(true);

    const newScreenshot = {
      device_id: selectedDevice.id,
      file_url: '',
      status: 'pending' as const,
      timestamp: new Date().toISOString(),
    };

    const { error } = await supabase.from('screenshots').insert(newScreenshot);

    if (!error) {
      await fetchScreenshots();
    }
    setTriggering(false);
  };

  const downloadScreenshot = (screenshot: Screenshot) => {
    if (!screenshot.file_url) return;
    const a = document.createElement('a');
    a.href = screenshot.file_url;
    a.download = `screenshot_${format(new Date(screenshot.timestamp), 'yyyy-MM-dd_HH-mm-ss')}.png`;
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Live Screenshots</h1>
          <p className="text-gray-500 dark:text-gray-400">Capture device screen remotely</p>
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

      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200">Legal Compliance Notice</h3>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              Screenshot capture captures all content visible on the device screen, potentially including
              sensitive information, passwords, and private communications. Ensure you have proper authorization
              before using this feature. FamilyGuard is not responsible for misuse of this feature.
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
              <strong>Android:</strong> Requires Android 5.0+. Uses MediaProjection API. User consent may be required
              on Android 10+ due to privacy enhancements.<br />
              <strong>iOS:</strong> Not supported due to iOS restrictions. Apple does not allow apps to capture screen content.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-6">
        <div className="flex flex-col items-center justify-center py-6">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={triggerScreenshot}
              disabled={triggering || !selectedDevice}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/25"
            >
              {triggering ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Capturing...
                </>
              ) : (
                <>
                  <CameraIcon className="w-5 h-5" />
                  Capture Screenshot
                </>
              )}
            </button>
            <button
              onClick={fetchScreenshots}
              className="flex items-center gap-2 px-4 py-3 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">Screenshot Gallery</h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          </div>
        ) : screenshots.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 p-2">
            {screenshots.map((ss) => (
              <div key={ss.id} className="group relative aspect-video rounded-lg overflow-hidden bg-gray-100 dark:bg-slate-700">
                {ss.thumbnail_url || ss.file_url ? (
                  <img
                    src={ss.thumbnail_url || ss.file_url}
                    alt={`Screenshot ${format(new Date(ss.timestamp), 'PPp')}`}
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => setSelectedImage(ss)}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                  {getStatusBadge(ss.status)}
                  <div className="text-white text-xs text-center">
                    <p>{format(new Date(ss.timestamp), 'p')}</p>
                    <p>{format(new Date(ss.timestamp), 'PP')}</p>
                  </div>
                  {ss.status === 'completed' && ss.file_url && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadScreenshot(ss);
                      }}
                      className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                    >
                      <Download className="w-5 h-5 text-white" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <ImageIcon className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No screenshots captured yet</p>
          </div>
        )}
      </div>

      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
            <img
              src={selectedImage.file_url}
              alt="Full screenshot"
              className="w-full h-full object-contain rounded-lg"
            />
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between bg-black/50 backdrop-blur-sm rounded-lg px-4 py-3">
              <div className="text-white text-sm">
                <p className="font-medium">{format(new Date(selectedImage.timestamp), 'PPp')}</p>
              </div>
              <button
                onClick={() => downloadScreenshot(selectedImage)}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-white text-sm font-medium transition-colors"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
