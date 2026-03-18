import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="glass-card mt-12 p-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <h3 className="font-bold text-lg mb-3" style={{ color: 'var(--color-primary)' }}>StudentConnect</h3>
          <p className="text-sm opacity-70">Connecting students at KJSIT. Share ideas, collaborate, and grow together.</p>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Quick Links</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/homepage" className="hover:opacity-70">Dashboard</Link></li>
            <li><Link to="/readblog" className="hover:opacity-70">Blogs</Link></li>
            <li><Link to="/all-posts" className="hover:opacity-70">Posts</Link></li>
            <li><Link to="/faqs" className="hover:opacity-70">FAQs</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3">KJSIT</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="https://kjsit.somaiya.edu.in" target="_blank" rel="noreferrer" className="hover:opacity-70">Official Website</a></li>
            <li><a href="https://kjsit.somaiya.edu.in/en/admission" target="_blank" rel="noreferrer" className="hover:opacity-70">Admissions</a></li>
            <li><Link to="/aboutus" className="hover:opacity-70">About Us</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Connect</h4>
          <div className="flex gap-4 text-lg">
            <a href="#" className="hover:opacity-70"><i className="fab fa-twitter" /></a>
            <a href="#" className="hover:opacity-70"><i className="fab fa-instagram" /></a>
            <a href="#" className="hover:opacity-70"><i className="fab fa-linkedin" /></a>
            <a href="#" className="hover:opacity-70"><i className="fab fa-github" /></a>
          </div>
        </div>
      </div>
      <div className="text-center text-sm opacity-50 mt-8 pt-4 border-t border-white/10">
        © 2026 StudentConnect — KJSIT. All rights reserved.
      </div>
    </footer>
  );
}
