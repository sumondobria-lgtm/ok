import { useEffect, useState } from 'react';
import { supabase, Device, MediaFile } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import { Image, Video, Search, Download, Trash2, Grid2x2 as Grid, List, ExternalLink, Loader2, X } from 'lucide-react';

export function MediaGallery() {
  const { } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'image' | 'video'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null);

  useEffect(() => {
    fetchDevices();
  }, []);

  useEffect(() => {
    if (selectedDevice) {
      fetchMedia();
    }
  }, [selectedDevice, typeFilter]);

  const fetchDevices = async () => {
    const { data } = await supabase.from('devices').select('*').order('created_at', { ascending: false });
    if (data && data.length > 0) {
      setDevices(data as Device[]);
      setSelectedDevice(data[0] as Device);
    }
    setLoading(false);
  };

  const fetchMedia = async () => {
    if (!selectedDevice) return;
    setLoading(true);

    let query = supabase
      .from('media_files')
      .select('*')
      .eq('device_id', selectedDevice.id)
      .order('timestamp', { ascending: false });

    if (typeFilter !== 'all') {
      query = query.eq('file_type', typeFilter);
    }

    const { data } = await query;
    setMedia((data || []) as MediaFile[]);
    setLoading(false);
  };

  const deleteMedia = async (id: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;
    await supabase.from('media_files').delete().eq('id', id);
    setMedia((prev) => prev.filter((m) => m.id !== id));
    setSelectedMedia(null);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filteredMedia = media.filter(
    (m) =>
      m.file_name.toLowerCase().includes(search.toLowerCase()) ||
      (m.file_type === 'image' && search.toLowerCase() === 'photo') ||
      (m.file_type === 'video' && search.toLowerCase() === 'video')
  );

  if (loading && !selectedDevice) {
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Media Gallery</h1>
          <p className="text-gray-500 dark:text-gray-400">View photos and videos from the target device</p>
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

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search files..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg"
              />
            </div>
            <div className="flex bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
              <button
                onClick={() => setTypeFilter('all')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  typeFilter === 'all' ? 'bg-white dark:bg-slate-600 shadow-sm' : ''
                }`}
              >
                All
              </button>
              <button
                onClick={() => setTypeFilter('image')}
                className={`px-3 py-1 text-sm rounded-md transition-colors flex items-center gap-1 ${
                  typeFilter === 'image' ? 'bg-white dark:bg-slate-600 shadow-sm' : ''
                }`}
              >
                <Image className="w-3 h-3" />
                Photos
              </button>
              <button
                onClick={() => setTypeFilter('video')}
                className={`px-3 py-1 text-sm rounded-md transition-colors flex items-center gap-1 ${
                  typeFilter === 'video' ? 'bg-white dark:bg-slate-600 shadow-sm' : ''
                }`}
              >
                <Video className="w-3 h-3" />
                Videos
              </button>
            </div>
          </div>
          <div className="flex bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'grid' ? 'bg-white dark:bg-slate-600 shadow-sm' : ''
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'list' ? 'bg-white dark:bg-slate-600 shadow-sm' : ''
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Files</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{media.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Photos</p>
          <p className="text-2xl font-bold text-blue-500">{media.filter((m) => m.file_type === 'image').length}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Videos</p>
          <p className="text-2xl font-bold text-purple-500">{media.filter((m) => m.file_type === 'video').length}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Size</p>
          <p className="text-2xl font-bold text-emerald-500">
            {formatSize(media.reduce((acc, m) => acc + (m.file_size || 0), 0))}
          </p>
        </div>
      </div>

      {/* Gallery */}
      {filteredMedia.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredMedia.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedMedia(item)}
                className="group relative aspect-square bg-gray-100 dark:bg-slate-800 rounded-xl overflow-hidden cursor-pointer border border-gray-200 dark:border-slate-700"
              >
                {item.file_type === 'image' ? (
                  <img
                    src={item.thumbnail_url || item.file_url}
                    alt={item.file_name}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500/20 to-blue-500/20">
                    <Video className="w-10 h-10 text-purple-500" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <ExternalLink className="w-6 h-6 text-white" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                  <p className="text-xs text-white truncate">{item.file_name}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-200 dark:divide-slate-700">
              {filteredMedia.map((item) => (
                <div key={item.id} className="p-4 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-slate-700 flex-shrink-0">
                    {item.file_type === 'image' ? (
                      <img src={item.thumbnail_url || item.file_url} alt={item.file_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500/20 to-blue-500/20">
                        <Video className="w-6 h-6 text-purple-500" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.file_name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {item.file_type} • {item.file_size ? formatSize(item.file_size) : 'Unknown size'}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {format(new Date(item.timestamp), 'PPp')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <a
                      href={item.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => deleteMedia(item.id)}
                      className="p-2 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      ) : (
        <div className="flex flex-col items-center justify-center h-64 text-center bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
          <Image className="w-12 h-12 text-gray-400 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No media files found</p>
        </div>
      )}

      {/* Media Preview Modal */}
      {selectedMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedMedia(null)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden z-10">
            <button
              onClick={() => setSelectedMedia(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-black/50 text-white rounded-full hover:bg-black/70"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex flex-col md:flex-row">
              <div className="flex-1 flex items-center justify-center bg-black min-h-64">
                {selectedMedia.file_type === 'image' ? (
                  <img src={selectedMedia.file_url} alt={selectedMedia.file_name} className="max-h-96 object-contain" />
                ) : (
                  <video src={selectedMedia.file_url} controls className="max-h-96" />
                )}
              </div>
              <div className="p-6 md:w-80 border-t md:border-t-0 md:border-l border-gray-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">File Details</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Filename</p>
                    <p className="text-sm text-gray-900 dark:text-white">{selectedMedia.file_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Type</p>
                    <p className="text-sm text-gray-900 dark:text-white capitalize">{selectedMedia.file_type}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Size</p>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {selectedMedia.file_size ? formatSize(selectedMedia.file_size) : 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Date Captured</p>
                    <p className="text-sm text-gray-900 dark:text-white">{format(new Date(selectedMedia.timestamp), 'PPp')}</p>
                  </div>
                </div>
                <div className="mt-6 flex gap-2">
                  <a
                    href={selectedMedia.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </a>
                  <button
                    onClick={() => deleteMedia(selectedMedia.id)}
                    className="px-4 py-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
