import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { SC, Blog, seedData } from '../lib/store';

export default function ReadSingleBlogPage() {
  const [params] = useSearchParams();
  const id = Number(params.get('id'));
  const [blog, setBlog] = useState<Blog | null>(null);

  useEffect(() => {
    seedData();
    const blogs = SC.get<Blog>('blogs');
    setBlog(blogs.find(b => b.id === id) || blogs[0] || null);
  }, [id]);

  if (!blog) return <Layout><div className="text-center p-16 opacity-50">Blog not found.</div></Layout>;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <Link to="/readblog" className="inline-flex items-center gap-2 text-sm mb-6 hover:opacity-70">
          <i className="fas fa-arrow-left" /> Back to Blogs
        </Link>
        <article className="glass-card p-8">
          <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: 'rgba(12,69,241,0.1)', color: 'var(--color-primary)' }}>{blog.category}</span>
          <h1 className="text-3xl font-bold mt-4 mb-2">{blog.title}</h1>
          <div className="text-sm opacity-50 mb-8">{blog.author} · {blog.date} · {blog.readTime} read</div>
          <div className="prose prose-sm max-w-none leading-relaxed whitespace-pre-line">{blog.content}</div>
          <div className="mt-8 pt-6 border-t border-white/10 flex gap-3">
            <Link to={`/edit_blog?id=${blog.id}`} className="btn-secondary text-sm"><i className="fas fa-edit" /> Edit</Link>
            <Link to="/readblog" className="btn-secondary text-sm"><i className="fas fa-list" /> All Blogs</Link>
          </div>
        </article>
      </div>
    </Layout>
  );
}
