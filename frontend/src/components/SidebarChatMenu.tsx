import { useState, useRef, useEffect } from 'react';

interface SidebarChatMenuProps {
  onPinChat: () => void;
  onUnpinChat?: () => void;
  isPinned?: boolean;
}

export default function SidebarChatMenu({
  onPinChat,
  onUnpinChat,
  isPinned = false,
}: SidebarChatMenuProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setShowMenu(!showMenu);
        }}
        title="Chat options"
        className="p-1 rounded hover:bg-white/10 transition opacity-0 group-hover:opacity-100 md:opacity-100"
      >
        <i className="fas fa-ellipsis-v text-xs" />
      </button>

      {showMenu && (
        <div className="absolute right-0 top-6 bg-white/95 dark:bg-slate-900/95 rounded-lg shadow-lg p-1 z-50 min-w-max">
          <button
            type="button"
            onClick={() => {
              if (isPinned && onUnpinChat) {
                onUnpinChat();
              } else {
                onPinChat();
              }
              setShowMenu(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-700 dark:text-slate-300 whitespace-nowrap"
          >
            <i className={`fas fa-${isPinned ? 'thumbtack fa-rotate-90' : 'thumbtack'}`} />
            {isPinned ? 'Unpin' : 'Pin'} chat
          </button>
        </div>
      )}
    </div>
  );
}
