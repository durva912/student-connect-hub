import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import Sidebar from '../components/Sidebar';
import { SC, seedData, Post, Blog } from '../lib/store';

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [blogs, setBlogs] = useState<Blog[]>([]);

  useEffect(() => {
    seedData();
    setPosts(SC.get<Post>('posts'));
    setBlogs(SC.get<Blog>('blogs'));
  }, []);

  const toggleLike = (id: number) => {
    const updated = posts.map(p =>
      p.id === id ? { ...p, likes: p.likedByUser ? p.likes - 1 : p.likes + 1, likedByUser: !p.likedByUser } : p
    );
    setPosts(updated);
    SC.set('posts', updated);
  };

  return (
    <Layout>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="hidden md:block md:col-span-3">
          <Sidebar />
        </div>
        <section className="md:col-span-6 space-y-6">
          {/* New Post CTA */}
          <div className="glass-card p-5">
            <div className="flex gap-4 items-center">
              <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0" style={{ background: 'var(--color-primary)', color: 'white' }}>S</div>
              <Link to="/createpost" className="w-full text-left px-4 py-3 rounded-full text-sm opacity-50 hover:opacity-70 transition" style={{ background: 'rgba(255,255,255,0.3)' }}>
                Share something with your peers...
              </Link>
            </div>
          </div>

          {/* Posts Feed */}
          {posts.length === 0 ? (
            <div className="text-center p-12 opacity-50">Your feed is quiet. Create a post to get started!</div>
          ) : (
            posts.map(post => (
              <article key={post.id} className="glass-card p-6 animate-fade-in">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs" style={{ background: 'var(--color-primary)', color: 'white' }}>
                      {post.author.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <Link to="/publicviewprofile" className="font-semibold text-sm hover:underline">{post.author}</Link>
                      <div className="text-xs opacity-50">{post.date}</div>
                    </div>
                  </div>
                </div>
                <p className="mb-4 text-sm leading-relaxed">{post.content}</p>
                <div className="flex gap-6 text-sm">
                  <button onClick={() => toggleLike(post.id)} className="flex items-center gap-2 hover:opacity-70 transition" style={post.likedByUser ? { color: 'var(--color-primary)' } : {}}>
                    <i className={`${post.likedByUser ? 'fas' : 'far'} fa-heart`} /> {post.likes}
                  </button>
                  <Link to={`/viewpost?id=${post.id}`} className="flex items-center gap-2 hover:opacity-70 transition">
                    <i className="far fa-comment" /> {post.comments.length}
                  </Link>
                </div>
              </article>
            ))
          )}
        </section>

        {/* Right panel */}
        <aside className="md:col-span-3 space-y-6">
          <div className="glass-card p-6">
            <h3 className="font-bold mb-4 text-sm">Trending Blogs</h3>
            <div className="space-y-3">
              {blogs.slice(0, 3).map(b => (
                <Link key={b.id} to={`/read_blog?id=${b.id}`} className="block p-2 rounded hover:bg-white/20 transition">
                  <div className="font-medium text-sm">{b.title}</div>
                  <div className="text-xs opacity-50">{b.author} · {b.readTime}</div>
                </Link>
              ))}
            </div>
          </div>
          <div className="glass-card p-6">
            <h3 className="font-bold mb-4 text-sm">Quick Links</h3>
            <div className="space-y-2">
              <Link to="/createprofile" className="nav-link text-sm"><i className="fas fa-user-edit" /> Edit Profile</Link>
              <Link to="/writeblog" className="nav-link text-sm"><i className="fas fa-pen" /> Write Blog</Link>
              <Link to="/faqs" className="nav-link text-sm"><i className="fas fa-question-circle" /> FAQs</Link>
            </div>
          </div>
        </aside>
      </div>
    </Layout>
  );
}
