import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { SC, UserProfile, defaultProfile } from '../lib/store';

export default function CreateProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [newInterest, setNewInterest] = useState('');
  const [newSkill, setNewSkill] = useState('');
  const [preview, setPreview] = useState('');

  useEffect(() => {
    const saved = SC.getOne<UserProfile>('profile');
    if (saved) setProfile(saved);
  }, []);

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        setPreview(result);
        setProfile({ ...profile, avatar: result });
      };
      reader.readAsDataURL(file);
    }
  };

  const addInterest = () => {
    if (newInterest.trim() && !profile.interests.includes(newInterest.trim())) {
      setProfile({ ...profile, interests: [...profile.interests, newInterest.trim()] });
      setNewInterest('');
    }
  };

  const addSkill = () => {
    if (newSkill.trim() && !profile.skills.includes(newSkill.trim())) {
      setProfile({ ...profile, skills: [...profile.skills, newSkill.trim()] });
      setNewSkill('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    SC.setOne('profile', profile);
    navigate('/userviewprofile');
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="glass-card p-8">
          <h1 className="text-2xl font-bold mb-6">Create Your Profile</h1>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-4">
              <div className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center" style={{ background: 'var(--color-primary)', color: 'white' }}>
                {preview || profile.avatar ? (
                  <img src={preview || profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <i className="fas fa-user text-3xl" />
                )}
              </div>
              <label className="btn-secondary cursor-pointer text-sm">
                <i className="fas fa-camera" /> Upload Photo
                <input type="file" accept="image/*" className="hidden" onChange={handleImage} />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input className="glass-input" value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input className="glass-input" type="email" value={profile.email} onChange={e => setProfile({ ...profile, email: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Major</label>
                <select className="glass-input" value={profile.major} onChange={e => setProfile({ ...profile, major: e.target.value })}>
                  <option>Computer Engineering</option>
                  <option>Information Technology</option>
                  <option>Electronics & Telecom</option>
                  <option>AI & Data Science</option>
                  <option>Mechanical Engineering</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Year</label>
                <select className="glass-input" value={profile.year} onChange={e => setProfile({ ...profile, year: e.target.value })}>
                  <option>1st Year</option>
                  <option>2nd Year</option>
                  <option>3rd Year</option>
                  <option>4th Year</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Bio</label>
              <textarea className="glass-input" rows={3} value={profile.bio} onChange={e => setProfile({ ...profile, bio: e.target.value })} placeholder="Tell us about yourself..." />
            </div>

            {/* Interests */}
            <div>
              <label className="block text-sm font-medium mb-2">Interests</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {profile.interests.map(i => (
                  <span key={i} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium" style={{ background: 'rgba(12,69,241,0.1)', color: 'var(--color-primary)' }}>
                    {i}
                    <button type="button" onClick={() => setProfile({ ...profile, interests: profile.interests.filter(x => x !== i) })} className="hover:opacity-70">×</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input className="glass-input" placeholder="Add interest" value={newInterest} onChange={e => setNewInterest(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addInterest())} />
                <button type="button" onClick={addInterest} className="btn-secondary shrink-0"><i className="fas fa-plus" /></button>
              </div>
            </div>

            {/* Skills */}
            <div>
              <label className="block text-sm font-medium mb-2">Skills</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {profile.skills.map(s => (
                  <span key={s} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--color-success)' }}>
                    {s}
                    <button type="button" onClick={() => setProfile({ ...profile, skills: profile.skills.filter(x => x !== s) })} className="hover:opacity-70">×</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input className="glass-input" placeholder="Add skill" value={newSkill} onChange={e => setNewSkill(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())} />
                <button type="button" onClick={addSkill} className="btn-secondary shrink-0"><i className="fas fa-plus" /></button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">LinkedIn</label>
                <input className="glass-input" placeholder="linkedin.com/in/username" value={profile.linkedin} onChange={e => setProfile({ ...profile, linkedin: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">GitHub</label>
                <input className="glass-input" placeholder="github.com/username" value={profile.github} onChange={e => setProfile({ ...profile, github: e.target.value })} />
              </div>
            </div>

            <button type="submit" className="btn-primary w-full py-3">
              <i className="fas fa-save" /> Save Profile
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
