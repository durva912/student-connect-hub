import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  getAuthToken,
  getAuthUser,
  type BlogComment,
  type FeedPostDetail,
  type LikeState,
} from '@/lib/api';

export default function ViewPostPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const id = Number(params.get('id'));
  const [post, setPost] = useState<FeedPostDetail | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [commentBusy, setCommentBusy] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [likeBusy, setLikeBusy] = useState(false);

  const me = getAuthUser();
  const token = getAuthToken();

  const load = useCallback(() => {
    if (!Number.isFinite(id) || id < 1) {
      setError('Post not found');
      setLoading(false);
      return;
    }
    setError('');
    apiGet<FeedPostDetail>(`/api/posts/${id}`)
      .then(setPost)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const toggleLike = async () => {
    if (!token) {
      navigate('/login');
      return;
    }
    setLikeBusy(true);
    try {
      const r = await apiPost<LikeState>(`/api/posts/${id}/like`, {});
      setPost((p) =>
        p ? { ...p, liked_by_me: r.liked, like_count: r.like_count } : p
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Like failed');
    } finally {
      setLikeBusy(false);
    }
  };

  const shareInChat = () => {
    if (!post) return;
    const href = typeof window !== 'undefined' ? `${window.location.origin}/viewpost?id=${post.id}` : `/viewpost?id=${post.id}`;
    const shareText = `📎 Post by ${post.author_name}\n${href}`;
    navigate('/chatroom', { state: { shareText } });
  };

  const addComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      navigate('/login');
      return;
    }
    const t = comment.trim();
    if (!t) return;
    setCommentBusy(true);
    try {
      const c = await apiPost<BlogComment>(`/api/posts/${id}/comments`, { body: t });
      setPost((p) => (p ? { ...p, comments: [...p.comments, c] } : p));
      setComment('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Comment failed');
    } finally {
      setCommentBusy(false);
    }
  };

  const saveEdit = async (commentId: number) => {
    const t = editText.trim();
    if (!t) return;
    try {
      const updated = await apiPatch<BlogComment>(`/api/posts/${id}/comments/${commentId}`, { body: t });
      setPost((p) =>
        p
          ? { ...p, comments: p.comments.map((c) => (c.id === commentId ? updated : c)) }
          : p
      );
      setEditingId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const deleteComment = async (commentId: number) => {
    if (!confirm('Delete this comment?')) return;
    try {
      await apiDelete(`/api/posts/${id}/comments/${commentId}`);
      setPost((p) =>
        p ? { ...p, comments: p.comments.filter((c) => c.id !== commentId) } : p
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const deletePost = () => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    apiDelete(`/api/posts/${id}`)
      .then(() => navigate('/all-posts'))
      .catch((err) => alert(err instanceof Error ? err.message : 'Delete failed'));
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center p-16 opacity-60">Loading…</div>
      </Layout>
    );
  }

  if (error || !post) {
    return (
      <Layout>
        <div className="text-center p-16 opacity-50">{error || 'Post not found.'}</div>
        <div className="text-center">
          <Link to="/all-posts" className="text-sm underline">All posts</Link>
        </div>
      </Layout>
    );
  }

  const isOwner = me && post.author_id === me.id;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <Link to="/all-posts" className="inline-flex items-center gap-2 text-sm mb-6 hover:opacity-70">
          <i className="fas fa-arrow-left" /> Back to Posts
        </Link>
        <article className="glass-card p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: 'var(--color-primary)', color: 'white' }}>
              {post.author_name.split(' ').map((n) => n[0]).join('')}
            </div>
            <div className="flex-1">
              <div className="font-semibold">{post.author_name}</div>
              <div className="text-xs opacity-50">{post.date}</div>
            </div>
            {isOwner && (
              <div className="flex gap-2">
                <Link to={`/editpost?id=${post.id}`} className="text-xs px-3 py-1.5 rounded-lg hover:bg-accent transition" title="Edit post">
                  <i className="fas fa-edit" />
                </Link>
                <button type="button" onClick={deletePost} className="text-xs px-3 py-1.5 rounded-lg text-red-500 hover:bg-red-50 transition" title="Delete post">
                  <i className="fas fa-trash" />
                </button>
              </div>
            )}
          </div>
          <p className="leading-relaxed mb-4 whitespace-pre-wrap">{post.content}</p>
          {post.image ? <img src={post.image} alt="" className="rounded-lg w-full mb-4" /> : null}
          <div className="flex flex-wrap gap-4 text-sm border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={toggleLike}
              disabled={likeBusy}
              className="flex items-center gap-2 hover:opacity-70 transition disabled:opacity-50"
              style={post.liked_by_me ? { color: 'var(--color-primary)' } : {}}
            >
              <i className={`${post.liked_by_me ? 'fas' : 'far'} fa-heart`} /> {post.like_count} Likes
            </button>
            <span className="flex items-center gap-2 opacity-60"><i className="far fa-comment" /> {post.comments.length} Comments</span>
            <button type="button" onClick={shareInChat} className="btn-secondary text-xs py-1.5 px-3">
              <i className="fas fa-share-alt" /> Share in chat
            </button>
          </div>
        </article>

        <div className="mt-6 space-y-4">
          <h3 className="font-bold">Comments</h3>
          {token ? (
            <form onSubmit={addComment} className="flex flex-col gap-2">
              <textarea className="glass-input min-h-[72px]" placeholder="Write a comment…" value={comment} onChange={(e) => setComment(e.target.value)} />
              <button type="submit" disabled={commentBusy} className="btn-primary self-start text-sm py-2 px-4 disabled:opacity-50">
                {commentBusy ? 'Posting…' : 'Post'}
              </button>
            </form>
          ) : (
            <p className="text-sm opacity-60">
              <Link to="/login" className="underline font-medium">Log in</Link> to comment.
            </p>
          )}
          {post.comments.map((c) => (
            <div key={c.id} className="glass-card-light p-4">
              {editingId === c.id ? (
                <div className="space-y-2">
                  <textarea className="glass-input w-full min-h-[72px]" value={editText} onChange={(e) => setEditText(e.target.value)} />
                  <div className="flex gap-2">
                    <button type="button" className="btn-primary text-xs py-1.5 px-3" onClick={() => saveEdit(c.id)}>Save</button>
                    <button type="button" className="btn-secondary text-xs py-1.5 px-3" onClick={() => setEditingId(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between mb-1 gap-2">
                    <span className="font-semibold text-sm">{c.author_name}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs opacity-50">{new Date(c.created_at).toLocaleString()}</span>
                      {c.is_mine && (
                        <>
                          <button type="button" className="text-xs opacity-70 hover:opacity-100" onClick={() => { setEditingId(c.id); setEditText(c.body); }} title="Edit">
                            <i className="fas fa-edit" />
                          </button>
                          <button type="button" onClick={() => deleteComment(c.id)} className="text-xs text-red-500 hover:opacity-70" title="Delete">
                            <i className="fas fa-trash-alt" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{c.body}</p>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
