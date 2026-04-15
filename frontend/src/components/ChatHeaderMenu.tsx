import { useState, useRef, useEffect } from 'react';

interface ChatHeaderMenuProps {
  onSearch: (query: string) => void;
  onViewMedia: () => void;
  onBlockUser: () => void;
  onClearChat: () => void;
  isBlocked?: boolean;
  onUnblockUser?: () => void;
}

export default function ChatHeaderMenu({
  onSearch,
  onViewMedia,
  onBlockUser,
  onClearChat,
  isBlocked = false,
  onUnblockUser,
}: ChatHeaderMenuProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    onSearch(query);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
        setSearchActive(false);
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
        onClick={() => setShowMenu(!showMenu)}
        title="More options"
        className="p-2 hover:bg-white/20 rounded transition"
      >
        <i className="fas fa-ellipsis-h text-lg" />
      </button>

      {showMenu && (
        <div className="absolute right-0 top-10 bg-white/95 dark:bg-slate-900/95 rounded-lg shadow-lg p-2 min-w-max z-50">
          {!searchActive ? (
            <>
              <button
                type="button"
                onClick={() => setSearchActive(true)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-700 dark:text-slate-300"
              >
                <i className="fas fa-search" />
                Search messages
              </button>
              <button
                type="button"
                onClick={() => {
                  onViewMedia();
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-700 dark:text-slate-300"
              >
                <i className="fas fa-images" />
                Media
              </button>
              <hr className="my-1 opacity-10" />
              <button
                type="button"
                onClick={() => {
                  if (isBlocked && onUnblockUser) {
                    onUnblockUser();
                  } else {
                    onBlockUser();
                  }
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-red-100 dark:hover:bg-red-900/20 transition text-red-600 dark:text-red-400"
              >
                <i className={`fas fa-${isBlocked ? 'lock-open' : 'lock'}`} />
                {isBlocked ? 'Unblock' : 'Block'} user
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Delete all messages in this chat?')) {
                    onClearChat();
                  }
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-red-100 dark:hover:bg-red-900/20 transition text-red-600 dark:text-red-400"
              >
                <i className="fas fa-trash" />
                Clear chat
              </button>
            </>
          ) : (
            <div className="px-2 py-1">
              <input
                type="text"
                placeholder="Search messages..."
                autoFocus
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-sm outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  setSearchActive(false);
                  setSearchQuery('');
                  handleSearch('');
                }}
                className="w-full text-xs text-center text-slate-500 mt-1 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
              >
                Close
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
