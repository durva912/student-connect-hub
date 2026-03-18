import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { SC, UserProfile, defaultProfile, Post, Blog } from '../lib/store';

export default function UserViewProfilePage() {
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [posts, setPosts] = useState<Post[]>([]);
  const [blogs, setBlogs] = useState<Blog[]>([]);

  useEffect(() => {
    const p = SC.getOne<UserProfile>('profile');
    if (p) setProfile(p);
    setPosts(SC.get<Post>('posts').slice(0, 3));
    setBlogs(SC.get<Blog>('blogs').slice(0, 3));
  }, []);

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Profile Header */}
        <div className="glass-card p-8 text-center">
          <div className="w-24 h-24 rounded-full mx-auto mb-4 overflow-hidden flex items-center justify-center" style={{ background: 'var(--color-primary)', color: 'white' }}>
            {profile.avatar ? <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" /> : <i className="fas fa-user text-3xl" />}
          </div>
          <h1 className="text-2xl font-bold">{profile.name}</h1>
          <p className="text-sm opacity-60">{profile.major} · {profile.year}</p>
          <p className="text-sm mt-2 max-w-md mx-auto opacity-70">{profile.bio}</p>
          <div className="flex gap-3 justify-center mt-4">
            <Link to="/edit-profile" className="btn-primary text-sm"><i className="fas fa-edit" /> Edit Profile</Link>
            <Link to="/settings" className="btn-secondary text-sm"><i className="fas fa-cog" /> Settings</Link>
          </div>
          <div className="flex gap-4 justify-center mt-4">
            {profile.linkedin && <a href={profile.linkedin} target="_blank" rel="noreferrer" className="opacity-60 hover:opacity-100"><i className="fab fa-linkedin text-xl" /></a>}
            {profile.github && <a href={profile.github} target="_blank" rel="noreferrer" className="opacity-60 hover:opacity-100"><i className="fab fa-github text-xl" /></a>}
          </div>
        </div>

        {/* Interests & Skills */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-card p-6">
            <h3 className="font-bold text-sm mb-3">Interests</h3>
            <div className="flex flex-wrap gap-2">
              {profile.interests.map(i => (
                <span key={i} className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: 'rgba(12,69,241,0.1)', color: 'var(--color-primary)' }}>{i}</span>
              ))}
            </div>
          </div>
          <div className="glass-card p-6">
            <h3 className="font-bold text-sm mb-3">Skills</h3>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map(s => (
                <span key={s} className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--color-success)' }}>{s}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Posts */}
        <div className="glass-card p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-sm">Recent Posts</h3>
            <Link to="/all-posts" className="text-xs" style={{ color: 'var(--color-primary)' }}>View All</Link>
          </div>
          {posts.length === 0 ? <p className="text-sm opacity-50">No posts yet.</p> : posts.map(p => (
            <Link key={p.id} to={`/viewpost?id=${p.id}`} className="block p-3 rounded-lg hover:bg-white/20 transition mb-2">
              <p className="text-sm">{p.content.slice(0, 100)}...</p>
              <span className="text-xs opacity-50">{p.date} · {p.likes} likes</span>
            </Link>
          ))}
        </div>

        {/* Recent Blogs */}
        <div className="glass-card p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-sm">Recent Blogs</h3>
            <Link to="/readblog" className="text-xs" style={{ color: 'var(--color-primary)' }}>View All</Link>
          </div>
          {blogs.length === 0 ? <p className="text-sm opacity-50">No blogs yet.</p> : blogs.map(b => (
            <Link key={b.id} to={`/read_blog?id=${b.id}`} className="block p-3 rounded-lg hover:bg-white/20 transition mb-2">
              <p className="text-sm font-medium">{b.title}</p>
              <span className="text-xs opacity-50">{b.date} · {b.readTime}</span>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
}
