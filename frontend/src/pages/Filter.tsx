import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';

const MAJORS = [
  'Computer Engineering',
  'Information Technology',
  'Electronics & Telecom',
  'AI & Data Science',
  'Mechanical Engineering',
];

const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

export default function FilterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    major: '',
    year: '',
    interest: '',
  });

  useEffect(() => {
    setFilters({
      major: searchParams.get('major') || '',
      year: searchParams.get('year') || '',
      interest: searchParams.get('interest') || '',
    });
  }, [searchParams]);

  const apply = () => {
    const sp = new URLSearchParams();
    if (filters.major) sp.set('major', filters.major);
    if (filters.year) sp.set('year', filters.year);
    if (filters.interest.trim()) sp.set('interest', filters.interest.trim());
    const qs = sp.toString();
    navigate(qs ? `/search?${qs}` : '/search');
  };

  const clear = () => {
    setFilters({ major: '', year: '', interest: '' });
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="glass-card p-8">
          <h1 className="text-2xl font-bold mb-6">Advanced Filter</h1>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Major</label>
              <select
                className="glass-input"
                value={filters.major}
                onChange={e => setFilters({ ...filters, major: e.target.value })}
              >
                <option value="">All Majors</option>
                {MAJORS.map(m => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Year</label>
              <select
                className="glass-input"
                value={filters.year}
                onChange={e => setFilters({ ...filters, year: e.target.value })}
              >
                <option value="">All Years</option>
                {YEARS.map(y => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Interest</label>
              <input
                className="glass-input"
                placeholder="e.g. AI, Web Development"
                value={filters.interest}
                onChange={e => setFilters({ ...filters, interest: e.target.value })}
              />
            </div>
            <div className="flex gap-3">
              <button type="button" className="btn-primary flex-1" onClick={apply}>
                <i className="fas fa-search" /> Apply Filters
              </button>
              <button type="button" className="btn-secondary flex-1" onClick={clear}>
                <i className="fas fa-times" /> Clear
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
