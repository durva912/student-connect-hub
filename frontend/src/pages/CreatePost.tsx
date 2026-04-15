import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { apiPost, getAuthToken, type FeedPostItem } from '@/lib/api';

export default function CreatePostPage() {
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [image, setImage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

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
    if (!getAuthToken()) {
      navigate('/login');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const row = await apiPost<FeedPostItem>('/api/posts', {
        content: content.trim(),
        image: image || '',
      });
      navigate(`/viewpost?id=${row.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="glass-card p-8">
          <h1 className="text-2xl font-bold mb-6">Create Post</h1>
          {!getAuthToken() && (
            <p className="text-sm mb-4 p-3 rounded-lg" style={{ background: 'rgba(234,179,8,0.12)' }}>
              <Link to="/login" className="font-semibold underline">Log in</Link> to create a post.
            </p>
          )}
          {error && (
            <div className="text-sm mb-4 p-3 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <textarea className="glass-input" rows={6} required placeholder="What's on your mind?" value={content} onChange={e => setContent(e.target.value)} />
            {image && <img src={image} alt="Preview" className="rounded-lg max-h-48 object-cover" />}
            <div className="flex gap-3">
              <label className="btn-secondary cursor-pointer text-sm">
                <i className="fas fa-image" /> Add Image
                <input type="file" accept="image/*" className="hidden" onChange={handleImage} />
              </label>
              <button type="submit" disabled={saving || !getAuthToken()} className="btn-primary flex-1 disabled:opacity-50">
                <i className="fas fa-paper-plane" /> {saving ? 'Posting…' : 'Post'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
