import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { SC, UserProfile, defaultProfile } from '../lib/store';
import { apiGet, apiPut, getAuthToken } from '@/lib/api';

export default function SettingsPage() {
  const [alert, setAlert] = useState('');
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<UserProfile>(defaultProfile);
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [loadError, setLoadError] = useState('');

  const showAlert = (msg: string) => {
    setAlert(msg);
    setTimeout(() => setAlert(''), 3000);
  };

  useEffect(() => {
    setLoading(true);
    setLoadError('');

    const token = getAuthToken();
    if (token) {
      apiGet<UserProfile>('/api/profile')
        .then((profile) => {
          setForm(profile);
          SC.setOne('profile', profile);
        })
        .catch(() => {
          const saved = SC.getOne<UserProfile>('profile');
          if (saved) setForm(saved);
          setLoadError('Could not load profile from server; showing saved copy if any.');
        })
        .finally(() => setLoading(false));
    } else {
      const saved = SC.getOne<UserProfile>('profile');
      if (saved) setForm(saved);
      setLoading(false);
    }
  }, []);

  const handleSave = async () => {
    try {
      if (getAuthToken()) {
        const saved = await apiPut<UserProfile>('/api/profile', form);
        setForm(saved);
        SC.setOne('profile', saved);
      } else {
        SC.setOne('profile', form);
      }
      showAlert('Settings saved successfully!');
    } catch (err) {
      showAlert(err instanceof Error ? err.message : 'Could not save settings');
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        {alert && (
          <div className="toast-notification" style={{ background: 'rgba(16,185,129,0.9)', color: 'white' }}>
            <i className="fas fa-check-circle" /> {alert}
          </div>
        )}

        <div className="glass-card p-8">
          <h1 className="text-2xl font-bold mb-6">Settings</h1>
          {loading && <p className="text-sm opacity-60 mb-4">Loading profile…</p>}
          {loadError && (
            <div className="text-sm mb-4 p-3 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
              {loadError}
            </div>
          )}

          <div className="space-y-6">
            <section>
              <h2 className="font-bold text-sm mb-4 opacity-60 uppercase tracking-wider">Account</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Display Name</label>
                  <input
                    className="glass-input"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    className="glass-input"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
              </div>
            </section>

            <section>
              <h2 className="font-bold text-sm mb-4 opacity-60 uppercase tracking-wider">Change Password</h2>
              <div className="space-y-3">
                <input
                  className="glass-input"
                  type="password"
                  placeholder="Current password"
                  value={passwords.current}
                  onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                />
                <input
                  className="glass-input"
                  type="password"
                  placeholder="New password"
                  value={passwords.next}
                  onChange={(e) => setPasswords({ ...passwords, next: e.target.value })}
                />
                <input
                  className="glass-input"
                  type="password"
                  placeholder="Confirm new password"
                  value={passwords.confirm}
                  onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                />
              </div>
            </section>

            <div className="flex gap-3">
              <button className="btn-primary flex-1" type="button" onClick={handleSave}>
                <i className="fas fa-save" /> Save Changes
              </button>
              <button
                className="btn-secondary"
                type="button"
                onClick={() => {
                  const saved = SC.getOne<UserProfile>('profile');
                  if (saved) setForm(saved);
                  showAlert('Changes discarded.');
                }}
              >
                Cancel
              </button>
            </div>

            <section className="pt-6 border-t border-white/10">
              <h2 className="font-bold text-sm mb-4 uppercase tracking-wider" style={{ color: '#ef4444' }}>Danger Zone</h2>
              <button className="w-full p-3 rounded-lg text-sm font-medium text-left hover:bg-red-500/10 transition" style={{ color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
                <i className="fas fa-trash mr-2" /> Delete Account
              </button>
            </section>
          </div>
        </div>
      </div>
    </Layout>
  );
}
