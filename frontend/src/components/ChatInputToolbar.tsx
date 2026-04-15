import { useState, useRef, useEffect } from 'react';

interface ChatInputToolbarProps {
  onEmojiSelect: (emoji: string) => void;
  onImageUpload: (files: FileList) => void;
  onVideoUpload: (files: FileList) => void;
  onDocumentUpload: (files: FileList) => void;
  onAudioUpload: (files: FileList) => void;
  onClose?: () => void;
  /** Inline row inside the composer; omit floating panel + click-outside close. */
  variant?: 'floating' | 'inline';
}

const emojis = [
  '😀', '😂', '😍', '😘', '😢', '😡', '👍', '👎',
  '🔥', '💯', '✨', '🎉', '🎈', '🎁', '💝', '🌟',
  '⭐', '💪', '🤔', '😎', '🤩', '😳', '🥳', '😻',
];

export default function ChatInputToolbar({
  onEmojiSelect,
  onImageUpload,
  onVideoUpload,
  onDocumentUpload,
  onAudioUpload,
  onClose,
  variant = 'floating',
}: ChatInputToolbarProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const inline = variant === 'inline';

  useEffect(() => {
    if (inline || !onClose) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, inline]);

  return (
    <div
      ref={toolbarRef}
      className={
        inline
          ? 'flex items-center gap-0.5'
          : 'flex items-center gap-2 absolute bottom-12 left-0 right-0 px-3 py-2 bg-white/95 dark:bg-slate-900/95 border-t border-white/20'
      }
    >
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          title="Add emoji"
          className={`${inline ? 'p-1.5' : 'p-2'} hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition`}
        >
          <i className={`fas fa-smile ${inline ? 'text-base' : 'text-lg'} opacity-70`} />
        </button>
        {showEmojiPicker && (
          <div
            className={`absolute ${inline ? 'bottom-9' : 'bottom-10'} left-0 z-[200] grid grid-cols-8 gap-1 rounded-lg bg-white/95 p-3 shadow-lg dark:bg-slate-900/95`}
          >
            {emojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onEmojiSelect(emoji);
                  setShowEmojiPicker(false);
                }}
                className="text-xl hover:scale-125 transition"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      <label
        title="Upload image"
        className={`${inline ? 'p-1.5' : 'p-2'} hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer transition`}
      >
        <i className={`fas fa-image ${inline ? 'text-base' : 'text-lg'} opacity-70`} />
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => e.currentTarget.files && onImageUpload(e.currentTarget.files)}
          className="hidden"
        />
      </label>

      <label
        title="Upload video"
        className={`${inline ? 'p-1.5' : 'p-2'} hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer transition`}
      >
        <i className={`fas fa-video ${inline ? 'text-base' : 'text-lg'} opacity-70`} />
        <input
          type="file"
          multiple
          accept="video/*"
          onChange={(e) => e.currentTarget.files && onVideoUpload(e.currentTarget.files)}
          className="hidden"
        />
      </label>

      <label
        title="Upload document"
        className={`${inline ? 'p-1.5' : 'p-2'} hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer transition`}
      >
        <i className={`fas fa-file ${inline ? 'text-base' : 'text-lg'} opacity-70`} />
        <input
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.txt,.xlsx,.xls,.ppt,.pptx"
          onChange={(e) => e.currentTarget.files && onDocumentUpload(e.currentTarget.files)}
          className="hidden"
        />
      </label>

      <label
        title="Send audio"
        className={`${inline ? 'p-1.5' : 'p-2'} hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer transition`}
      >
        <i className={`fas fa-microphone ${inline ? 'text-base' : 'text-lg'} opacity-70`} />
        <input
          type="file"
          multiple
          accept="audio/*"
          onChange={(e) => e.currentTarget.files && onAudioUpload(e.currentTarget.files)}
          className="hidden"
        />
      </label>
    </div>
  );
}
