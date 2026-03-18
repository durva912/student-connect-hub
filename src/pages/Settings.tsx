import { useState } from 'react';
import Layout from '../components/Layout';

export default function SettingsPage() {
  const [alert, setAlert] = useState('');
  const [form, setForm] = useState({ name: 'Student User', email: 'student@kjsit.edu.in', notifications: true, darkMode: false });

  const showAlert = (msg: string) => {
    setAlert(msg);
    setTimeout(() => setAlert(''), 3000);
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
          <div className="space-y-6">
            {/* Account */}
            <section>
              <h2 className="font-bold text-sm mb-4 opacity-60 uppercase tracking-wider">Account</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Display Name</label>
                  <input className="glass-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input className="glass-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
              </div>
            </section>

            {/* Preferences */}
            <section>
              <h2 className="font-bold text-sm mb-4 opacity-60 uppercase tracking-wider">Preferences</h2>
              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 rounded-lg hover:bg-white/10 transition cursor-pointer">
                  <span className="text-sm">Email Notifications</span>
                  <input type="checkbox" checked={form.notifications} onChange={e => setForm({ ...form, notifications: e.target.checked })} className="w-5 h-5 accent-blue-600" />
                </label>
              </div>
            </section>

            {/* Password */}
            <section>
              <h2 className="font-bold text-sm mb-4 opacity-60 uppercase tracking-wider">Change Password</h2>
              <div className="space-y-3">
                <input className="glass-input" type="password" placeholder="Current password" />
                <input className="glass-input" type="password" placeholder="New password" />
                <input className="glass-input" type="password" placeholder="Confirm new password" />
              </div>
            </section>

            <div className="flex gap-3">
              <button className="btn-primary flex-1" onClick={() => showAlert('Settings saved successfully!')}>
                <i className="fas fa-save" /> Save Changes
              </button>
              <button className="btn-secondary" onClick={() => showAlert('Changes discarded.')}>
                Cancel
              </button>
            </div>

            {/* Danger Zone */}
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
