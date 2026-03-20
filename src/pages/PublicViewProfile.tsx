import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { SC, Post, Blog } from '../lib/store';

export default function PublicViewProfilePage() {
  const [searchParams] = useSearchParams();
  const profileName = searchParams.get('name') || 'Aarav Sharma';

  const profile = {
    name: profileName,
    major: 'Computer Engineering',
    year: '3rd Year',
    bio: 'Passionate about AI/ML and open source. Always looking for collaborators!',
    interests: ['AI/ML', 'Web Development', 'Open Source', 'Robotics'],
    skills: ['Python', 'TensorFlow', 'React', 'Node.js'],
    linkedin: 'https://linkedin.com',
    github: 'https://github.com',
  };

  const [isFollowing, setIsFollowing] = useState(false);
  const [showTeammateForm, setShowTeammateForm] = useState(false);
  const [teammateDesc, setTeammateDesc] = useState('');
  const [teammateSent, setTeammateSent] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);

  useEffect(() => {
    const allPosts = SC.get<Post>('posts').filter(p => p.author === profileName);
    setPosts(allPosts);
    const allBlogs = SC.get<Blog>('blogs').filter(b => b.author === profileName);
    setBlogs(allBlogs);

    const follows = SC.get<string>('following');
    setIsFollowing(follows.includes(profileName));
  }, [profileName]);

  const toggleFollow = () => {
    let follows = SC.get<string>('following');
    if (isFollowing) {
      follows = follows.filter(f => f !== profileName);
    } else {
      follows.push(profileName);
    }
    SC.set('following', follows);
    setIsFollowing(!isFollowing);

    // Add to profile's followers
    let profileFollowers = SC.get<string>(`followers_${profileName}`);
    const currentUser = SC.getOne<any>('profile')?.name || 'Student User';
    if (!isFollowing) {
      if (!profileFollowers.includes(currentUser)) profileFollowers.push(currentUser);
    } else {
      profileFollowers = profileFollowers.filter(f => f !== currentUser);
    }
    SC.set(`followers_${profileName}`, profileFollowers);
  };

  const sendTeammateRequest = () => {
    if (!teammateDesc.trim()) return;
    const requests = SC.get<any>('teammate_requests');
    requests.push({
      id: Date.now(),
      from: SC.getOne<any>('profile')?.name || 'Student User',
      to: profileName,
      description: teammateDesc.trim(),
      date: new Date().toISOString(),
    });
    SC.set('teammate_requests', requests);
    setTeammateSent(true);
    setTeammateDesc('');
    setTimeout(() => { setTeammateSent(false); setShowTeammateForm(false); }, 2000);
  };

  const followers = SC.get<string>(`followers_${profileName}`);
  const following = SC.get<string>(`following_${profileName}`);

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Profile Header */}
        <div className="glass-card p-8 text-center">
          <div className="w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center font-bold text-2xl text-primary-foreground" style={{ background: 'var(--color-primary)' }}>
            {profileName.split(' ').map(n => n[0]).join('')}
          </div>
          <h1 className="text-2xl font-bold">{profile.name}</h1>
          <p className="text-sm opacity-60">{profile.major} · {profile.year}</p>
          <p className="text-sm mt-2 max-w-md mx-auto opacity-70">{profile.bio}</p>

          {/* Followers / Following */}
          <div className="flex gap-6 justify-center mt-4">
            <button onClick={() => setShowFollowers(true)} className="text-center hover:opacity-80 transition">
              <span className="font-bold text-lg">{followers.length}</span>
              <p className="text-xs opacity-60">Followers</p>
            </button>
            <button onClick={() => setShowFollowing(true)} className="text-center hover:opacity-80 transition">
              <span className="font-bold text-lg">{following.length}</span>
              <p className="text-xs opacity-60">Following</p>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-center mt-4 flex-wrap">
            <button onClick={toggleFollow} className={`px-5 py-2 rounded-full text-sm font-semibold transition ${isFollowing ? 'bg-muted text-muted-foreground' : 'btn-primary'}`}>
              <i className={`fas ${isFollowing ? 'fa-user-check' : 'fa-user-plus'} mr-1`} />
              {isFollowing ? 'Following' : 'Follow'}
            </button>
            <Link to={`/chatroom?user=${encodeURIComponent(profileName)}`} className="btn-secondary px-5 py-2 rounded-full text-sm font-semibold">
              <i className="fas fa-comment mr-1" /> Message
            </Link>
            <button onClick={() => setShowTeammateForm(!showTeammateForm)} className="px-5 py-2 rounded-full text-sm font-semibold border border-current opacity-70 hover:opacity-100 transition">
              <i className="fas fa-handshake mr-1" /> Be My Teammate
            </button>
          </div>

          {/* Teammate Request Form */}
          {showTeammateForm && (
            <div className="mt-4 max-w-md mx-auto">
              <textarea
                className="glass-input w-full px-4 py-2 text-sm rounded-xl"
                rows={3}
                placeholder="Describe the event, hackathon, or project you'd like to team up for..."
                value={teammateDesc}
                onChange={e => setTeammateDesc(e.target.value)}
              />
              <button onClick={sendTeammateRequest} className="btn-primary mt-2 text-sm px-4 py-2">
                {teammateSent ? '✓ Request Sent!' : 'Send Request'}
              </button>
            </div>
          )}

          {/* Social Links */}
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
                <span key={i} className="px-3 py-1 rounded-full text-xs font-medium bg-accent text-accent-foreground">{i}</span>
              ))}
            </div>
          </div>
          <div className="glass-card p-6">
            <h3 className="font-bold text-sm mb-3">Skills</h3>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map(s => (
                <span key={s} className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>{s}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Posts */}
        <div className="glass-card p-6">
          <h3 className="font-bold text-sm mb-4">Posts by {profile.name}</h3>
          {posts.length === 0 ? <p className="text-sm opacity-50">No posts yet.</p> : posts.map(p => (
            <Link key={p.id} to={`/viewpost?id=${p.id}`} className="block p-3 rounded-lg hover:bg-white/10 transition mb-2">
              <p className="text-sm">{p.content.slice(0, 120)}...</p>
              <span className="text-xs opacity-50">{p.date} · {p.likes} likes</span>
            </Link>
          ))}
        </div>

        {/* Blogs */}
        <div className="glass-card p-6">
          <h3 className="font-bold text-sm mb-4">Blogs by {profile.name}</h3>
          {blogs.length === 0 ? <p className="text-sm opacity-50">No blogs yet.</p> : blogs.map(b => (
            <Link key={b.id} to={`/read_blog?id=${b.id}`} className="block p-3 rounded-lg hover:bg-white/10 transition mb-2">
              <p className="text-sm font-medium">{b.title}</p>
              <span className="text-xs opacity-50">{b.date} · {b.readTime}</span>
            </Link>
          ))}
        </div>

        {/* Followers Modal */}
        {showFollowers && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowFollowers(false)}>
            <div className="glass-card p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold">Followers</h3>
                <button onClick={() => setShowFollowers(false)} className="opacity-60 hover:opacity-100"><i className="fas fa-times" /></button>
              </div>
              {followers.length === 0 ? <p className="text-sm opacity-50">No followers yet.</p> : followers.map(f => (
                <Link key={f} to={`/publicviewprofile?name=${encodeURIComponent(f)}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 transition" onClick={() => setShowFollowers(false)}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground" style={{ background: 'var(--color-primary)' }}>
                    {f.split(' ').map(n => n[0]).join('')}
                  </div>
                  <span className="text-sm">{f}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Following Modal */}
        {showFollowing && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowFollowing(false)}>
            <div className="glass-card p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold">Following</h3>
                <button onClick={() => setShowFollowing(false)} className="opacity-60 hover:opacity-100"><i className="fas fa-times" /></button>
              </div>
              {following.length === 0 ? <p className="text-sm opacity-50">Not following anyone yet.</p> : following.map(f => (
                <Link key={f} to={`/publicviewprofile?name=${encodeURIComponent(f)}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 transition" onClick={() => setShowFollowing(false)}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground" style={{ background: 'var(--color-primary)' }}>
                    {f.split(' ').map(n => n[0]).join('')}
                  </div>
                  <span className="text-sm">{f}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
