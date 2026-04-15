interface MessageInfoProps {
  sentTime: string;
  deliveredTime?: string;
  /** When the other person read your message (API: read_at). */
  readTime?: string;
  /** If true, show recipient seen / not seen; if false, message is from someone else. */
  isOwnMessage?: boolean;
  onClose: () => void;
}

export default function MessageInfo({
  sentTime,
  deliveredTime,
  readTime,
  isOwnMessage = true,
  onClose,
}: MessageInfoProps) {
  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-lg bg-white/95 p-4 shadow-lg dark:bg-slate-900/95">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Message information</h3>

          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded bg-white/10 p-3">
              <span className="flex items-center gap-2">
                <i className="fas fa-paper-plane text-blue-500" />
                Sent
              </span>
              <span className="max-w-[55%] text-right text-xs opacity-75">{formatTime(sentTime)}</span>
            </div>

            {deliveredTime && (
              <div className="flex items-center justify-between rounded bg-white/10 p-3">
                <span className="flex items-center gap-2">
                  <i className="fas fa-check text-green-500" />
                  Delivered
                </span>
                <span className="max-w-[55%] text-right text-xs opacity-75">{formatTime(deliveredTime)}</span>
              </div>
            )}

            {isOwnMessage && (
              <div className="rounded bg-white/10 p-3">
                <div className="mb-1 flex items-center gap-2">
                  <i className="fas fa-check-double text-sky-500" />
                  <span className="font-medium">Seen by the other person</span>
                </div>
                {readTime ? (
                  <p className="pl-7 text-xs opacity-90">{formatTime(readTime)}</p>
                ) : (
                  <p className="pl-7 text-xs opacity-60">Not seen yet — they have not opened this thread since you sent it.</p>
                )}
              </div>
            )}

            {!isOwnMessage && readTime && (
              <div className="flex items-center justify-between rounded bg-white/10 p-3">
                <span className="flex items-center gap-2">
                  <i className="fas fa-eye text-violet-500" />
                  Read by you
                </span>
                <span className="max-w-[55%] text-right text-xs opacity-75">{formatTime(readTime)}</span>
              </div>
            )}
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
