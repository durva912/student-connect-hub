/** Inline media encoding for chat bodies (API thread). */

export const SC_MEDIA_PREFIX = 'SCMEDIA|';

export type ScMediaKind = 'image' | 'video' | 'audio' | 'document';

export function buildScMediaBody(
  kind: ScMediaKind,
  fileName: string,
  dataUrl: string,
  caption: string
): string {
  const name = fileName.replace(/\r|\n|\|/g, '_').slice(0, 200);
  const cap = caption.trim();
  return `${SC_MEDIA_PREFIX}${kind}|${name}\n${dataUrl}${cap ? `\n${cap}` : ''}`;
}

export function parseScMediaMessage(body: string): {
  kind: ScMediaKind | string;
  name: string;
  dataUrl: string;
  caption: string;
} | null {
  if (!body.startsWith(SC_MEDIA_PREFIX)) return null;
  const lines = body.split('\n');
  if (lines.length < 2) return null;
  const head = lines[0].slice(SC_MEDIA_PREFIX.length);
  const pipe = head.indexOf('|');
  if (pipe === -1) return null;
  const kind = head.slice(0, pipe);
  const name = head.slice(pipe + 1);
  const dataUrl = lines[1];
  if (!dataUrl.startsWith('data:')) return null;
  const caption = lines.slice(2).join('\n');
  return { kind, name, dataUrl, caption };
}

export function scMediaKindToGalleryType(
  k: string
): 'image' | 'video' | 'document' | 'audio' {
  if (k === 'image') return 'image';
  if (k === 'video') return 'video';
  if (k === 'audio') return 'audio';
  return 'document';
}
