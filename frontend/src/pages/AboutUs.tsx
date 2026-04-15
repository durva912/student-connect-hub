import Layout from '../components/Layout';

export default function AboutUsPage() {
  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="glass-card p-8 text-center">
          <h1 className="text-3xl font-bold mb-4" style={{ color: 'var(--color-primary)' }}>About StudentConnect</h1>
          <p className="text-sm leading-relaxed opacity-70 max-w-xl mx-auto">
            StudentConnect is a platform built by and for students at K. J. Somaiya Institute of Technology.
            Our mission is to foster collaboration, knowledge sharing, and professional networking among peers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: 'fas fa-bullseye', title: 'Mission', desc: 'Empower students to connect, collaborate, and create meaningful relationships that extend beyond the classroom.' },
            { icon: 'fas fa-eye', title: 'Vision', desc: 'A campus where every student has access to a supportive network of peers, mentors, and opportunities.' },
            { icon: 'fas fa-heart', title: 'Values', desc: 'Inclusivity, collaboration, innovation, and a commitment to student growth and well-being.' },
          ].map(item => (
            <div key={item.title} className="glass-card p-6 text-center">
              <i className={`${item.icon} text-3xl mb-3`} style={{ color: 'var(--color-primary)' }} />
              <h3 className="font-bold mb-2">{item.title}</h3>
              <p className="text-sm opacity-60">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="glass-card p-8">
          <h2 className="text-xl font-bold mb-6 text-center">Our Team</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {['Aarav Sharma', 'Sneha Gupta', 'Raj Deshmukh', 'Priya Patel'].map(name => (
              <div key={name} className="text-center">
                <div className="w-16 h-16 rounded-full mx-auto mb-2 flex items-center justify-center font-bold" style={{ background: 'var(--color-primary)', color: 'white' }}>
                  {name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="font-semibold text-sm">{name}</div>
                <div className="text-xs opacity-50">Developer</div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-8 text-center">
          <h2 className="text-xl font-bold mb-4">KJSIT</h2>
          <p className="text-sm opacity-60 mb-4">K. J. Somaiya Institute of Technology, Sion, Mumbai</p>
          <a href="https://kjsit.somaiya.edu.in" target="_blank" rel="noreferrer" className="btn-primary">
            <i className="fas fa-external-link-alt" /> Visit KJSIT Website
          </a>
        </div>
      </div>
    </Layout>
  );
}
