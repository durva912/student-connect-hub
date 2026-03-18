import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email.includes('@')) e.email = 'Valid email is required';
    if (form.password.length < 6) e.password = 'Min 6 characters';
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      localStorage.setItem('sc_user', JSON.stringify({ name: form.name, email: form.email }));
      navigate('/createprofile');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-card p-8 w-full max-w-md animate-fade-in">
        <h1 className="text-2xl font-bold text-center mb-2" style={{ color: 'var(--color-primary)' }}>Join StudentConnect</h1>
        <p className="text-sm text-center opacity-60 mb-8">Create your account to get started</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Full Name</label>
            <input className="glass-input" placeholder="John Doe" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            {errors.name && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{errors.name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input className="glass-input" type="email" placeholder="you@kjsit.edu.in" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            {errors.email && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{errors.email}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <div className="relative">
              <input className="glass-input pr-10" type={showPw ? 'text' : 'password'} placeholder="••••••••" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100" onClick={() => setShowPw(!showPw)}>
                <i className={`fas fa-eye${showPw ? '-slash' : ''}`} />
              </button>
            </div>
            {errors.password && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{errors.password}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Confirm Password</label>
            <input className="glass-input" type="password" placeholder="••••••••" value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })} />
            {errors.confirm && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{errors.confirm}</p>}
          </div>
          <button type="submit" className="btn-primary w-full py-3">
            <i className="fas fa-user-plus" /> Create Account
          </button>
        </form>
        <p className="text-sm text-center mt-6 opacity-60">
          Already have an account? <Link to="/login" className="font-semibold" style={{ color: 'var(--color-primary)' }}>Log In</Link>
        </p>
      </div>
    </div>
  );
}
