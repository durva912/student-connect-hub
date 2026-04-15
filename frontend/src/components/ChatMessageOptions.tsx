export interface ChatMessageOption {
  id: string;
  label: string;
  icon: string;
  color?: string;
  onClick: () => void;
}

interface ChatMessageOptionsProps {
  options: ChatMessageOption[];
  onClose: () => void;
}

/**
 * Message action menu — same presentation as MessageInfo (centered modal, dimmed backdrop).
 */
export default function ChatMessageOptions({ options, onClose }: ChatMessageOptionsProps) {
  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Message options"
        className="w-full max-w-sm rounded-lg bg-white/95 p-4 shadow-lg dark:bg-slate-900/95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Message options</h3>

          <div className="space-y-3 text-sm">
            {options.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  option.onClick();
                  onClose();
                }}
                className={`flex w-full items-center gap-3 rounded bg-white/10 p-3 text-left transition hover:bg-white/15 dark:hover:bg-white/10 ${
                  option.color || 'text-slate-700 dark:text-slate-300'
                }`}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 dark:bg-white/5">
                  <i className={`fas fa-${option.icon}`} />
                </span>
                <span className="font-medium">{option.label}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full rounded bg-blue-500/20 px-3 py-2 text-sm font-medium transition hover:bg-blue-500/30"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
