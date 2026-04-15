import { Link } from 'react-router-dom';

/** Strip trailing punctuation often stuck to URLs in chat */
function stripEdgePunctuation(s: string): { core: string; suffix: string } {
  const m = s.match(/^(.*?)([.,;:!?)\]]*)$/);
  if (!m) return { core: s, suffix: '' };
  return { core: m[1], suffix: m[2] };
}

function sameOriginPath(urlStr: string): string | null {
  try {
    const u = new URL(urlStr);
    if (typeof window !== 'undefined' && u.origin === window.location.origin) {
      return u.pathname + u.search;
    }
  } catch {
    /* not absolute URL */
  }
  return null;
}

/** Turns /viewpost?id=1, /read_blog?id=2, and same-origin http(s) links into in-app navigation. */
export default function ChatLinkifiedText({ text, isOwn }: { text: string; isOwn?: boolean }) {
  const parts = text.split(/(\s+)/);
  return (
    <span className="whitespace-pre-wrap break-words">
      {parts.map((part, i) => {
        if (!part.trim() || /^\s+$/.test(part)) {
          return <span key={i}>{part}</span>;
        }
        const { core, suffix } = stripEdgePunctuation(part);
        let internalTo: string | null = null;
        if (core.startsWith('/viewpost?') || core.startsWith('/read_blog?')) {
          internalTo = core;
        } else if (/^https?:\/\//i.test(core)) {
          internalTo = sameOriginPath(core);
        }
        const linkClass = `underline font-medium break-all ${isOwn ? 'text-white/95' : 'opacity-95'}`;
        if (internalTo && (internalTo.startsWith('/viewpost') || internalTo.startsWith('/read_blog'))) {
          return (
            <span key={i}>
              <Link to={internalTo} className={linkClass}>
                {core}
              </Link>
              {suffix}
            </span>
          );
        }
        if (/^https?:\/\//i.test(core)) {
          return (
            <span key={i}>
              <a href={core} target="_blank" rel="noopener noreferrer" className={`${linkClass} hover:opacity-100`}>
                {core}
              </a>
              {suffix}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}
