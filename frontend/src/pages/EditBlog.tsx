import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { apiGet, apiPut, getAuthToken, getAuthUser, type BlogDetail } from '@/lib/api';

export default function EditBlogPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const id = Number(params.get('id'));
  const [form, setForm] = useState({ title: '', content: '', category: 'Technology' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    if (!getAuthToken()) {
      navigate('/login');
      return;
    }
    if (!Number.isFinite(id) || id < 1) {
      setError('Invalid blog');
      setLoading(false);
      return;
    }
    const me = getAuthUser();
    apiGet<BlogDetail>(`/api/blogs/${id}`)
      .then((b) => {
        if (!me || b.author_id !== me.id) {
          setError('You can only edit your own blogs');
          return;
        }
        setForm({ title: b.title, content: b.content, category: b.category });
        setCanEdit(true);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load blog'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await apiPut<BlogDetail>(`/api/blogs/${id}`, {
        title: form.title.trim(),
        content: form.content,
        category: form.category,
      });
      navigate(`/read_blog?id=${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto text-center p-16 opacity-60">Loading…</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="glass-card p-8">
          <Link to={`/read_blog?id=${id}`} className="inline-flex items-center gap-2 text-sm mb-4 opacity-70 hover:opacity-100">
            <i className="fas fa-arrow-left" /> Back to blog
          </Link>
          <h1 className="text-2xl font-bold mb-6">Edit Blog</h1>
          {error && (
            <div className="text-sm mb-4 p-3 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>{error}</div>
          )}
          {canEdit && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input className="glass-input" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
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
                <textarea className="glass-input" rows={12} required value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} />
              </div>
              <button type="submit" disabled={saving} className="btn-primary w-full py-3 disabled:opacity-50">
                <i className="fas fa-save" /> {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </form>
          )}
        </div>
      </div>
    </Layout>
  );
}
