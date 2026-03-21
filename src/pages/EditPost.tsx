import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { SC, Post } from '../lib/store';

export default function EditPostPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const id = Number(params.get('id'));
  const [content, setContent] = useState('');
  const [image, setImage] = useState('');

  useEffect(() => {
    const posts = SC.get<Post>('posts');
    const post = posts.find(p => p.id === id);
    if (post) {
      setContent(post.content);
      setImage(post.image || '');
    }
  }, [id]);

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setImage(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    const posts = SC.get<Post>('posts').map(p =>
      p.id === id ? { ...p, content: content.trim(), image: image || undefined } : p
    );
    SC.set('posts', posts);
    navigate(`/viewpost?id=${id}`);
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="glass-card p-8">
          <h1 className="text-2xl font-bold mb-6">Edit Post</h1>
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
              <button type="submit" className="btn-primary flex-1"><i className="fas fa-save" /> Save Changes</button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
