import { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import { Link, useSearchParams } from 'react-router-dom';
import { apiGet, type ProfileSearchRow } from '@/lib/api';

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const major = searchParams.get('major') || '';
  const year = searchParams.get('year') || '';
  const interest = searchParams.get('interest') || '';

  const [qInput, setQInput] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).get('q') || '';
    } catch {
      return '';
    }
  });
  useEffect(() => {
    if (searchParams.has('q')) setQInput(searchParams.get('q') || '');
  }, [searchParams]);

  const debouncedQ = useDebounced(qInput, 350);
  const [rows, setRows] = useState<ProfileSearchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const sp = new URLSearchParams();
    if (debouncedQ.trim()) sp.set('q', debouncedQ.trim());
    if (major) sp.set('major', major);
    if (year) sp.set('year', year);
    if (interest.trim()) sp.set('interest', interest.trim());
    return sp.toString();
  }, [debouncedQ, major, year, interest]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    const path = queryString ? `/api/profiles/search?${queryString}` : '/api/profiles/search';
    apiGet<ProfileSearchRow[]>(path)
      .then(data => {
        if (!cancelled) setRows(data);
      })
      .catch(e => {
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : 'Search failed');
          setRows([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [queryString]);

  const hasActiveFilters = Boolean(major || year || interest.trim());

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <div className="glass-card p-4 sticky top-4 z-30 mb-6">
          <div className="relative">
            <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 opacity-40" />
            <input
              className="glass-input pl-11"
              placeholder="Search students, majors, interests..."
              value={qInput}
              onChange={e => setQInput(e.target.value)}
              autoFocus
            />
          </div>
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 mt-3 text-xs">
              {major && (
                <span className="px-2 py-1 rounded-full bg-white/20">
                  Major: {major}
                </span>
              )}
              {year && (
                <span className="px-2 py-1 rounded-full bg-white/20">
                  Year: {year}
                </span>
              )}
              {interest.trim() && (
                <span className="px-2 py-1 rounded-full bg-white/20">
                  Interest: {interest.trim()}
                </span>
              )}
              <Link to="/search" className="px-2 py-1 rounded-full opacity-70 hover:opacity-100">
                Clear filters
              </Link>
            </div>
          )}
          <div className="flex gap-2 mt-3">
            <Link to="/filter" className="btn-secondary text-xs">
              <i className="fas fa-filter" /> Advanced Filter
            </Link>
          </div>
        </div>

        <div className="space-y-4">
          {loading && (
            <div className="text-center p-12 opacity-50">Searching…</div>
          )}
          {!loading && err && (
            <div className="text-center p-12 text-red-600/90 text-sm">{err}</div>
          )}
          {!loading &&
            !err &&
            rows.map(p => (
              <Link
                key={p.user_id}
                to={`/publicviewprofile?userId=${p.user_id}&name=${encodeURIComponent(p.name)}`}
                className="glass-card p-5 flex items-center gap-4 hover:bg-white/30 transition block"
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                  style={{ background: 'var(--color-primary)', color: 'white' }}
                >
                  {p.name
                    .split(/\s+/)
                    .filter(Boolean)
                    .map(n => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{p.name}</div>
                  <div className="text-xs opacity-50">
                    {p.major || '—'} {p.year ? `· ${p.year}` : ''}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {p.interests.slice(0, 6).map(i => (
                      <span
                        key={i}
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          background: 'rgba(12,69,241,0.1)',
                          color: 'var(--color-primary)',
                        }}
                      >
                        {i}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          {!loading && !err && rows.length === 0 && (
            <div className="text-center p-12 opacity-50">
              No students found
              {debouncedQ.trim() ? ` matching “${debouncedQ.trim()}”` : ''}.
              {hasActiveFilters ? ' Try clearing filters or broadening your search.' : ''}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
