import { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { SC, Post, seedData } from '../lib/store';

export default function ViewPostPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const id = Number(params.get('id'));
  const [post, setPost] = useState<Post | null>(null);
  const [comment, setComment] = useState('');

  useEffect(() => {
    seedData();
    const posts = SC.get<Post>('posts');
    setPost(posts.find(p => p.id === id) || posts[0] || null);
  }, [id]);

  if (!post) return <Layout><div className="text-center p-16 opacity-50">Post not found.</div></Layout>;

  const toggleLike = () => {
    const updated = { ...post, likes: post.likedByUser ? post.likes - 1 : post.likes + 1, likedByUser: !post.likedByUser };
    setPost(updated);
    const posts = SC.get<Post>('posts').map(p => p.id === post.id ? updated : p);
    SC.set('posts', posts);
  };

  const deletePost = () => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    SC.set('posts', SC.get<Post>('posts').filter(p => p.id !== post.id));
    navigate('/all-posts');
  };

  const deleteComment = (index: number) => {
    if (!confirm('Delete this comment?')) return;
    const updated = { ...post, comments: post.comments.filter((_, i) => i !== index) };
    setPost(updated);
    SC.set('posts', SC.get<Post>('posts').map(p => p.id === post.id ? updated : p));
  };

  const addComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    const newComment = { author: 'Student User', text: comment.trim(), date: new Date().toLocaleDateString('en-CA') };
    const updated = { ...post, comments: [...post.comments, newComment] };
    setPost(updated);
    SC.set('posts', SC.get<Post>('posts').map(p => p.id === post.id ? updated : p));
    setComment('');
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <Link to="/all-posts" className="inline-flex items-center gap-2 text-sm mb-6 hover:opacity-70">
          <i className="fas fa-arrow-left" /> Back to Posts
        </Link>
        <article className="glass-card p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: 'var(--color-primary)', color: 'white' }}>
              {post.author.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="flex-1">
              <div className="font-semibold">{post.author}</div>
              <div className="text-xs opacity-50">{post.date}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={deletePost} className="text-xs px-3 py-1.5 rounded-lg text-red-500 hover:bg-red-50 transition" title="Delete post">
                <i className="fas fa-trash" />
              </button>
            </div>
          </div>
          <p className="leading-relaxed mb-4">{post.content}</p>
          {post.image && <img src={post.image} alt="" className="rounded-lg w-full mb-4" />}
          <div className="flex gap-6 text-sm border-t border-white/10 pt-4">
            <button onClick={toggleLike} className="flex items-center gap-2 hover:opacity-70 transition" style={post.likedByUser ? { color: 'var(--color-primary)' } : {}}>
              <i className={`${post.likedByUser ? 'fas' : 'far'} fa-heart`} /> {post.likes} Likes
            </button>
            <span className="flex items-center gap-2 opacity-60"><i className="far fa-comment" /> {post.comments.length} Comments</span>
          </div>
        </article>

        {/* Comments */}
        <div className="mt-6 space-y-4">
          <h3 className="font-bold">Comments</h3>
          {post.comments.map((c, i) => (
            <div key={i} className="glass-card-light p-4">
              <div className="flex justify-between mb-1">
                <span className="font-semibold text-sm">{c.author}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs opacity-50">{c.date}</span>
                  <button onClick={() => deleteComment(i)} className="text-xs text-red-500 hover:opacity-70 transition" title="Delete comment">
                    <i className="fas fa-trash-alt" />
                  </button>
                </div>
              </div>
              <p className="text-sm">{c.text}</p>
            </div>
          ))}
          <form onSubmit={addComment} className="flex gap-3">
            <input className="glass-input" placeholder="Write a comment..." value={comment} onChange={e => setComment(e.target.value)} />
            <button type="submit" className="btn-primary shrink-0"><i className="fas fa-paper-plane" /></button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
