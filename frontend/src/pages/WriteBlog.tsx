import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { apiPost, getAuthToken, type BlogListItem } from '@/lib/api';

export default function WriteBlogPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', content: '', category: 'Technology' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!getAuthToken()) {
      navigate('/login');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await apiPost<BlogListItem>('/api/blogs', {
        title: form.title.trim(),
        content: form.content,
        category: form.category,
      });
      navigate('/readblog');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not publish');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="glass-card p-8">
          <h1 className="text-2xl font-bold mb-6">Write a Blog</h1>
          {!getAuthToken() && (
            <p className="text-sm mb-4 p-3 rounded-lg" style={{ background: 'rgba(234,179,8,0.12)' }}>
              <Link to="/login" className="font-semibold underline">Log in</Link> to publish a blog.
            </p>
          )}
          {error && (
            <div className="text-sm mb-4 p-3 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input className="glass-input" required placeholder="Your blog title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select className="glass-input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                <option>Technology</option>
                <option>Campus Life</option>
                <option>Resources</option>
                <option>Career</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Content</label>
              <textarea className="glass-input" rows={12} required placeholder="Write your blog..." value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} />
            </div>
            <button type="submit" disabled={saving || !getAuthToken()} className="btn-primary w-full py-3 disabled:opacity-50">
              <i className="fas fa-paper-plane" /> {saving ? 'Publishing…' : 'Publish Blog'}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
