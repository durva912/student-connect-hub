import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { apiDelete, apiGet, getAuthUser, type FeedPostItem } from '@/lib/api';

export default function AllPostsPage() {
  const [posts, setPosts] = useState<FeedPostItem[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const me = getAuthUser();

  const load = useCallback(() => {
    setError('');
    apiGet<FeedPostItem[]>('/api/posts')
      .then(setPosts)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const deletePost = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this post?')) return;
    apiDelete(`/api/posts/${id}`)
      .then(() => load())
      .catch((err) => alert(err instanceof Error ? err.message : 'Delete failed'));
  };

  return (
    <Layout>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">All Posts</h1>
        <Link to="/createpost" className="btn-primary"><i className="fas fa-plus" /> New Post</Link>
      </div>
      {error && (
        <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>{error}</div>
      )}
      {loading ? (
        <div className="text-center p-16 opacity-60">Loading…</div>
      ) : posts.length === 0 ? (
        <div className="text-center p-16 opacity-50">No posts yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {posts.map((post) => (
            <Link key={post.id} to={`/viewpost?id=${post.id}`} className="glass-card p-6 hover:bg-white/30 transition block relative">
              <div className="flex items-center gap-3 mb-3">
                {post.author_avatar ? (
                  <img
                    src={post.author_avatar}
                    alt={post.author_name}
                    className="w-9 h-9 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs" style={{ background: 'var(--color-primary)', color: 'white' }}>
                    {post.author_name.split(' ').map((n) => n[0]).join('')}
                  </div>
                )}
                <div className="flex-1">
                  <div className="font-semibold text-sm">{post.author_name}</div>
                  <div className="text-xs opacity-50">{post.date}</div>
                </div>
                {me && post.author_id === me.id && (
                  <div className="flex gap-2">
                    <Link to={`/editpost?id=${post.id}`} onClick={(e) => e.stopPropagation()} className="text-xs opacity-50 hover:opacity-100 transition p-1" title="Edit post">
                      <i className="fas fa-edit" />
                    </Link>
                    <button type="button" onClick={(e) => deletePost(e, post.id)} className="text-xs text-red-500 hover:opacity-70 transition p-1" title="Delete post">
                      <i className="fas fa-trash" />
                    </button>
                  </div>
                )}
              </div>
              <p className="text-sm mb-3">{post.excerpt}</p>
              {post.has_image && (
                <div className="text-xs opacity-50 mb-2"><i className="fas fa-image" /> Image attached</div>
              )}
              <div className="flex gap-4 text-xs opacity-50">
                <span><i className="far fa-heart" /> {post.like_count}</span>
                <span><i className="far fa-comment" /> {post.comment_count}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Layout>
  );
}
