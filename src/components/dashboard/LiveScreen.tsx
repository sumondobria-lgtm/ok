import { useEffect, useState, useRef } from 'react';
import { supabase, Device, ScreenStreamSession } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import { MonitorPlay, Video, VideoOff, Loader as Loader2, AlertTriangle, Info, Circle, Clock } from 'lucide-react';

export function LiveScreen() {
  const { } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [sessions, setSessions] = useState<ScreenStreamSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [currentSession, setCurrentSession] = useState<ScreenStreamSession | null>(null);
  const [streamStatus, setStreamStatus] = useState<'idle' | 'connecting' | 'streaming' | 'ended'>('idle');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  useEffect(() => {
    fetchDevices();
  }, []);

  useEffect(() => {
    if (selectedDevice) {
      fetchSessions();
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

  const fetchSessions = async () => {
    if (!selectedDevice) return;
    const { data } = await supabase
      .from('screen_stream_sessions')
      .select('*')
      .eq('device_id', selectedDevice.id)
      .order('created_at', { ascending: false })
      .limit(20);
    setSessions((data || []) as ScreenStreamSession[]);
  };

  const startStream = async () => {
    if (!selectedDevice) return;
    setConnecting(true);
    setStreamStatus('connecting');

    const newSession = {
      device_id: selectedDevice.id,
      status: 'pending' as const,
    };

    const { data, error } = await supabase
      .from('screen_stream_sessions')
      .insert(newSession)
      .select()
      .single();

    if (error) {
      setStreamStatus('idle');
      setConnecting(false);
      return;
    }

    setCurrentSession(data as ScreenStreamSession);

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    peerConnectionRef.current = pc;

    pc.onicecandidate = async (event) => {
      if (event.candidate && currentSession) {
        const candidates = JSON.stringify(event.candidate.toJSON());
        await supabase
          .from('screen_stream_sessions')
          .update({ ice_candidates: candidates })
          .eq('id', currentSession.id);
      }
    };

    pc.ontrack = (event) => {
      if (videoRef.current && event.streams[0]) {
        videoRef.current.srcObject = event.streams[0];
        videoRef.current.play();
        setStreamStatus('streaming');
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setStreamStatus('streaming');
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setStreamStatus('ended');
        endStream();
      }
    };

    setConnecting(false);
  };

  const endStream = async () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (currentSession) {
      await supabase
        .from('screen_stream_sessions')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString(),
        })
        .eq('id', currentSession.id);
    }
    setStreamStatus('idle');
    setCurrentSession(null);
    fetchSessions();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'streaming':
        return <span className="px-2 py-1 text-xs rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">Live</span>;
      case 'connecting':
        return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">Connecting</span>;
      case 'pending':
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400">Pending</span>;
      case 'ended':
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">Ended</span>;
      case 'failed':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">Failed</span>;
      default:
        return null;
    }
  };

  const formatDuration = (session: ScreenStreamSession) => {
    if (!session.started_at) return 'N/A';
    const start = new Date(session.started_at).getTime();
    const end = session.ended_at ? new Date(session.ended_at).getTime() : Date.now();
    const seconds = Math.floor((end - start) / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Live Screen Streaming</h1>
          <p className="text-gray-500 dark:text-gray-400">View device screen in real-time via WebRTC</p>
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
            <h3 className="text-sm font-semibold text-red-800 dark:text-red-200">Legal Warning - Live Screen Monitoring</h3>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
              Live screen streaming captures all screen content in real-time, including sensitive information
              such as passwords, private messages, and financial data. Unauthorized use may violate privacy
              laws. Ensure you have explicit consent and proper authorization. FamilyGuard is not responsible
              for misuse of this feature.
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
              <strong>Android:</strong> Requires Android 5.0+. Uses MediaProjection API. A consent dialog will appear
              on the device when streaming starts.<br />
              <strong>iOS:</strong> Not supported due to iOS restrictions. Apple does not allow apps to capture or
              stream screen content to external viewers.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="aspect-video bg-gray-900 relative flex items-center justify-center">
          {streamStatus === 'idle' && (
            <div className="text-center">
              <MonitorPlay className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">No active stream</p>
              <button
                onClick={startStream}
                disabled={connecting || !selectedDevice}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg font-medium hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {connecting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Video className="w-5 h-5" />
                    Start Live Stream
                  </>
                )}
              </button>
            </div>
          )}
          {streamStatus === 'connecting' && (
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Establishing WebRTC connection...</p>
            </div>
          )}
          {(streamStatus === 'streaming' || streamStatus === 'ended') && (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain"
              />
              <div className="absolute top-4 left-4 flex items-center gap-2">
                {streamStatus === 'streaming' && (
                  <span className="flex items-center gap-1 px-2 py-1 bg-red-500 text-white text-xs rounded-full">
                    <Circle className="w-2 h-2 fill-current animate-pulse" />
                    LIVE
                  </span>
                )}
              </div>
              {streamStatus === 'streaming' && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                  <button
                    onClick={endStream}
                    className="flex items-center gap-2 px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
                  >
                    <VideoOff className="w-5 h-5" />
                    End Stream
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">Stream History</h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          </div>
        ) : sessions.length > 0 ? (
          <div className="divide-y divide-gray-200 dark:divide-slate-700">
            {sessions.map((session) => (
              <div key={session.id} className="p-4 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  session.status === 'streaming'
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}>
                  <MonitorPlay className="w-5 h-5" />
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      Stream Session
                    </span>
                    {getStatusBadge(session.status)}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(session.created_at), 'PPp')}
                    </span>
                    {session.started_at && (
                      <span>Duration: {formatDuration(session)}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <MonitorPlay className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No stream sessions yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
