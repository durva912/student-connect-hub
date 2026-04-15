import { useRef, useEffect } from 'react';

export interface ForwardPartnerOption {
  user_id: number;
  name: string;
}

interface ForwardMessageDialogProps {
  open: boolean;
  title?: string;
  partners: ForwardPartnerOption[];
  excludeUserId: number | null;
  onClose: () => void;
  onSelect: (toUserId: number) => void;
}

export default function ForwardMessageDialog({
  open,
  title = 'Forward to',
  partners,
  excludeUserId,
  onClose,
  onSelect,
}: ForwardMessageDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const list = partners.filter((p) => p.user_id !== excludeUserId);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div
        ref={panelRef}
        className="max-h-[min(420px,70vh)] w-full max-w-sm overflow-hidden rounded-xl border border-white/15 bg-white/95 shadow-xl dark:bg-slate-900/95"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h3 className="text-sm font-semibold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-2 hover:bg-white/10"
            aria-label="Close"
          >
            <i className="fas fa-times" />
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {list.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm opacity-50">No other conversations yet.</p>
          ) : (
            list.map((p) => (
              <button
                key={p.user_id}
                type="button"
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={() => {
                  onSelect(p.user_id);
                  onClose();
                }}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-primary-foreground"
                  style={{ background: 'var(--color-primary)' }}
                >
                  {p.name
                    .split(/\s+/)
                    .filter(Boolean)
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase() || '?'}
                </span>
                <span className="truncate font-medium">{p.name}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
