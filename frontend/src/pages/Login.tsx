import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiPost, saveSession, type AuthResponse } from '@/lib/api';
import { SC, defaultProfile } from '@/lib/store';

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.email || !form.password) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      const auth = await apiPost<AuthResponse>('/api/auth/login', {
        email: form.email.trim(),
        password: form.password,
      });
      saveSession(auth);
      const existing = SC.getOne<typeof defaultProfile>('profile');
      SC.setOne('profile', {
        ...(existing ?? defaultProfile),
        name: auth.user.name,
        email: auth.user.email,
      });
      navigate('/homepage');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-card p-8 w-full max-w-md animate-fade-in">
        <h1 className="text-2xl font-bold text-center mb-2" style={{ color: 'var(--color-primary)' }}>Welcome Back</h1>
        <p className="text-sm text-center opacity-60 mb-8">Log in to your StudentConnect account</p>
        {error && <div className="p-3 rounded-lg mb-4 text-sm text-center" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input className="glass-input" type="email" placeholder="you@kjsit.edu.in" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <div className="relative">
              <input className="glass-input pr-10" type={showPw ? 'text' : 'password'} placeholder="••••••••" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100" onClick={() => setShowPw(!showPw)}>
                <i className={`fas fa-eye${showPw ? '-slash' : ''}`} />
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full py-3 disabled:opacity-60">
            <i className="fas fa-sign-in-alt" /> {loading ? 'Signing in…' : 'Log In'}
          </button>
        </form>
        <p className="text-sm text-center mt-6 opacity-60">
          Don't have an account? <Link to="/signup" className="font-semibold" style={{ color: 'var(--color-primary)' }}>Sign Up</Link>
        </p>
      </div>
    </div>
  );
}
