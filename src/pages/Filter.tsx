import { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';

export default function FilterPage() {
  const [filters, setFilters] = useState({ major: '', year: '', interest: '' });

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="glass-card p-8">
          <h1 className="text-2xl font-bold mb-6">Advanced Filter</h1>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Major</label>
              <select className="glass-input" value={filters.major} onChange={e => setFilters({ ...filters, major: e.target.value })}>
                <option value="">All Majors</option>
                <option>Computer Engineering</option>
                <option>Information Technology</option>
                <option>Electronics & Telecom</option>
                <option>AI & Data Science</option>
                <option>Mechanical Engineering</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Year</label>
              <select className="glass-input" value={filters.year} onChange={e => setFilters({ ...filters, year: e.target.value })}>
                <option value="">All Years</option>
                <option>1st Year</option>
                <option>2nd Year</option>
                <option>3rd Year</option>
                <option>4th Year</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Interest</label>
              <input className="glass-input" placeholder="e.g. AI, Web Development" value={filters.interest} onChange={e => setFilters({ ...filters, interest: e.target.value })} />
            </div>
            <div className="flex gap-3">
              <Link to="/search" className="btn-primary flex-1"><i className="fas fa-search" /> Apply Filters</Link>
              <button className="btn-secondary flex-1" onClick={() => setFilters({ major: '', year: '', interest: '' })}>
                <i className="fas fa-times" /> Clear
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
