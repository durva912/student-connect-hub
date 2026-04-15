import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { apiGet, apiPut, getAuthToken, getAuthUser, type FeedPostDetail } from '@/lib/api';

export default function EditPostPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const id = Number(params.get('id'));
  const [content, setContent] = useState('');
  const [image, setImage] = useState('');
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
      setError('Invalid post');
      setLoading(false);
      return;
    }
    const me = getAuthUser();
    apiGet<FeedPostDetail>(`/api/posts/${id}`)
      .then((p) => {
        if (!me || p.author_id !== me.id) {
          setError('You can only edit your own posts');
          return;
        }
        setContent(p.content);
        setImage(p.image || '');
        setCanEdit(true);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setImage(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSaving(true);
    try {
      await apiPut<FeedPostDetail>(`/api/posts/${id}`, {
        content: content.trim(),
        image: image || '',
      });
      navigate(`/viewpost?id=${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
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
          <Link to={`/viewpost?id=${id}`} className="inline-flex items-center gap-2 text-sm mb-4 opacity-70 hover:opacity-100">
            <i className="fas fa-arrow-left" /> Back to post
          </Link>
          <h1 className="text-2xl font-bold mb-6">Edit Post</h1>
          {error && (
            <div className="text-sm mb-4 p-3 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>{error}</div>
          )}
          {canEdit && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <textarea className="glass-input" rows={6} required placeholder="What's on your mind?" value={content} onChange={e => setContent(e.target.value)} />
              {image && <img src={image} alt="Preview" className="rounded-lg max-h-48 object-cover" />}
              <div className="flex gap-3">
                <label className="btn-secondary cursor-pointer text-sm">
                  <i className="fas fa-image" /> {image ? 'Change Image' : 'Add Image'}
                  <input type="file" accept="image/*" className="hidden" onChange={handleImage} />
                </label>
                {image && (
                  <button type="button" onClick={() => setImage('')} className="btn-secondary text-sm text-red-500">
                    <i className="fas fa-times" /> Remove Image
                  </button>
                )}
                <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-50">
                  <i className="fas fa-save" /> {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </Layout>
  );
}
