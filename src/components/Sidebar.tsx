import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

const menuItems = [
  { to: '/homepage', label: 'Feed', icon: 'fas fa-home' },
  { to: '/all-posts', label: 'All Posts', icon: 'fas fa-stream' },
  { to: '/readblog', label: 'Blogs', icon: 'fas fa-blog' },
  { to: '/createpost', label: 'Create Post', icon: 'fas fa-plus-circle' },
  { to: '/filter', label: 'Find Teammate', icon: 'fas fa-users' },
  { to: '/settings', label: 'Settings', icon: 'fas fa-cog' },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('sc_sidebar_collapsed') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('sc_sidebar_collapsed', String(collapsed));
  }, [collapsed]);

  // Close sidebar on mobile when navigating
  useEffect(() => {
    if (window.innerWidth < 768) {
      onClose();
    }
  }, [location.pathname]);

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-40 md:hidden"
        onClick={onClose}
      />

      <aside
        className="fixed top-0 left-0 h-full z-50 flex flex-col bg-white shadow-xl"
        style={{
          width: collapsed ? '70px' : '250px',
          transition: 'width 0.3s ease',
        }}
      >
        {/* Profile section */}
        <div className="p-4 border-b border-gray-100 flex items-center gap-3">
          <Link to="/userviewprofile" className="shrink-0" onClick={() => window.innerWidth < 768 && onClose()}>
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
              style={{ background: 'var(--color-primary)' }}
            >
              S
            </div>
          </Link>
          {!collapsed && (
            <Link to="/userviewprofile" className="text-sm font-semibold text-gray-800 hover:underline truncate">
              My Profile
            </Link>
          )}
        </div>

        {/* Toggle button */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="hidden md:flex items-center justify-center p-2 mx-2 mt-2 rounded-lg text-gray-500 hover:bg-gray-100 transition"
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          <i className={`fas ${collapsed ? 'fa-angle-double-right' : 'fa-angle-double-left'} text-sm`} />
        </button>

        {/* Menu items */}
        <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
          {menuItems.map(item => {
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                title={collapsed ? item.label : undefined}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200"
                style={
                  isActive
                    ? {
                        background: 'var(--color-primary)',
                        color: 'white',
                        boxShadow: '0 0 12px rgba(12,69,241,0.4)',
                        fontWeight: 600,
                      }
                    : {
                        color: '#374151',
                      }
                }
                onMouseEnter={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = '#f3f4f6';
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }
                }}
              >
                <i className={`${item.icon} w-5 text-center`} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Logout at bottom */}
        <div className="border-t border-gray-100 p-2">
          <Link
            to="/"
            title={collapsed ? 'Logout' : undefined}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-500 hover:bg-red-50 transition"
          >
            <i className="fas fa-sign-out-alt w-5 text-center" />
            {!collapsed && <span>Logout</span>}
          </Link>
        </div>
      </aside>
    </>
  );
}
