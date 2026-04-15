import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { SC, Post, Blog } from '../lib/store';
import {
  apiGet,
  apiPost,
  getAuthToken,
  getAuthUser,
  type PublicProfile,
  type TeammateWithState,
} from '@/lib/api';

export default function PublicViewProfilePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userIdParam = searchParams.get('userId');
  const nameParam = searchParams.get('name');

  const [resolvedId, setResolvedId] = useState<number | null>(null);
  const [resolveErr, setResolveErr] = useState<string | null>(null);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [profileErr, setProfileErr] = useState<string | null>(null);
  const [teammateState, setTeammateState] = useState<TeammateWithState | null>(null);
  const [showTeammateForm, setShowTeammateForm] = useState(false);
  const [teammateDesc, setTeammateDesc] = useState('');
  const [teammateBusy, setTeammateBusy] = useState(false);
  const [teammateErr, setTeammateErr] = useState<string | null>(null);

  const [isFollowing, setIsFollowing] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);

  const me = getAuthUser();
  const token = getAuthToken();
  const profileName = profile?.name ?? nameParam ?? 'Profile';

  useEffect(() => {
    let cancelled = false;
    setResolveErr(null);
    if (userIdParam) {
      const id = parseInt(userIdParam, 10);
      if (Number.isFinite(id) && id > 0) {
        setResolvedId(id);
        return () => {
          cancelled = true;
        };
      }
      setResolvedId(null);
      setResolveErr('Invalid profile link.');
      return () => {
        cancelled = true;
      };
    }
    if (nameParam?.trim()) {
      apiGet<{ user_id: number }>(
        `/api/profiles/public-resolve?name=${encodeURIComponent(nameParam.trim())}`
      )
        .then((r) => {
          if (!cancelled) setResolvedId(r.user_id);
        })
        .catch(() => {
          if (!cancelled) {
            setResolvedId(null);
            setResolveErr('Profile not found. Open someone from Search.');
          }
        });
    } else {
      setResolvedId(null);
      setResolveErr('Missing profile. Use Search or a shared link with user ID.');
    }
    return () => {
      cancelled = true;
    };
  }, [userIdParam, nameParam]);

  useEffect(() => {
    if (resolvedId == null) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    setProfileErr(null);
    apiGet<PublicProfile>(`/api/profiles/public/${resolvedId}`)
      .then((p) => {
        if (!cancelled) setProfile(p);
      })
      .catch((e) => {
        if (!cancelled) {
          setProfile(null);
          setProfileErr(e instanceof Error ? e.message : 'Could not load profile');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [resolvedId]);

  const loadTeammateState = useCallback(() => {
    if (resolvedId == null) return;
    apiGet<TeammateWithState>(`/api/teammate/with/${resolvedId}`)
      .then(setTeammateState)
      .catch(() => setTeammateState(null));
  }, [resolvedId]);

  useEffect(() => {
    loadTeammateState();
  }, [loadTeammateState, token]);

  useEffect(() => {
    const allPosts = SC.get<Post>('posts').filter((p) => p.author === profileName);
    setPosts(allPosts);
    const allBlogs = SC.get<Blog>('blogs').filter((b) => b.author === profileName);
    setBlogs(allBlogs);
    const follows = SC.get<string>('following');
    setIsFollowing(follows.includes(profileName));
  }, [profileName]);

  const toggleFollow = () => {
    let follows = SC.get<string>('following');
    if (isFollowing) {
      follows = follows.filter((f) => f !== profileName);
    } else {
      follows.push(profileName);
    }
    SC.set('following', follows);
    setIsFollowing(!isFollowing);
    let profileFollowers = SC.get<string>(`followers_${profileName}`);
    const currentUser = SC.getOne<any>('profile')?.name || 'Student User';
    if (!isFollowing) {
      if (!profileFollowers.includes(currentUser)) profileFollowers.push(currentUser);
    } else {
      profileFollowers = profileFollowers.filter((f) => f !== currentUser);
    }
    SC.set(`followers_${profileName}`, profileFollowers);
  };

  const sendTeammateRequest = async () => {
    if (!profile || !teammateDesc.trim() || !getAuthToken()) return;
    setTeammateBusy(true);
    setTeammateErr(null);
    try {
      await apiPost<{ id: number; status: string }>('/api/teammate-requests', {
        to_user_id: profile.user_id,
        body: teammateDesc.trim(),
      });
      setTeammateDesc('');
      setShowTeammateForm(false);
      loadTeammateState();
      navigate(`/chatroom?userId=${profile.user_id}`);
    } catch (e) {
      setTeammateErr(e instanceof Error ? e.message : 'Could not send request');
    } finally {
      setTeammateBusy(false);
    }
  };

  const followers = SC.get<string>(`followers_${profileName}`);
  const following = SC.get<string>(`following_${profileName}`);

  const isOwnProfile = Boolean(me && profile && me.id === profile.user_id);
  const showGlobalAccepted = profile?.teammate_active;

  const resolving =
    Boolean(userIdParam || nameParam) && resolvedId === null && !resolveErr;

  const teammateButtonBlock = () => {
    if (!profile) return null;
    if (showGlobalAccepted) {
      return (
        <span className="px-5 py-2 rounded-full text-sm font-semibold bg-emerald-500/20 text-emerald-200 border border-emerald-500/40">
          <i className="fas fa-check mr-1" /> Accepted
        </span>
      );
    }
    if (!token) {
      return (
        <Link
          to="/login"
          className="px-5 py-2 rounded-full text-sm font-semibold border border-current opacity-70 hover:opacity-100 transition inline-block"
        >
          <i className="fas fa-handshake mr-1" /> Log in to invite
        </Link>
      );
    }
    if (isOwnProfile) return null;
    if (!teammateState) {
      return (
        <button
          type="button"
          disabled
          className="px-5 py-2 rounded-full text-sm font-semibold border border-current opacity-40"
        >
          <i className="fas fa-handshake mr-1" /> Be My Teammate
        </button>
      );
    }
    if (teammateState.outgoing_pending) {
      return (
        <div className="flex flex-col items-center gap-2">
          <span className="px-5 py-2 rounded-full text-sm font-semibold bg-white/15">Request sent</span>
          <Link
            to={`/chatroom?userId=${profile.user_id}`}
            className="text-xs opacity-80 hover:opacity-100 underline"
          >
            Open chat
          </Link>
        </div>
      );
    }
    if (!teammateState.can_send_teammate_request) {
      return (
        <span className="px-5 py-2 rounded-full text-sm font-semibold border border-current opacity-50 text-center max-w-xs">
          <i className="fas fa-handshake mr-1" /> Be My Teammate
        </span>
      );
    }
    return (
      <button
        type="button"
        onClick={() => setShowTeammateForm(!showTeammateForm)}
        className="px-5 py-2 rounded-full text-sm font-semibold border border-current opacity-70 hover:opacity-100 transition"
      >
        <i className="fas fa-handshake mr-1" /> Be My Teammate
      </button>
    );
  };

  if (!userIdParam?.trim() && !nameParam?.trim()) {
    return (
      <Layout>
        <div className="max-w-lg mx-auto glass-card p-8 text-center opacity-80">
          Missing profile. Open someone from <Link to="/search" className="underline">Search</Link>.
        </div>
      </Layout>
    );
  }

  if (resolveErr) {
    return (
      <Layout>
        <div className="max-w-lg mx-auto glass-card p-8 text-center text-red-600/90">{resolveErr}</div>
      </Layout>
    );
  }

  if (profileErr) {
    return (
      <Layout>
        <div className="max-w-lg mx-auto glass-card p-8 text-center text-red-600/90">{profileErr}</div>
      </Layout>
    );
  }

  if (resolving || !profile) {
    return (
      <Layout>
        <div className="max-w-lg mx-auto glass-card p-8 text-center opacity-60">Loading profile…</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="glass-card p-8 text-center">
          <div
            className="w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center font-bold text-2xl text-primary-foreground"
            style={{ background: 'var(--color-primary)' }}
          >
            {profile.name
              .split(/\s+/)
              .filter(Boolean)
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase() || '?'}
          </div>
          <h1 className="text-2xl font-bold">{profile.name}</h1>
          <p className="text-sm opacity-60">
            {profile.major || '—'} {profile.year ? `· ${profile.year}` : ''}
          </p>
          <p className="text-sm mt-2 max-w-md mx-auto opacity-70">{profile.bio || 'No bio yet.'}</p>

          <div className="flex gap-6 justify-center mt-4">
            <button
              type="button"
              onClick={() => setShowFollowers(true)}
              className="text-center hover:opacity-80 transition"
            >
              <span className="font-bold text-lg">{followers.length}</span>
              <p className="text-xs opacity-60">Followers</p>
            </button>
            <button
              type="button"
              onClick={() => setShowFollowing(true)}
              className="text-center hover:opacity-80 transition"
            >
              <span className="font-bold text-lg">{following.length}</span>
              <p className="text-xs opacity-60">Following</p>
            </button>
          </div>

          <div className="flex gap-3 justify-center mt-4 flex-wrap items-center">
            <button
              type="button"
              onClick={toggleFollow}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition ${isFollowing ? 'bg-muted text-muted-foreground' : 'btn-primary'}`}
            >
              <i className={`fas ${isFollowing ? 'fa-user-check' : 'fa-user-plus'} mr-1`} />
              {isFollowing ? 'Following' : 'Follow'}
            </button>
            <Link
              to={`/chatroom?userId=${profile.user_id}`}
              className="btn-secondary px-5 py-2 rounded-full text-sm font-semibold"
            >
              <i className="fas fa-comment mr-1" /> Message
            </Link>
            {teammateButtonBlock()}
          </div>

          {!showGlobalAccepted && showTeammateForm && token && !isOwnProfile && teammateState?.can_send_teammate_request && (
            <div className="mt-4 max-w-md mx-auto text-left">
              <textarea
                className="glass-input w-full px-4 py-2 text-sm rounded-xl"
                rows={3}
                placeholder="Describe the event, hackathon, or project you'd like to team up for..."
                value={teammateDesc}
                onChange={(e) => setTeammateDesc(e.target.value)}
              />
              {teammateErr && <p className="text-xs text-red-500 mt-1">{teammateErr}</p>}
              <button
                type="button"
                disabled={teammateBusy}
                onClick={sendTeammateRequest}
                className="btn-primary mt-2 text-sm px-4 py-2 disabled:opacity-50"
              >
                {teammateBusy ? 'Sending…' : 'Send to chat'}
              </button>
            </div>
          )}

          <div className="flex gap-4 justify-center mt-4">
            {profile.linkedin && (
              <a href={profile.linkedin} target="_blank" rel="noreferrer" className="opacity-60 hover:opacity-100">
                <i className="fab fa-linkedin text-xl" />
              </a>
            )}
            {profile.github && (
              <a href={profile.github} target="_blank" rel="noreferrer" className="opacity-60 hover:opacity-100">
                <i className="fab fa-github text-xl" />
              </a>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-card p-6">
            <h3 className="font-bold text-sm mb-3">Interests</h3>
            <div className="flex flex-wrap gap-2">
              {profile.interests.length === 0 ? (
                <p className="text-sm opacity-50">None listed.</p>
              ) : (
                profile.interests.map((i) => (
                  <span
                    key={i}
                    className="px-3 py-1 rounded-full text-xs font-medium bg-accent text-accent-foreground"
                  >
                    {i}
                  </span>
                ))
              )}
            </div>
          </div>
          <div className="glass-card p-6">
            <h3 className="font-bold text-sm mb-3">Skills</h3>
            <div className="flex flex-wrap gap-2">
              {profile.skills.length === 0 ? (
                <p className="text-sm opacity-50">None listed.</p>
              ) : (
                profile.skills.map((s) => (
                  <span
                    key={s}
                    className="px-3 py-1 rounded-full text-xs font-medium"
                    style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}
                  >
                    {s}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="font-bold text-sm mb-4">Posts by {profile.name}</h3>
          {profile.posts.length === 0 && posts.length === 0 ? (
            <p className="text-sm opacity-50">No posts yet.</p>
          ) : (
            <>
              {profile.posts.map((p) => (
                <Link
                  key={p.id}
                  to={`/viewpost?id=${p.id}`}
                  className="block p-3 rounded-lg hover:bg-white/10 transition mb-2"
                >
                  <p className="text-sm">{p.excerpt}</p>
                  <span className="text-xs opacity-50">{p.date}</span>
                </Link>
              ))}
              {profile.posts.length === 0 &&
                posts.map((p) => (
                  <Link
                    key={p.id}
                    to={`/viewpost?id=${p.id}`}
                    className="block p-3 rounded-lg hover:bg-white/10 transition mb-2"
                  >
                    <p className="text-sm">{p.content.slice(0, 120)}...</p>
                    <span className="text-xs opacity-50">
                      {p.date} · {p.likes} likes
                    </span>
                  </Link>
                ))}
            </>
          )}
        </div>

        <div className="glass-card p-6">
          <h3 className="font-bold text-sm mb-4">Blogs by {profile.name}</h3>
          {profile.blogs.length === 0 && blogs.length === 0 ? (
            <p className="text-sm opacity-50">No blogs yet.</p>
          ) : (
            <>
              {profile.blogs.map((b) => (
                <Link
                  key={b.id}
                  to={`/read_blog?id=${b.id}`}
                  className="block p-3 rounded-lg hover:bg-white/10 transition mb-2"
                >
                  <p className="text-sm font-medium">{b.title}</p>
                  <span className="text-xs opacity-50">
                    {b.date} · {b.read_time}
                  </span>
                </Link>
              ))}
              {profile.blogs.length === 0 &&
                blogs.map((b) => (
                  <Link
                    key={b.id}
                    to={`/read_blog?id=${b.id}`}
                    className="block p-3 rounded-lg hover:bg-white/10 transition mb-2"
                  >
                    <p className="text-sm font-medium">{b.title}</p>
                    <span className="text-xs opacity-50">
                      {b.date} · {b.readTime}
                    </span>
                  </Link>
                ))}
            </>
          )}
        </div>

        {showFollowers && (
          <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowFollowers(false)}
          >
            <div className="glass-card p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold">Followers</h3>
                <button type="button" onClick={() => setShowFollowers(false)} className="opacity-60 hover:opacity-100">
                  <i className="fas fa-times" />
                </button>
              </div>
              {followers.length === 0 ? (
                <p className="text-sm opacity-50">No followers yet.</p>
              ) : (
                followers.map((f) => (
                  <Link
                    key={f}
                    to={`/publicviewprofile?name=${encodeURIComponent(f)}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 transition"
                    onClick={() => setShowFollowers(false)}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground"
                      style={{ background: 'var(--color-primary)' }}
                    >
                      {f.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <span className="text-sm">{f}</span>
                  </Link>
                ))
              )}
            </div>
          </div>
        )}

        {showFollowing && (
          <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowFollowing(false)}
          >
            <div className="glass-card p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold">Following</h3>
                <button type="button" onClick={() => setShowFollowing(false)} className="opacity-60 hover:opacity-100">
                  <i className="fas fa-times" />
                </button>
              </div>
              {following.length === 0 ? (
                <p className="text-sm opacity-50">Not following anyone yet.</p>
              ) : (
                following.map((f) => (
                  <Link
                    key={f}
                    to={`/publicviewprofile?name=${encodeURIComponent(f)}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 transition"
                    onClick={() => setShowFollowing(false)}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground"
                      style={{ background: 'var(--color-primary)' }}
                    >
                      {f.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <span className="text-sm">{f}</span>
                  </Link>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
