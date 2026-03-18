import { Link, useLocation } from 'react-router-dom';

const links = [
  { to: '/homepage', label: 'Feed', icon: 'fas fa-home' },
  { to: '/all-posts', label: 'All Posts', icon: 'fas fa-stream' },
  { to: '/readblog', label: 'Blogs', icon: 'fas fa-blog' },
  { to: '/createpost', label: 'New Post', icon: 'fas fa-plus-circle' },
  { to: '/writeblog', label: 'Write Blog', icon: 'fas fa-pen' },
  { to: '/search', label: 'Search', icon: 'fas fa-search' },
  { to: '/filter', label: 'Filter', icon: 'fas fa-filter' },
  { to: '/settings', label: 'Settings', icon: 'fas fa-cog' },
  { to: '/aboutus', label: 'About', icon: 'fas fa-info-circle' },
  { to: '/faqs', label: 'FAQs', icon: 'fas fa-question-circle' },
];

export default function Sidebar() {
  const location = useLocation();
  return (
    <aside className="glass-card p-6 h-fit sticky top-8">
      <ul className="space-y-2">
        {links.map(l => (
          <li key={l.to}>
            <Link to={l.to} className={`nav-link text-sm ${location.pathname === l.to ? 'active' : ''}`}>
              <i className={l.icon} />
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
