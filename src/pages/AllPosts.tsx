import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { SC, Post, seedData } from '../lib/store';

export default function AllPostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    seedData();
    setPosts(SC.get<Post>('posts'));
  }, []);

  const deletePost = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this post?')) return;
    const updated = posts.filter(p => p.id !== id);
    SC.set('posts', updated);
    setPosts(updated);
  };

  return (
    <Layout>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">All Posts</h1>
        <Link to="/createpost" className="btn-primary"><i className="fas fa-plus" /> New Post</Link>
      </div>
      {posts.length === 0 ? (
        <div className="text-center p-16 opacity-50">No posts yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {posts.map(post => (
            <Link key={post.id} to={`/viewpost?id=${post.id}`} className="glass-card p-6 hover:bg-white/30 transition block relative">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs" style={{ background: 'var(--color-primary)', color: 'white' }}>
                  {post.author.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm">{post.author}</div>
                  <div className="text-xs opacity-50">{post.date}</div>
                </div>
                <button onClick={(e) => deletePost(e, post.id)} className="text-xs text-red-500 hover:opacity-70 transition p-1" title="Delete post">
                  <i className="fas fa-trash" />
                </button>
              </div>
              <p className="text-sm mb-3">{post.content.slice(0, 150)}{post.content.length > 150 ? '...' : ''}</p>
              {post.image && <img src={post.image} alt="" className="rounded-lg max-h-40 w-full object-cover mb-3" />}
              <div className="flex gap-4 text-xs opacity-50">
                <span><i className="far fa-heart" /> {post.likes}</span>
                <span><i className="far fa-comment" /> {post.comments.length}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Layout>
  );
}
