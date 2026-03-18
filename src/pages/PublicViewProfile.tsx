import Layout from '../components/Layout';

export default function PublicViewProfilePage() {
  const profile = {
    name: 'Aarav Sharma',
    major: 'Computer Engineering',
    year: '3rd Year',
    bio: 'Passionate about AI/ML and open source. Always looking for collaborators!',
    interests: ['AI/ML', 'Web Development', 'Open Source', 'Robotics'],
    skills: ['Python', 'TensorFlow', 'React', 'Node.js'],
    linkedin: 'https://linkedin.com',
    github: 'https://github.com',
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="glass-card p-8 text-center">
          <div className="w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center font-bold text-2xl" style={{ background: 'var(--color-primary)', color: 'white' }}>AS</div>
          <h1 className="text-2xl font-bold">{profile.name}</h1>
          <p className="text-sm opacity-60">{profile.major} · {profile.year}</p>
          <p className="text-sm mt-2 max-w-md mx-auto opacity-70">{profile.bio}</p>
          <div className="flex gap-4 justify-center mt-4">
            {profile.linkedin && <a href={profile.linkedin} target="_blank" rel="noreferrer" className="opacity-60 hover:opacity-100"><i className="fab fa-linkedin text-xl" /></a>}
            {profile.github && <a href={profile.github} target="_blank" rel="noreferrer" className="opacity-60 hover:opacity-100"><i className="fab fa-github text-xl" /></a>}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-card p-6">
            <h3 className="font-bold text-sm mb-3">Interests</h3>
            <div className="flex flex-wrap gap-2">
              {profile.interests.map(i => (
                <span key={i} className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: 'rgba(12,69,241,0.1)', color: 'var(--color-primary)' }}>{i}</span>
              ))}
            </div>
          </div>
          <div className="glass-card p-6">
            <h3 className="font-bold text-sm mb-3">Skills</h3>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map(s => (
                <span key={s} className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>{s}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
