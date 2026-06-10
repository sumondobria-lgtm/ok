import { useEffect, useState } from 'react';
import { supabase, Device, Location, Geofence, GeofenceAlert } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { format, subDays } from 'date-fns';
import { MapPin, Plus, Trash2, Clock, Bell, AlertCircle, Loader2 } from 'lucide-react';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 100);
  }, [map]);
  return null;
}

export function LocationTracking() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [alerts, setAlerts] = useState<GeofenceAlert[]>([]);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month'>('today');
  const [showGeofenceModal, setShowGeofenceModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newGeofence, setNewGeofence] = useState({
    name: '',
    latitude: 0,
    longitude: 0,
    radius: 100,
    notify_on_enter: true,
    notify_on_exit: true,
  });

  useEffect(() => {
    fetchDevices();
  }, []);

  useEffect(() => {
    if (selectedDevice) {
      fetchLocations();
      fetchGeofences();
      fetchAlerts();
    }
  }, [selectedDevice, dateRange]);

  const fetchDevices = async () => {
    const { data } = await supabase.from('devices').select('*').order('created_at', { ascending: false });
    if (data && data.length > 0) {
      setDevices(data as Device[]);
      setSelectedDevice(data[0] as Device);
    }
    setLoading(false);
  };

  const fetchLocations = async () => {
    if (!selectedDevice) return;
    const now = new Date();
    let startDate: Date;
    switch (dateRange) {
      case 'today':
        startDate = subDays(now, 1);
        break;
      case 'week':
        startDate = subDays(now, 7);
        break;
      case 'month':
        startDate = subDays(now, 30);
        break;
    }
    const { data } = await supabase
      .from('locations')
      .select('*')
      .eq('device_id', selectedDevice.id)
      .gte('timestamp', startDate.toISOString())
      .order('timestamp', { ascending: false });
    setLocations((data || []) as Location[]);
  };

  const fetchGeofences = async () => {
    if (!selectedDevice || !user) return;
    const { data } = await supabase
      .from('geofences')
      .select('*')
      .eq('device_id', selectedDevice.id);
    setGeofences((data || []) as Geofence[]);
  };

  const fetchAlerts = async () => {
    if (!selectedDevice || !user) return;
    const { data } = await supabase
      .from('geofence_alerts')
      .select('*')
      .eq('device_id', selectedDevice.id)
      .order('timestamp', { ascending: false })
      .limit(20);
    setAlerts((data || []) as GeofenceAlert[]);
  };

  const handleAddGeofence = async () => {
    if (!selectedDevice || !user) return;
    if (!newGeofence.name || !newGeofence.latitude || !newGeofence.longitude) {
      showToast('error', 'Please fill in all fields');
      return;
    }

    const { error } = await supabase.from('geofences').insert({
      user_id: user.id,
      device_id: selectedDevice.id,
      name: newGeofence.name,
      latitude: newGeofence.latitude,
      longitude: newGeofence.longitude,
      radius: newGeofence.radius,
      notify_on_enter: newGeofence.notify_on_enter,
      notify_on_exit: newGeofence.notify_on_exit,
    });

    if (error) {
      showToast('error', error.message);
    } else {
      showToast('success', 'Geofence created successfully');
      setShowGeofenceModal(false);
      setNewGeofence({ name: '', latitude: 0, longitude: 0, radius: 100, notify_on_enter: true, notify_on_exit: true });
      fetchGeofences();
    }
  };

  const handleDeleteGeofence = async (id: string) => {
    if (!confirm('Are you sure you want to delete this geofence?')) return;
    const { error } = await supabase.from('geofences').delete().eq('id', id);
    if (error) {
      showToast('error', error.message);
    } else {
      showToast('success', 'Geofence deleted');
      fetchGeofences();
    }
  };

  const latestLocation = locations[0];
  const mapCenter: [number, number] = latestLocation
    ? [latestLocation.latitude, latestLocation.longitude]
    : [0, 0];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (devices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <MapPin className="w-16 h-16 text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Devices</h2>
        <p className="text-gray-500">Connect a device to start tracking locations.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Location Tracking</h1>
          <p className="text-gray-500 dark:text-gray-400">Monitor device location and set geofences</p>
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
          <div className="flex bg-gray-100 dark:bg-slate-800 rounded-lg p-1">
            {(['today', 'week', 'month'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  dateRange === range
                    ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowGeofenceModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Geofence
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="h-96">
            {latestLocation && (
              <MapContainer center={mapCenter} zoom={14} style={{ height: '100%', width: '100%' }}>
                <MapResizer />
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {geofences.map((gf) => (
                  <Circle
                    key={gf.id}
                    center={[gf.latitude, gf.longitude]}
                    radius={gf.radius}
                    pathOptions={{
                      color: gf.is_active ? '#10b981' : '#9ca3af',
                      fillColor: gf.is_active ? '#10b981' : '#9ca3af',
                      fillOpacity: 0.15,
                    }}
                  >
                    <Popup>{gf.name}</Popup>
                  </Circle>
                ))}
                {locations.map((loc) => (
                  <Marker key={loc.id} position={[loc.latitude, loc.longitude]}>
                    <Popup>
                      <div className="text-sm">
                        <p className="font-medium">{format(new Date(loc.timestamp), 'PPp')}</p>
                        {loc.address && <p className="text-gray-500">{loc.address}</p>}
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            )}
          </div>
        </div>

        {/* Geofences List */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
          <div className="p-5 border-b border-gray-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Geofences</h2>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-slate-700 max-h-72 overflow-y-auto">
            {geofences.length > 0 ? (
              geofences.map((gf) => (
                <div key={gf.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{gf.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Radius: {gf.radius}m • {gf.is_active ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteGeofence(gf.id)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">No geofences set</div>
            )}
          </div>
        </div>
      </div>

      {/* Location History */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
        <div className="p-5 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-500" />
            Location History
          </h2>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-slate-700 max-h-96 overflow-y-auto">
          {locations.length > 0 ? (
            locations.map((loc) => (
              <div key={loc.id} className="p-4 flex items-center gap-4">
                <MapPin className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 dark:text-white">
                    {loc.latitude.toFixed(6)}, {loc.longitude.toFixed(6)}
                  </p>
                  {loc.address && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{loc.address}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm text-gray-900 dark:text-white">{format(new Date(loc.timestamp), 'p')}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{format(new Date(loc.timestamp), 'PP')}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">No location history</div>
          )}
        </div>
      </div>

      {/* Recent Alerts */}
      {alerts.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
          <div className="p-5 border-b border-gray-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-500" />
              Geofence Alerts
            </h2>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-slate-700">
            {alerts.map((alert) => {
              const gf = geofences.find((g) => g.id === alert.geofence_id);
              return (
                <div key={alert.id} className="p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    alert.event_type === 'entered'
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-500'
                  }`}>
                    {alert.event_type === 'entered' ? <MapPin className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {gf?.name || 'Unknown Geofence'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Device {alert.event_type === 'entered' ? 'entered' : 'exited'} the area
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {format(new Date(alert.timestamp), 'PPp')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Geofence Modal */}
      {showGeofenceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowGeofenceModal(false)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md p-6 z-10">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Add Geofence</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                <input
                  type="text"
                  value={newGeofence.name}
                  onChange={(e) => setNewGeofence({ ...newGeofence, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg"
                  placeholder="Home, School, etc."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={newGeofence.latitude || latestLocation?.latitude || ''}
                    onChange={(e) => setNewGeofence({ ...newGeofence, latitude: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={newGeofence.longitude || latestLocation?.longitude || ''}
                    onChange={(e) => setNewGeofence({ ...newGeofence, longitude: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Radius (meters)</label>
                <input
                  type="number"
                  value={newGeofence.radius}
                  onChange={(e) => setNewGeofence({ ...newGeofence, radius: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg"
                />
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newGeofence.notify_on_enter}
                    onChange={(e) => setNewGeofence({ ...newGeofence, notify_on_enter: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Notify on Enter</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newGeofence.notify_on_exit}
                    onChange={(e) => setNewGeofence({ ...newGeofence, notify_on_exit: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Notify on Exit</span>
                </label>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowGeofenceModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleAddGeofence}
                className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
              >
                Create Geofence
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
