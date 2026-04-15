import { Link } from 'react-router-dom';
import Footer from '../components/Footer';

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <nav className="glass-card m-4 md:m-8 p-4 flex justify-between items-center">
        <span className="text-xl font-bold" style={{ color: 'var(--color-primary)' }}>StudentConnect</span>
        <div className="flex items-center gap-4">
          <Link to="/login" className="btn-secondary text-sm">Log In</Link>
          <Link to="/signup" className="btn-primary text-sm">Sign Up</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="page-container text-center py-20 md:py-32">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6" style={{ color: 'hsl(215, 25%, 15%)' }}>
          Build Your <span style={{ color: 'var(--color-primary)' }}>Campus Network</span>
        </h1>
        <p className="text-lg md:text-xl opacity-70 max-w-2xl mx-auto mb-10">
          Connect with fellow students at KJSIT. Share ideas, collaborate on projects, and grow your professional network.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link to="/signup" className="btn-primary text-lg px-8 py-3">
            <i className="fas fa-rocket" /> Get Started
          </Link>
          <Link to="/aboutus" className="btn-secondary text-lg px-8 py-3">
            <i className="fas fa-info-circle" /> Learn More
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 max-w-3xl mx-auto">
          {[
            { icon: 'fas fa-users', num: '500+', label: 'Students' },
            { icon: 'fas fa-file-alt', num: '1,200+', label: 'Posts Shared' },
            { icon: 'fas fa-blog', num: '300+', label: 'Blogs Written' },
          ].map(s => (
            <div key={s.label} className="glass-card p-6 text-center">
              <i className={`${s.icon} text-3xl mb-3`} style={{ color: 'var(--color-primary)' }} />
              <div className="text-3xl font-bold">{s.num}</div>
              <div className="text-sm opacity-60">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="page-container py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Why StudentConnect?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: 'fas fa-project-diagram', title: 'Collaborate', desc: 'Find teammates for hackathons, projects, and study groups.' },
            { icon: 'fas fa-pen-fancy', title: 'Share Knowledge', desc: 'Write blogs and posts to share your expertise with peers.' },
            { icon: 'fas fa-network-wired', title: 'Grow Your Network', desc: 'Connect with students across departments and years.' },
          ].map(f => (
            <div key={f.title} className="glass-card p-8 text-center">
              <i className={`${f.icon} text-4xl mb-4`} style={{ color: 'var(--color-primary)' }} />
              <h3 className="text-xl font-bold mb-2">{f.title}</h3>
              <p className="text-sm opacity-60">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="page-container">
        <Footer />
      </div>
    </div>
  );
}
