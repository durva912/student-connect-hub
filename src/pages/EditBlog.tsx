import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { SC, Blog } from '../lib/store';

export default function EditBlogPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const id = Number(params.get('id'));
  const [form, setForm] = useState({ title: '', content: '', category: 'Technology' });

  useEffect(() => {
    const blogs = SC.get<Blog>('blogs');
    const blog = blogs.find(b => b.id === id);
    if (blog) setForm({ title: blog.title, content: blog.content, category: blog.category });
  }, [id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const blogs = SC.get<Blog>('blogs').map(b =>
      b.id === id ? { ...b, title: form.title, content: form.content, category: form.category, readTime: `${Math.max(1, Math.ceil(form.content.split(' ').length / 200))} min` } : b
    );
    SC.set('blogs', blogs);
    navigate(`/read_blog?id=${id}`);
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="glass-card p-8">
          <h1 className="text-2xl font-bold mb-6">Edit Blog</h1>
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
            <button type="submit" className="btn-primary w-full py-3"><i className="fas fa-save" /> Save Changes</button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
