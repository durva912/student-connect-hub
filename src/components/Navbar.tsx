import { Link, useLocation, useNavigate } from 'react-router-dom';
import logoImg from '../assets/logo_2.jpg';

const navLinks = [
  { to: '/homepage', label: 'Home', icon: 'fas fa-home' },
  { to: '/all-posts', label: 'Dashboard', icon: 'fas fa-th-large' },
  { to: '/readblog', label: 'Blogs', icon: 'fas fa-blog' },
];

interface NavbarProps {
  onToggleSidebar: () => void;
}

export default function Navbar({ onToggleSidebar }: NavbarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="glass-card mb-6 p-3 flex items-center justify-between relative z-30">
      {/* Left: Logo (no border/circle wrapper) */}
      <button
        onClick={onToggleSidebar}
        className="w-[50px] h-[50px] rounded-full overflow-hidden shrink-0 cursor-pointer hover:scale-105 transition-transform"
      >
        <img src={logoImg} alt="StudentConnect Logo" className="w-full h-full object-cover" />
      </button>

      {/* Center: Nav links */}
      <div className="hidden md:flex items-center gap-1">
        {navLinks.map(l => (
          <Link
            key={l.to}
            to={l.to}
            className={`nav-link text-sm ${location.pathname === l.to ? 'active' : ''}`}
          >
            <i className={l.icon} />
            {l.label}
          </Link>
        ))}
      </div>

      {/* Right: Search bar + Chat */}
      <div className="flex items-center gap-3">
        <div
          className="cursor-pointer hidden sm:flex"
          onClick={() => navigate('/search')}
        >
          <div className="glass-input flex items-center gap-2 px-4 py-2 text-sm opacity-60 hover:opacity-80 transition" style={{ minWidth: '180px' }}>
            <i className="fas fa-search" />
            <span>Search...</span>
          </div>
        </div>
        <Link
          to="/search"
          className="sm:hidden w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/20 transition"
          style={{ color: 'var(--color-primary)' }}
        >
          <i className="fas fa-search" />
        </Link>
        <Link
          to="/chatroom"
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/20 transition text-lg"
          style={{ color: 'var(--color-primary)' }}
          title="Chat"
        >
          <i className="fas fa-comment-dots" />
        </Link>
      </div>
    </nav>
  );
}
