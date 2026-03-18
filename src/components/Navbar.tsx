import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

const navLinks = [
  { to: '/', label: 'Home', icon: 'fas fa-home' },
  { to: '/homepage', label: 'Dashboard', icon: 'fas fa-th-large' },
  { to: '/all-posts', label: 'Posts', icon: 'fas fa-stream' },
  { to: '/readblog', label: 'Blogs', icon: 'fas fa-blog' },
  { to: '/search', label: 'Search', icon: 'fas fa-search' },
  { to: '/aboutus', label: 'About', icon: 'fas fa-info-circle' },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const location = useLocation();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <nav className="glass-card mb-6 p-4 flex justify-between items-center relative z-50">
      <div className="flex items-center gap-4">
        <button className="md:hidden text-xl" onClick={() => setMenuOpen(!menuOpen)}>
          <i className="fas fa-bars" />
        </button>
        <Link to="/" className="text-xl font-bold" style={{ color: 'var(--color-primary)' }}>
          StudentConnect
        </Link>
      </div>

      {/* Desktop nav */}
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

      <div className="flex items-center gap-4">
        <Link to="/search" className="hover:opacity-70 transition">
          <i className="fas fa-search" />
        </Link>
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm"
            style={{ background: 'var(--color-primary)', color: 'white' }}
          >
            S
          </button>
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 glass-card p-2 z-50 animate-fade-in">
              <Link to="/userviewprofile" className="block p-2 hover:bg-white/20 rounded text-sm" onClick={() => setDropdownOpen(false)}>
                <i className="fas fa-user mr-2" />My Profile
              </Link>
              <Link to="/settings" className="block p-2 hover:bg-white/20 rounded text-sm" onClick={() => setDropdownOpen(false)}>
                <i className="fas fa-cog mr-2" />Settings
              </Link>
              <Link to="/createpost" className="block p-2 hover:bg-white/20 rounded text-sm" onClick={() => setDropdownOpen(false)}>
                <i className="fas fa-plus mr-2" />New Post
              </Link>
              <Link to="/writeblog" className="block p-2 hover:bg-white/20 rounded text-sm" onClick={() => setDropdownOpen(false)}>
                <i className="fas fa-pen mr-2" />Write Blog
              </Link>
              <hr className="my-2 border-white/20" />
              <Link to="/login" className="block p-2 hover:bg-white/20 rounded text-sm" style={{ color: '#ef4444' }} onClick={() => setDropdownOpen(false)}>
                <i className="fas fa-sign-out-alt mr-2" />Logout
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="absolute top-full left-0 right-0 glass-card mt-2 p-4 md:hidden animate-fade-in">
          {navLinks.map(l => (
            <Link
              key={l.to}
              to={l.to}
              className={`nav-link text-sm mb-1 ${location.pathname === l.to ? 'active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              <i className={l.icon} />
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
