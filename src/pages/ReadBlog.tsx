import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { SC, Blog, seedData } from '../lib/store';

export default function ReadBlogPage() {
  const [blogs, setBlogs] = useState<Blog[]>([]);

  useEffect(() => {
    seedData();
    setBlogs(SC.get<Blog>('blogs'));
  }, []);

  const deleteBlog = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this blog?')) return;
    const updated = blogs.filter(b => b.id !== id);
    SC.set('blogs', updated);
    setBlogs(updated);
  };

  return (
    <Layout>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Blogs</h1>
        <Link to="/writeblog" className="btn-primary"><i className="fas fa-pen" /> Write Blog</Link>
      </div>
      {blogs.length === 0 ? (
        <div className="text-center p-16 opacity-50">No blogs yet. Be the first to write one!</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {blogs.map(blog => (
            <Link key={blog.id} to={`/read_blog?id=${blog.id}`} className="glass-card p-6 hover:bg-white/30 transition group relative">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: 'rgba(12,69,241,0.1)', color: 'var(--color-primary)' }}>{blog.category}</span>
                <div className="flex gap-2">
                  <Link to={`/edit_blog?id=${blog.id}`} onClick={e => e.stopPropagation()} className="text-xs opacity-50 hover:opacity-100 transition p-1" title="Edit blog">
                    <i className="fas fa-edit" />
                  </Link>
                  <button onClick={(e) => deleteBlog(e, blog.id)} className="text-xs text-red-500 hover:opacity-70 transition p-1" title="Delete blog">
                    <i className="fas fa-trash" />
                  </button>
                </div>
              </div>
              <h3 className="text-lg font-bold mt-3 mb-2 group-hover:underline">{blog.title}</h3>
              <p className="text-sm opacity-60 line-clamp-3">{blog.content.slice(0, 120)}...</p>
              <div className="flex justify-between items-center mt-4 text-xs opacity-50">
                <span>{blog.author}</span>
                <span>{blog.date} · {blog.readTime}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Layout>
  );
}
