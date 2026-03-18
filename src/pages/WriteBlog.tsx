import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { SC, Blog } from '../lib/store';

export default function WriteBlogPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', content: '', category: 'Technology' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const blogs = SC.get<Blog>('blogs');
    const newBlog: Blog = {
      id: Date.now(),
      title: form.title,
      content: form.content,
      author: 'Student User',
      date: new Date().toLocaleDateString('en-CA'),
      category: form.category,
      readTime: `${Math.max(1, Math.ceil(form.content.split(' ').length / 200))} min`,
    };
    blogs.unshift(newBlog);
    SC.set('blogs', blogs);
    navigate('/readblog');
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="glass-card p-8">
          <h1 className="text-2xl font-bold mb-6">Write a Blog</h1>
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
            <button type="submit" className="btn-primary w-full py-3"><i className="fas fa-paper-plane" /> Publish Blog</button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
