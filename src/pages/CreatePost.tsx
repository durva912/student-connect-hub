import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { SC, Post } from '../lib/store';

export default function CreatePostPage() {
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [image, setImage] = useState('');

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
    const posts = SC.get<Post>('posts');
    posts.unshift({
      id: Date.now(),
      author: 'Student User',
      avatar: '',
      content: content.trim(),
      image: image || undefined,
      date: new Date().toLocaleDateString('en-CA'),
      likes: 0,
      comments: [],
      likedByUser: false,
    });
    SC.set('posts', posts);
    navigate('/homepage');
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="glass-card p-8">
          <h1 className="text-2xl font-bold mb-6">Create Post</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <textarea className="glass-input" rows={6} required placeholder="What's on your mind?" value={content} onChange={e => setContent(e.target.value)} />
            {image && <img src={image} alt="Preview" className="rounded-lg max-h-48 object-cover" />}
            <div className="flex gap-3">
              <label className="btn-secondary cursor-pointer text-sm">
                <i className="fas fa-image" /> Add Image
                <input type="file" accept="image/*" className="hidden" onChange={handleImage} />
              </label>
              <button type="submit" className="btn-primary flex-1"><i className="fas fa-paper-plane" /> Post</button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
