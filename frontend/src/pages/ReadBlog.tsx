import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { apiDelete, apiGet, getAuthUser, type BlogListItem } from '@/lib/api';

export default function ReadBlogPage() {
  const [blogs, setBlogs] = useState<BlogListItem[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const me = getAuthUser();

  const load = () => {
    setError('');
    apiGet<BlogListItem[]>('/api/blogs')
      .then(setBlogs)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load blogs'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const deleteBlog = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this blog?')) return;
    apiDelete(`/api/blogs/${id}`)
      .then(() => load())
      .catch((err) => alert(err instanceof Error ? err.message : 'Delete failed'));
  };

  return (
    <Layout>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Blogs</h1>
        <Link to="/writeblog" className="btn-primary"><i className="fas fa-pen" /> Write Blog</Link>
      </div>
      {error && (
        <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
          {error}
        </div>
      )}
      {loading ? (
        <div className="text-center p-16 opacity-60">Loading blogs…</div>
      ) : blogs.length === 0 ? (
        <div className="text-center p-16 opacity-50">No blogs yet. Be the first to write one!</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {blogs.map((blog) => (
            <Link key={blog.id} to={`/read_blog?id=${blog.id}`} className="glass-card p-6 hover:bg-white/30 transition group relative">
              <div className="flex justify-between items-start gap-2">
                <span className="text-xs font-semibold px-2 py-1 rounded-full shrink-0" style={{ background: 'rgba(12,69,241,0.1)', color: 'var(--color-primary)' }}>{blog.category}</span>
                <div className="flex items-center gap-2 text-xs opacity-60 shrink-0">
                  <span title="Likes"><i className="fas fa-heart text-red-400" /> {blog.like_count}</span>
                  <span title="Comments"><i className="fas fa-comment" /> {blog.comment_count}</span>
                </div>
              </div>
              {me && blog.author_id === me.id && (
                <div className="absolute top-14 right-4 flex gap-2 z-10">
                  <Link to={`/edit_blog?id=${blog.id}`} onClick={(e) => e.stopPropagation()} className="text-xs opacity-50 hover:opacity-100 transition p-1" title="Edit blog">
                    <i className="fas fa-edit" />
                  </Link>
                  <button type="button" onClick={(e) => deleteBlog(e, blog.id)} className="text-xs text-red-500 hover:opacity-70 transition p-1" title="Delete blog">
                    <i className="fas fa-trash" />
                  </button>
                </div>
              )}
              <h3 className="text-lg font-bold mt-3 mb-2 group-hover:underline pr-8">{blog.title}</h3>
              <p className="text-sm opacity-60 line-clamp-3">{blog.excerpt}</p>
              <div className="flex justify-between items-center mt-4 text-xs opacity-50">
                <span>{blog.author_name}</span>
                <span>{blog.date} · {blog.read_time}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Layout>
  );
}
