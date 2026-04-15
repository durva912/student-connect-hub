const API_PREFIX = import.meta.env.VITE_API_BASE ?? '';

export type AuthUser = { id: number; name: string; email: string };

export type AuthResponse = {
  access_token: string;
  token_type: string;
  user: AuthUser;
};

function parseErrorDetail(data: unknown): string {
  if (!data || typeof data !== 'object') return 'Request failed';
  const d = data as { detail?: unknown };
  if (typeof d.detail === 'string') return d.detail;
  if (Array.isArray(d.detail) && d.detail[0] && typeof d.detail[0] === 'object') {
    const first = d.detail[0] as { msg?: string };
    if (typeof first.msg === 'string') return first.msg;
  }
  return 'Request failed';
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const t = getAuthToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (t) headers.Authorization = `Bearer ${t}`;
  const res = await fetch(`${API_PREFIX}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(parseErrorDetail(data));
  return data as T;
}

export const AUTH_TOKEN_KEY = 'sc_auth_token';
export const AUTH_USER_KEY = 'sc_user';

export function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function saveSession(auth: AuthResponse) {
  localStorage.setItem(AUTH_TOKEN_KEY, auth.access_token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(auth.user));
}

export function clearSession() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

export async function apiGet<T>(path: string): Promise<T> {
  const t = getAuthToken();
  const res = await fetch(`${API_PREFIX}${path}`, {
    headers: t ? { Authorization: `Bearer ${t}` } : {},
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(parseErrorDetail(data));
  return data as T;
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const t = getAuthToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (t) headers.Authorization = `Bearer ${t}`;
  const res = await fetch(`${API_PREFIX}${path}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(parseErrorDetail(data));
  return data as T;
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const t = getAuthToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (t) headers.Authorization = `Bearer ${t}`;
  const res = await fetch(`${API_PREFIX}${path}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(parseErrorDetail(data));
  return data as T;
}

export async function apiDelete<T = void>(path: string): Promise<T> {
  const t = getAuthToken();
  const res = await fetch(`${API_PREFIX}${path}`, {
    method: 'DELETE',
    headers: t ? { Authorization: `Bearer ${t}` } : {},
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(parseErrorDetail(data));
  return data as T;
}

export function getAuthUser(): AuthUser | null {
  try {
    const s = localStorage.getItem(AUTH_USER_KEY);
    if (!s) return null;
    return JSON.parse(s) as AuthUser;
  } catch {
    return null;
  }
}

/** Numeric user id for API UI (localStorage user or JWT `sub`). */
export function getAuthUserId(): number | null {
  const u = getAuthUser();
  if (u != null && u.id != null) {
    const n = typeof u.id === 'number' ? u.id : parseInt(String(u.id), 10);
    if (Number.isFinite(n)) return n;
  }
  const t = getAuthToken();
  if (!t) return null;
  try {
    const part = t.split('.')[1];
    if (!part) return null;
    let b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const rem = b64.length % 4;
    if (rem) b64 += '='.repeat(4 - rem);
    const json = atob(b64);
    const payload = JSON.parse(json) as { sub?: string | number };
    const sub = payload.sub;
    if (sub == null) return null;
    const n = typeof sub === 'number' ? sub : parseInt(String(sub), 10);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

/** API blog list row */
export type BlogListItem = {
  id: number;
  title: string;
  excerpt: string;
  author_id: number;
  author_name: string;
  category: string;
  read_time: string;
  date: string;
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
};

export type BlogComment = {
  id: number;
  body: string;
  author_id: number;
  author_name: string;
  created_at: string;
  updated_at: string;
  is_mine: boolean;
};

export type BlogDetail = {
  id: number;
  title: string;
  content: string;
  author_id: number;
  author_name: string;
  category: string;
  read_time: string;
  date: string;
  like_count: number;
  liked_by_me: boolean;
  comments: BlogComment[];
};

export type LikeState = { liked: boolean; like_count: number };

/** Feed post (API) — not the same as local store Post */
export type FeedPostItem = {
  id: number;
  excerpt: string;
  author_id: number;
  author_name: string;
  author_avatar: string;
  date: string;
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
  has_image: boolean;
};

export type FeedPostDetail = {
  id: number;
  content: string;
  image: string;
  author_id: number;
  author_name: string;
  date: string;
  like_count: number;
  liked_by_me: boolean;
  comments: BlogComment[];
};

/** Public profile directory row from GET /api/profiles/search */
export type ProfileSearchRow = {
  user_id: number;
  name: string;
  email: string;
  major: string;
  year: string;
  interests: string[];
  skills: string[];
};

export type PublicPostSnippet = { id: number; excerpt: string; date: string };
export type PublicBlogSnippet = { id: number; title: string; date: string; read_time: string };

/** GET /api/profiles/public/{user_id} */
export type PublicProfile = {
  user_id: number;
  name: string;
  major: string;
  year: string;
  bio: string;
  interests: string[];
  skills: string[];
  linkedin: string;
  github: string;
  teammate_active: boolean;
  posts: PublicPostSnippet[];
  blogs: PublicBlogSnippet[];
};

export type TeammateWithState = {
  profile_teammate_active: boolean;
  outgoing_pending: boolean;
  incoming_pending: boolean;
  can_send_teammate_request: boolean;
};

export type ChatMessageRow = {
  id: number;
  from_user_id: number;
  to_user_id: number;
  from_name: string;
  body: string;
  created_at: string;
  teammate_request_id: number | null;
  teammate_status: string | null;
  /** When the recipient read this message (set for outgoing messages). */
  read_at?: string | null;
};

export type ChatPartnerRow = {
  user_id: number;
  name: string;
  last_message: string;
  last_at: string;
  unread_count?: number;
};

export type ChatBlocksResponse = {
  blocked_user_ids: number[];
  blocked_by_user_ids: number[];
};
