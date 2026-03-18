import { useState } from 'react';
import Layout from '../components/Layout';
import { SC, seedData } from '../lib/store';
import { Link } from 'react-router-dom';

const people = [
  { name: 'Aarav Sharma', major: 'Computer Engineering', year: '3rd Year', interests: ['AI/ML', 'Web Dev'] },
  { name: 'Sneha Gupta', major: 'Information Technology', year: '2nd Year', interests: ['Design', 'React'] },
  { name: 'Raj Deshmukh', major: 'AI & Data Science', year: '4th Year', interests: ['Open Source', 'Python'] },
  { name: 'Priya Patel', major: 'Electronics & Telecom', year: '3rd Year', interests: ['IoT', 'Embedded'] },
  { name: 'Vikram Singh', major: 'Computer Engineering', year: '1st Year', interests: ['Gaming', 'C++'] },
];

export default function SearchPage() {
  const [query, setQuery] = useState('');

  const filtered = people.filter(p =>
    query === '' || p.name.toLowerCase().includes(query.toLowerCase()) || p.major.toLowerCase().includes(query.toLowerCase()) || p.interests.some(i => i.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <div className="glass-card p-4 sticky top-4 z-30 mb-6">
          <div className="relative">
            <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 opacity-40" />
            <input className="glass-input pl-11" placeholder="Search students, majors, interests..." value={query} onChange={e => setQuery(e.target.value)} autoFocus />
          </div>
          <div className="flex gap-2 mt-3">
            <Link to="/filter" className="btn-secondary text-xs"><i className="fas fa-filter" /> Advanced Filter</Link>
          </div>
        </div>

        <div className="space-y-4">
          {filtered.map(p => (
            <Link key={p.name} to="/publicviewprofile" className="glass-card p-5 flex items-center gap-4 hover:bg-white/30 transition block">
              <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm shrink-0" style={{ background: 'var(--color-primary)', color: 'white' }}>
                {p.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">{p.name}</div>
                <div className="text-xs opacity-50">{p.major} · {p.year}</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {p.interests.map(i => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(12,69,241,0.1)', color: 'var(--color-primary)' }}>{i}</span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
          {filtered.length === 0 && <div className="text-center p-12 opacity-50">No students found matching "{query}"</div>}
        </div>
      </div>
    </Layout>
  );
}
