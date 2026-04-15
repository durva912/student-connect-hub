import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { SC, seedData, Post } from '../lib/store';
import { apiGet, apiPost, getAuthToken, type BlogListItem, type FeedPostItem, type LikeState } from '@/lib/api';

export default function HomePage() {
  const [legacyPosts, setLegacyPosts] = useState<Post[]>([]);
  const [feedPosts, setFeedPosts] = useState<FeedPostItem[]>([]);
  const [trendingBlogs, setTrendingBlogs] = useState<BlogListItem[]>([]);
  const [likeBusy, setLikeBusy] = useState<number | null>(null);

  const loadFeed = useCallback(() => {
    apiGet<FeedPostItem[]>('/api/posts')
      .then(setFeedPosts)
      .catch(() => setFeedPosts([]));
  }, []);

  useEffect(() => {
    seedData();
    setLegacyPosts(SC.get<Post>('posts'));
    loadFeed();
    apiGet<BlogListItem[]>('/api/blogs')
      .then((rows) => setTrendingBlogs(rows.slice(0, 3)))
      .catch(() => setTrendingBlogs([]));
  }, [loadFeed]);

  const toggleLikeLocal = (id: number) => {
    const updated = legacyPosts.map((p) =>
      p.id === id ? { ...p, likes: p.likedByUser ? p.likes - 1 : p.likes + 1, likedByUser: !p.likedByUser } : p
    );
    setLegacyPosts(updated);
    SC.set('posts', updated);
  };

  const toggleLikeApi = async (postId: number) => {
    if (!getAuthToken()) return;
    setLikeBusy(postId);
    try {
      const r = await apiPost<LikeState>(`/api/posts/${postId}/like`, {});
      setFeedPosts((rows) =>
        rows.map((p) =>
          p.id === postId ? { ...p, liked_by_me: r.liked, like_count: r.like_count } : p
        )
      );
    } catch {
      /* ignore */
    } finally {
      setLikeBusy(null);
    }
  };

  const showFeed = feedPosts.length > 0;
  const displayPosts = showFeed ? null : legacyPosts;

  return (
    <Layout>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <section className="md:col-span-8 space-y-6">
          <div className="glass-card p-5">
            <div className="flex gap-4 items-center">
              <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0" style={{ background: 'var(--color-primary)', color: 'white' }}>S</div>
              <Link to="/createpost" className="w-full text-left px-4 py-3 rounded-full text-sm opacity-50 hover:opacity-70 transition" style={{ background: 'rgba(255,255,255,0.3)' }}>
                Share something with your peers...
              </Link>
            </div>
          </div>

          {showFeed ? (
            feedPosts.map((post) => (
              <article key={post.id} className="glass-card p-6 animate-fade-in">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    {post.author_avatar ? (
                      <img
                        src={post.author_avatar}
                        alt={post.author_name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs" style={{ background: 'var(--color-primary)', color: 'white' }}>
                        {post.author_name.split(' ').map((n) => n[0]).join('')}
                      </div>
                    )}
                    <div>
                      <Link
                        to={`/publicviewprofile?userId=${post.author_id}&name=${encodeURIComponent(post.author_name)}`}
                        className="font-semibold text-sm hover:underline"
                      >
                        {post.author_name}
                      </Link>
                      <div className="text-xs opacity-50">{post.date}</div>
                    </div>
                  </div>
                </div>
                <Link to={`/viewpost?id=${post.id}`} className="block mb-4">
                  <p className="text-sm leading-relaxed hover:opacity-90">{post.excerpt}</p>
                  {post.has_image && <p className="text-xs opacity-50 mt-2"><i className="fas fa-image" /> Image</p>}
                </Link>
                <div className="flex gap-6 text-sm">
                  <button
                    type="button"
                    onClick={() => toggleLikeApi(post.id)}
                    disabled={likeBusy === post.id || !getAuthToken()}
                    className="flex items-center gap-2 hover:opacity-70 transition disabled:opacity-40"
                    style={post.liked_by_me ? { color: 'var(--color-primary)' } : {}}
                    title={!getAuthToken() ? 'Log in to like' : undefined}
                  >
                    <i className={`${post.liked_by_me ? 'fas' : 'far'} fa-heart`} /> {post.like_count}
                  </button>
                  <Link to={`/viewpost?id=${post.id}`} className="flex items-center gap-2 hover:opacity-70 transition">
                    <i className="far fa-comment" /> {post.comment_count}
                  </Link>
                </div>
              </article>
            ))
          ) : displayPosts && displayPosts.length === 0 ? (
            <div className="text-center p-12 opacity-50">Your feed is quiet. Create a post to get started!</div>
          ) : (
            displayPosts!.map((post) => (
              <article key={post.id} className="glass-card p-6 animate-fade-in">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs" style={{ background: 'var(--color-primary)', color: 'white' }}>
                      {post.author.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <div>
                      <Link to="/publicviewprofile" className="font-semibold text-sm hover:underline">{post.author}</Link>
                      <div className="text-xs opacity-50">{post.date}</div>
                    </div>
                  </div>
                </div>
                <p className="mb-4 text-sm leading-relaxed">{post.content}</p>
                <div className="flex gap-6 text-sm">
                  <button type="button" onClick={() => toggleLikeLocal(post.id)} className="flex items-center gap-2 hover:opacity-70 transition" style={post.likedByUser ? { color: 'var(--color-primary)' } : {}}>
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

        <aside className="md:col-span-4 space-y-6">
          <div className="glass-card p-6">
            <h3 className="font-bold mb-4 text-sm">Trending Blogs</h3>
            <div className="space-y-3">
              {trendingBlogs.length === 0 ? (
                <p className="text-xs opacity-50">No blogs yet.</p>
              ) : (
                trendingBlogs.map((b) => (
                  <Link key={b.id} to={`/read_blog?id=${b.id}`} className="block p-2 rounded hover:bg-white/20 transition">
                    <div className="font-medium text-sm">{b.title}</div>
                    <div className="text-xs opacity-50">{b.author_name} · {b.read_time}</div>
                  </Link>
                ))
              )}
            </div>
          </div>
          <div className="glass-card p-6">
            <h3 className="font-bold mb-4 text-sm">Quick Links</h3>
            <div className="space-y-2">
              <Link to="/edit-profile" className="nav-link text-sm"><i className="fas fa-user-edit" /> Edit Profile</Link>
              <Link to="/writeblog" className="nav-link text-sm"><i className="fas fa-pen" /> Write Blog</Link>
              <Link to="/faqs" className="nav-link text-sm"><i className="fas fa-question-circle" /> FAQs</Link>
            </div>
          </div>
        </aside>
      </div>
    </Layout>
  );
}
