import { Link, useNavigate } from 'react-router-dom';
import logoImg from '../assets/logo_2.jpg';

interface NavbarProps {
  onToggleSidebar: () => void;
}

export default function Navbar({ onToggleSidebar }: NavbarProps) {
  const navigate = useNavigate();

  return (
    <nav className="glass-card mb-6 p-3 flex items-center justify-between relative z-30">
      {/* Left: Logo that opens sidebar */}
      <button
        onClick={onToggleSidebar}
        className="w-[50px] h-[50px] rounded-full overflow-hidden border-2 border-white/40 hover:border-primary transition shrink-0 cursor-pointer"
      >
        <img src={logoImg} alt="StudentConnect Logo" className="w-full h-full object-cover" />
      </button>

      {/* Center: Search bar */}
      <div
        className="flex-1 max-w-md mx-4 cursor-pointer"
        onClick={() => navigate('/search')}
      >
        <div className="glass-input flex items-center gap-2 px-4 py-2 text-sm opacity-60 hover:opacity-80 transition">
          <i className="fas fa-search" />
          <span>Search students, posts, blogs...</span>
        </div>
      </div>

      {/* Right: Chat icon */}
      <Link
        to="/search"
        className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/20 transition text-lg"
        style={{ color: 'var(--color-primary)' }}
        title="Chat"
      >
        <i className="fas fa-comment-dots" />
      </Link>
    </nav>
  );
}
