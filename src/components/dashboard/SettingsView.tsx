import { useEffect, useState } from 'react';
import { supabase, Subscription } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useTheme } from '../../contexts/ThemeContext';
import {
  User,
  Lock,
  CreditCard,
  Bell,
  Moon,
  Sun,
  Save,
  Loader2,
  CheckCircle,
  Calendar,
} from 'lucide-react';
import { format } from 'date-fns';

export function SettingsView() {
  const { user, profile, updateProfile } = useAuth();
  const { showToast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'subscription' | 'notifications'>('profile');
  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        fullName: profile.full_name || '',
        email: profile.email,
      });
    }
    if (user) {
      fetchSubscription();
    }
  }, [profile, user]);

  const fetchSubscription = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    if (data) {
      setSubscription(data as Subscription);
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    const { error } = await updateProfile({
      full_name: formData.fullName,
    });
    if (error) {
      showToast('error', error.message);
    } else {
      showToast('success', 'Profile updated successfully');
    }
    setLoading(false);
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast('error', 'Passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      showToast('error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: passwordForm.newPassword,
    });
    if (error) {
      showToast('error', error.message);
    } else {
      showToast('success', 'Password changed successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    }
    setLoading(false);
  };

  const planDetails = {
    basic: { price: 29.99, features: ['Location Tracking', 'Messages Monitoring', 'Call Logs', '5GB Storage'] },
    premium: { price: 49.99, features: ['All Basic Features', 'App Usage Tracking', 'Browser History', 'Keylogger', '10GB Storage'] },
    family: { price: 69.99, features: ['All Premium Features', 'Up to 5 Devices', 'Priority Support', 'Unlimited Storage'] },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Account Settings</h1>
        <p className="text-gray-500 dark:text-gray-400">Manage your account and preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-64 flex-shrink-0">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <nav className="divide-y divide-gray-200 dark:divide-slate-700">
              <button
                onClick={() => setActiveTab('profile')}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                  activeTab === 'profile'
                    ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                }`}
              >
                <User className="w-5 h-5" />
                Profile
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                  activeTab === 'security'
                    ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                }`}
              >
                <Lock className="w-5 h-5" />
                Security
              </button>
              <button
                onClick={() => setActiveTab('subscription')}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                  activeTab === 'subscription'
                    ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                }`}
              >
                <CreditCard className="w-5 h-5" />
                Subscription
              </button>
              <button
                onClick={() => setActiveTab('notifications')}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                  activeTab === 'notifications'
                    ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                }`}
              >
                <Bell className="w-5 h-5" />
                Notifications
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Profile Information</h2>
              <div className="space-y-6">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-2xl font-bold">
                    {formData.fullName?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <p className="text-lg font-medium text-gray-900 dark:text-white">{formData.fullName || 'User'}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{formData.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Full Name</label>
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      disabled
                      className="w-full px-4 py-2 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg disabled:opacity-50"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <button
                    onClick={handleSaveProfile}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Change Password</h2>
                <div className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">New Password</label>
                    <input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Confirm New Password</label>
                    <input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg"
                    />
                  </div>
                  <button
                    onClick={handleChangePassword}
                    disabled={loading || !passwordForm.newPassword}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                    Change Password
                  </button>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Appearance</h2>
                <div className="flex items-center justify-between max-w-md">
                  <div className="flex items-center gap-3">
                    {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Dark Mode</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Currently using {theme} theme
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={toggleTheme}
                    className="relative w-12 h-6 rounded-full bg-gray-200 dark:bg-emerald-500 transition-colors"
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                        theme === 'dark' ? 'left-7' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Subscription Tab */}
          {activeTab === 'subscription' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Current Plan</h2>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    profile?.subscription_status === 'active'
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}>
                    {profile?.subscription_status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {subscription ? (
                  <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-lg font-bold">
                        {subscription.plan_type.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                          {subscription.plan_type} Plan
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          ${subscription.price}/month
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
                      <Calendar className="w-4 h-4" />
                      Renews on {format(new Date(subscription.end_date), 'PP')}
                    </div>
                    <button className="text-sm text-red-500 hover:text-red-600">Cancel Subscription</button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">No active subscription</p>
                    <button className="mt-4 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600">
                      Choose a Plan
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Available Plans</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(planDetails).map(([key, plan]) => (
                    <div
                      key={key}
                      className={`border rounded-lg p-6 ${
                        profile?.subscription_plan === key
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10'
                          : 'border-gray-200 dark:border-slate-700'
                      }`}
                    >
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white capitalize mb-2">{key}</h3>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                        ${plan.price}
                        <span className="text-sm font-normal text-gray-500 dark:text-gray-400">/mo</span>
                      </p>
                      <ul className="space-y-2 mb-4">
                        {plan.features.map((feature, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                      {profile?.subscription_plan === key ? (
                        <span className="block text-center text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                          Current Plan
                        </span>
                      ) : (
                        <button className="w-full py-2 border border-emerald-500 text-emerald-500 rounded-lg hover:bg-emerald-500 hover:text-white transition-colors">
                          {profile?.subscription_plan ? 'Upgrade' : 'Subscribe'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Notification Preferences</h2>
              <div className="space-y-4">
                {[
                  { label: 'Geofence Alerts', desc: 'Get notified when device enters/exits geofenced areas' },
                  { label: 'New Message Alerts', desc: 'Receive alerts for new SMS and social messages' },
                  { label: 'Call Notifications', desc: 'Get notified about incoming/outgoing calls' },
                  { label: 'App Block Alerts', desc: 'Receive alerts when blocked apps are accessed' },
                  { label: 'Weekly Reports', desc: 'Receive weekly summary of device activity' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-slate-700 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{item.label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{item.desc}</p>
                    </div>
                    <label className="relative cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-10 h-5 bg-gray-200 dark:bg-slate-700 rounded-full peer peer-checked:bg-emerald-500 transition-colors" />
                      <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow peer-checked:translate-x-5 transition-transform" />
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
