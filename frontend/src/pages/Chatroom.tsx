import { useState, useEffect, useRef, useMemo, useCallback, type ReactNode } from 'react';
import { useSearchParams, useLocation, useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import ChatLinkifiedText from '../components/ChatLinkifiedText';
import ChatMessageOptions from '../components/ChatMessageOptions';
import ChatInputToolbar from '../components/ChatInputToolbar';
import ChatHeaderMenu from '../components/ChatHeaderMenu';
import MediaGallery from '../components/MediaGallery';
import MessageInfo from '../components/MessageInfo';
import SidebarChatMenu from '../components/SidebarChatMenu';
import { SC } from '../lib/store';
import {
  apiGet,
  apiPost,
  apiPatch,
  apiDelete,
  getAuthToken,
  getAuthUserId,
  type ChatMessageRow,
  type ChatPartnerRow,
  type ChatBlocksResponse,
  type PublicProfile,
  type ProfileSearchRow,
} from '@/lib/api';
import ForwardMessageDialog from '../components/ForwardMessageDialog';
import { toast } from 'sonner';
import {
  buildScMediaBody,
  parseScMediaMessage,
  scMediaKindToGalleryType,
  type ScMediaKind,
} from '@/lib/chatMedia';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';

const BLOCKED_IDS_KEY = 'sc_chat_blocked_ids';
const DEMO_HIDDEN_MSGS_KEY = 'sc_demo_hidden_message_ids';

function DeleteMessageDialog({
  open,
  isOwn,
  onClose,
  onDeleteForMe,
  onDeleteForEveryone,
}: {
  open: boolean;
  isOwn: boolean;
  onClose: () => void;
  onDeleteForMe: () => void;
  onDeleteForEveryone: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent className="border-white/20 bg-white/95 dark:bg-slate-900/95">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this message?</AlertDialogTitle>
          <AlertDialogDescription className="text-left opacity-90">
            {isOwn ? (
              <>
                <strong>Delete for me</strong> removes it from your view only.{' '}
                <strong>Delete for everyone</strong> removes it for both people in this chat (if they have not
                already downloaded it elsewhere, it will disappear for them too).
              </>
            ) : (
              <>
                <strong>Remove from my view</strong> hides this message only for you. You cannot remove it for the
                other person.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
          <button
            type="button"
            className="btn-primary rounded-md border border-white/20 bg-white/15 px-4 py-2 text-sm hover:bg-white/25"
            onClick={() => {
              onDeleteForMe();
            }}
          >
            {isOwn ? 'Delete for me' : 'Remove from my view'}
          </button>
          {isOwn && (
            <button
              type="button"
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              onClick={() => {
                onDeleteForEveryone();
              }}
            >
              Delete for everyone
            </button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function loadBlockedIds(): Set<number> {
  try {
    const s = localStorage.getItem(BLOCKED_IDS_KEY);
    if (!s) return new Set();
    const a = JSON.parse(s) as unknown;
    if (!Array.isArray(a)) return new Set();
    return new Set(a.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0));
  } catch {
    return new Set();
  }
}

function saveBlockedIds(ids: Set<number>) {
  localStorage.setItem(BLOCKED_IDS_KEY, JSON.stringify([...ids]));
}

function stableNameKey(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (Math.imul(31, h) + name.charCodeAt(i)) | 0;
  return Math.abs(h) + 1_000_000;
}

type MessageMenuOption = {
  id: string;
  label: string;
  icon: string;
  color?: string;
  onClick: () => void;
};

function MessageBubbleWrap({
  showMenu,
  onMenuClose,
  options,
  children,
}: {
  showMenu: boolean;
  onMenuClose: () => void;
  options: MessageMenuOption[];
  children: ReactNode;
}) {
  return (
    <div className="relative max-w-[85%] shrink-0">
      {showMenu && <ChatMessageOptions onClose={onMenuClose} options={options} />}
      {children}
    </div>
  );
}

interface LocalChatMessage {
  id: number;
  from: string;
  to: string;
  text: string;
  date: string;
  delivered?: string;
  read?: string;
  isPinned?: boolean;
  replyTo?: number;
  mediaUrls?: string[];
  mediaTypes?: string[];
}

interface ChatUser {
  name: string;
  avatar: string;
}

interface MediaItem {
  id: string;
  type: 'image' | 'video' | 'document' | 'audio';
  name: string;
  url: string;
  timestamp: string;
}

const sampleUsers: ChatUser[] = [
  { name: 'Aarav Sharma', avatar: 'AS' },
  { name: 'Sneha Gupta', avatar: 'SG' },
  { name: 'Raj Deshmukh', avatar: 'RD' },
  { name: 'Priya Patel', avatar: 'PP' },
  { name: 'Vikram Singh', avatar: 'VS' },
];

function parseTeammateBody(body: string): { isTeammate: boolean; note: string } {
  const prefix = '[Teammate request]';
  if (!body.startsWith(prefix)) {
    return { isTeammate: false, note: body };
  }
  let rest = body.slice(prefix.length).replace(/^[\r\n]+/, '');
  return { isTeammate: true, note: rest };
}

export default function Chatroom() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const userIdParam = searchParams.get('userId');
  const initialUserName = searchParams.get('user') || '';

  const token = getAuthToken();
  const myId = getAuthUserId();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [partners, setPartners] = useState<ChatPartnerRow[]>([]);
  const [profileResults, setProfileResults] = useState<ProfileSearchRow[]>([]);
  const [apiMessages, setApiMessages] = useState<ChatMessageRow[]>([]);
  const [peerName, setPeerName] = useState('');

  const [localMessages, setLocalMessages] = useState<LocalChatMessage[]>([]);
  const [selectedUserName, setSelectedUserName] = useState<string>(initialUserName);
  const [input, setInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [messageSearch, setMessageSearch] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentUserName = SC.getOne<any>('profile')?.name || 'Student User';

  // New state for enhanced features
  const [selectedMessage, setSelectedMessage] = useState<{ id: number; pos: { x: number; y: number }; element?: HTMLElement } | null>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<Set<number>>(() =>
    getAuthToken() ? new Set() : loadBlockedIds()
  );
  /** Peers who blocked you (API only) — they will not receive your messages from server; you also cannot message them. */
  const [blockedByOthers, setBlockedByOthers] = useState<Set<number>>(new Set());
  const [blockedDemoNames, setBlockedDemoNames] = useState<Set<string>>(new Set());
  const [pinnedChats, setPinnedChats] = useState<Set<number>>(new Set());
  const [pinnedDemoNames, setPinnedDemoNames] = useState<Set<string>>(new Set());
  const [pinnedMessages, setPinnedMessages] = useState<Set<number>>(new Set());
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [messageInfo, setMessageInfo] = useState<{ id: number } | null>(null);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [forwardTargetOpen, setForwardTargetOpen] = useState(false);
  const [forwardMessageId, setForwardMessageId] = useState<number | null>(null);
  const [deleteMessagePrompt, setDeleteMessagePrompt] = useState<{ id: number; isOwn: boolean } | null>(null);
  const [hiddenDemoMessageIds, setHiddenDemoMessageIds] = useState<Set<number>>(() => {
    try {
      const s = localStorage.getItem(DEMO_HIDDEN_MSGS_KEY);
      if (!s) return new Set();
      const a = JSON.parse(s) as unknown;
      if (!Array.isArray(a)) return new Set();
      return new Set(a.map((x) => Number(x)).filter((n) => Number.isFinite(n)));
    } catch {
      return new Set();
    }
  });

  const loadPartners = useCallback(() => {
    if (!token) return;
    apiGet<ChatPartnerRow[]>('/api/chat/partners')
      .then((rows) => {
        setPartners(rows);
        const total = rows.reduce((s, p) => s + (p.unread_count ?? 0), 0);
        localStorage.setItem('chat_dm_unread_total', String(total));
        window.dispatchEvent(new Event('unread-messages-updated'));
      })
      .catch(() => {
        setPartners([]);
        localStorage.setItem('chat_dm_unread_total', '0');
        window.dispatchEvent(new Event('unread-messages-updated'));
      });
  }, [token]);

  useEffect(() => {
    loadPartners();
  }, [loadPartners]);

  const loadBlocks = useCallback(async () => {
    if (!token) return;
    try {
      const r = await apiGet<ChatBlocksResponse>('/api/chat/blocks');
      setBlockedUsers(new Set(r.blocked_user_ids));
      setBlockedByOthers(new Set(r.blocked_by_user_ids));
    } catch {
      /* keep current */
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setBlockedUsers(loadBlockedIds());
      setBlockedByOthers(new Set());
      return;
    }
    void loadBlocks();
  }, [token, loadBlocks]);

  useEffect(() => {
    localStorage.setItem(DEMO_HIDDEN_MSGS_KEY, JSON.stringify([...hiddenDemoMessageIds]));
  }, [hiddenDemoMessageIds]);

  useEffect(() => {
    if (userIdParam) {
      const n = parseInt(userIdParam, 10);
      if (Number.isFinite(n) && n > 0) {
        setSelectedId(n);
        return;
      }
    }
    setSelectedId(null);
  }, [userIdParam]);

  useEffect(() => {
    if (!token || !selectedId) {
      setPeerName('');
      return;
    }
    const p = partners.find((x) => x.user_id === selectedId);
    if (p) {
      setPeerName(p.name);
      return;
    }
    apiGet<PublicProfile>(`/api/profiles/public/${selectedId}`)
      .then((prof) => setPeerName(prof.name))
      .catch(() => setPeerName(`User #${selectedId}`));
  }, [token, selectedId, partners]);

  const loadThread = useCallback(() => {
    if (!token || !selectedId || myId == null) return;
    apiGet<ChatMessageRow[]>(`/api/chat/messages?with_user_id=${selectedId}`)
      .then(setApiMessages)
      .catch(() => setApiMessages([]));
  }, [token, selectedId, myId]);

  useEffect(() => {
    loadThread();
    if (!token || !selectedId) return;
    const t = setInterval(loadThread, 4000);
    return () => clearInterval(t);
  }, [loadThread, token, selectedId]);

  useEffect(() => {
    if (!token || !selectedId || myId == null) return;
    let cancelled = false;
    apiPost('/api/chat/mark-read', { with_user_id: selectedId })
      .then(() => {
        if (!cancelled) loadPartners();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [token, selectedId, myId, loadPartners]);

  useEffect(() => {
    if (!selectedUserName || token) return;
    const demoUnread = localStorage.getItem('demo_unread_counts');
    const counts = demoUnread ? JSON.parse(demoUnread) : {};
    if (counts[selectedUserName]) {
      counts[selectedUserName] = 0;
      localStorage.setItem('demo_unread_counts', JSON.stringify(counts));
      window.dispatchEvent(new Event('unread-messages-updated'));
    }
  }, [selectedUserName, token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [apiMessages, localMessages, selectedId, selectedUserName]);

  useEffect(() => {
    if (token) return;
    const all = SC.get<LocalChatMessage>('chat_messages');
    setLocalMessages(all);
  }, [token]);

  // Search for profiles/followers from directory
  useEffect(() => {
    if (!token || !searchTerm.trim()) {
      setProfileResults([]);
      return;
    }

    const delaySearch = setTimeout(() => {
      apiGet<ProfileSearchRow[]>(`/api/profiles/search?q=${encodeURIComponent(searchTerm)}`)
        .then(setProfileResults)
        .catch(() => setProfileResults([]));
    }, 300); // Debounce search

    return () => clearTimeout(delaySearch);
  }, [token, searchTerm]);

  const listPartners = useMemo(() => {
    if (!token || !selectedId) return partners;
    const ids = new Set(partners.map((p) => p.user_id));
    if (!ids.has(selectedId)) {
      return [
        {
          user_id: selectedId,
          name: peerName || `User #${selectedId}`,
          last_message: '…',
          last_at: '',
          unread_count: 0,
        },
        ...partners,
      ];
    }
    return partners;
  }, [partners, selectedId, peerName, token]);

  const sendApiMessage = async () => {
    if (!input.trim() || !selectedId || myId == null) return;
    if (blockedUsers.has(selectedId) || blockedByOthers.has(selectedId)) return;
    let text = input.trim();
    if (replyingTo != null) {
      const ref = apiMessages.find((m) => m.id === replyingTo);
      const q = ref?.body ? ref.body.slice(0, 200).replace(/\n/g, ' ') : '';
      text = q ? `↩ ${q}\n\n${text}` : text;
      setReplyingTo(null);
    }
    setInput('');
    try {
      await apiPost('/api/chat/messages', { to_user_id: selectedId, body: text });
      loadThread();
      loadPartners();
    } catch (e) {
      setInput(text);
      toast.error(e instanceof Error ? e.message : 'Could not send message');
    }
  };

  const sendLocalMessage = () => {
    if (!input.trim() || !selectedUserName) return;
    if (blockedDemoNames.has(selectedUserName)) return;
    let body = input.trim();
    if (replyingTo != null) {
      const ref = localMessages.find((m) => m.id === replyingTo);
      const q = ref?.text ? ref.text.slice(0, 200).replace(/\n/g, ' ') : '';
      body = q ? `↩ ${q}\n\n${body}` : body;
      setReplyingTo(null);
    }
    const newMsg: LocalChatMessage = {
      id: Date.now(),
      from: currentUserName,
      to: selectedUserName,
      text: body,
      date: new Date().toISOString(),
    };
    const updated = [...localMessages, newMsg];
    setLocalMessages(updated);
    SC.set('chat_messages', updated);
    setInput('');
    setTimeout(() => {
      const mineId = newMsg.id;
      const marked = updated.map((m) =>
        m.id === mineId ? { ...m, read: new Date().toISOString() } : m
      );
      const reply: LocalChatMessage = {
        id: Date.now() + 1,
        from: selectedUserName,
        to: currentUserName,
        text: 'Thanks for reaching out! 😊',
        date: new Date().toISOString(),
      };
      const withReply = [...marked, reply];
      setLocalMessages(withReply);
      SC.set('chat_messages', withReply);
    }, 1000);
  };

  const respondTeammate = async (requestId: number, action: 'accept' | 'reject') => {
    try {
      await apiPatch(`/api/teammate-requests/${requestId}/respond`, { action });
      loadThread();
      loadPartners();
    } catch {
      /* ignore */
    }
  };

  const openDeleteMessageDialog = (msgId: number, isOwn: boolean) => {
    setDeleteMessagePrompt({ id: msgId, isOwn });
    setShowContextMenu(false);
    setSelectedMessage(null);
  };

  const confirmDeleteMessage = async (scope: 'me' | 'everyone') => {
    if (!deleteMessagePrompt) return;
    const { id, isOwn } = deleteMessagePrompt;
    setDeleteMessagePrompt(null);
    if (token && selectedId) {
      const visibility = scope === 'everyone' && isOwn ? 'everyone' : 'me';
      try {
        await apiDelete(`/api/chat/messages/${id}?visibility=${visibility}`);
        await loadThread();
        loadPartners();
      } catch {
        /* ignore */
      }
    } else if (scope === 'everyone' && isOwn) {
      const next = localMessages.filter((m) => m.id !== id);
      setLocalMessages(next);
      SC.set('chat_messages', next);
    } else {
      setHiddenDemoMessageIds((prev) => new Set(prev).add(id));
    }
  };

  const handlePinMessage = (msgId: number) => {
    setPinnedMessages((prev) => {
      const n = new Set(prev);
      if (n.has(msgId)) n.delete(msgId);
      else n.add(msgId);
      return n;
    });
  };

  const handleClearChat = async () => {
    if (token && selectedId) {
      try {
        await apiDelete(`/api/chat/thread?with_user_id=${selectedId}`);
        setApiMessages([]);
        loadPartners();
      } catch {
        /* ignore */
      }
    } else if (selectedUserName) {
      const next = localMessages.filter(
        (m) =>
          !((m.from === currentUserName && m.to === selectedUserName) ||
            (m.from === selectedUserName && m.to === currentUserName))
      );
      setLocalMessages(next);
      SC.set('chat_messages', next);
    }
  };

  const handleBlockUser = async () => {
    if (!selectedId) return;
    if (token) {
      const currently = blockedUsers.has(selectedId);
      try {
        await apiPost('/api/chat/block', {
          peer_user_id: selectedId,
          blocked: !currently,
        });
        await loadBlocks();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not update block');
      }
      return;
    }
    const next = new Set(blockedUsers);
    if (next.has(selectedId)) next.delete(selectedId);
    else next.add(selectedId);
    setBlockedUsers(next);
    saveBlockedIds(next);
  };

  const handleBlockDemoUser = () => {
    if (!selectedUserName) return;
    setBlockedDemoNames((prev) => {
      const n = new Set(prev);
      if (n.has(selectedUserName)) n.delete(selectedUserName);
      else n.add(selectedUserName);
      return n;
    });
  };

  const togglePinChatByUserId = (userId: number) => {
    setPinnedChats((prev) => {
      const n = new Set(prev);
      if (n.has(userId)) n.delete(userId);
      else n.add(userId);
      return n;
    });
  };

  const togglePinDemoName = (name: string) => {
    setPinnedDemoNames((prev) => {
      const n = new Set(prev);
      if (n.has(name)) n.delete(name);
      else n.add(name);
      return n;
    });
  };

  const getMediaFromMessages = (): MediaItem[] => {
    const items: MediaItem[] = [];
    const urlRe =
      /(https?:\/\/[^\s<>"']+\.(?:png|jpe?g|gif|webp|mp4|webm|pdf|mp3|wav|ogg|m4a))/gi;

    if (token) {
      apiMessages.forEach((msg) => {
        const parsed = parseScMediaMessage(msg.body || '');
        if (parsed) {
          items.push({
            id: `${msg.id}-sc`,
            type: scMediaKindToGalleryType(parsed.kind),
            name: parsed.name,
            url: parsed.dataUrl,
            timestamp: msg.created_at,
          });
        }
        const urls = msg.body?.match(urlRe) || [];
        urls.forEach((url, idx) => {
          const lower = url.toLowerCase();
          let type: MediaItem['type'] = 'document';
          if (/\.(png|jpe?g|gif|webp)$/i.test(lower)) type = 'image';
          else if (/\.(mp4|webm)$/i.test(lower)) type = 'video';
          else if (/\.(mp3|wav|ogg|m4a)$/i.test(lower)) type = 'audio';
          items.push({
            id: `${msg.id}-l-${idx}`,
            type,
            name: decodeURIComponent(url.split('/').pop() || url).slice(0, 80),
            url,
            timestamp: msg.created_at,
          });
        });
      });
      return items;
    }

    const threadLocal = selectedUserName
      ? localMessages.filter(
          (m) =>
            (m.from === currentUserName && m.to === selectedUserName) ||
            (m.from === selectedUserName && m.to === currentUserName)
        )
      : localMessages;

    threadLocal.forEach((msg) => {
      msg.mediaUrls?.forEach((url: string, idx: number) => {
        items.push({
          id: `${msg.id}-${idx}`,
          type: (msg.mediaTypes?.[idx] as MediaItem['type']) || 'image',
          name: url.split('/').pop() || 'File',
          url,
          timestamp: msg.date,
        });
      });
    });

    return items;
  };

  const handleEmojiSelect = (emoji: string) => {
    setInput((prev) => prev + emoji);
  };

  /** Inline data URLs in message body; keep under backend max (~2MB) with margin. */
  const MAX_INLINE_FILE_BYTES = 450_000;

  const handleFileUpload = (
    files: FileList,
    type: 'image' | 'video' | 'document' | 'audio'
  ) => {
    if (!files?.length) return;
    if (!token && selectedUserName) {
      Array.from(files).forEach((file, idx) => {
        const reader = new FileReader();
        reader.onload = () => {
          const url = String(reader.result || '');
          const isImg = type === 'image' || file.type.startsWith('image/');
          const isVid = type === 'video' || file.type.startsWith('video/');
          const isAud = type === 'audio' || file.type.startsWith('audio/');
          const mediaTypes = [
            isImg ? 'image' : isVid ? 'video' : isAud ? 'audio' : 'document',
          ] as string[];
          const mediaUrls = [url];
          const newMsg: LocalChatMessage = {
            id: Date.now() + idx,
            from: currentUserName,
            to: selectedUserName,
            text: file.name,
            date: new Date().toISOString(),
            mediaUrls,
            mediaTypes,
          };
          setLocalMessages((prev) => {
            const u = [...prev, newMsg];
            SC.set('chat_messages', u);
            return u;
          });
        };
        reader.readAsDataURL(file);
      });
      return;
    }
    if (token && selectedId) {
      if (blockedUsers.has(selectedId) || blockedByOthers.has(selectedId)) {
        toast.error('You cannot send files in this conversation.');
        return;
      }
      Array.from(files).forEach((file) => {
        if (file.size > MAX_INLINE_FILE_BYTES) {
          toast.error(
            `"${file.name}" is too large. Max about ${Math.round(MAX_INLINE_FILE_BYTES / 1024)} KB for inline send.`
          );
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = String(reader.result || '');
          if (!dataUrl.startsWith('data:')) return;
          let kind: ScMediaKind = 'document';
          if (type === 'image' || file.type.startsWith('image/')) kind = 'image';
          else if (type === 'video' || file.type.startsWith('video/')) kind = 'video';
          else if (type === 'audio' || file.type.startsWith('audio/')) kind = 'audio';
          const body = buildScMediaBody(kind, file.name, dataUrl, '');
          void (async () => {
            try {
              await apiPost('/api/chat/messages', { to_user_id: selectedId, body });
              loadThread();
              loadPartners();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : 'Could not send file');
            }
          })();
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const forwardApiMessageTo = async (toUserId: number) => {
    if (!forwardMessageId || !token) return;
    const msg = apiMessages.find((m) => m.id === forwardMessageId);
    if (!msg?.body) return;
    try {
      await apiPost('/api/chat/messages', { to_user_id: toUserId, body: msg.body });
      setForwardMessageId(null);
      setForwardTargetOpen(false);
      loadPartners();
    } catch {
      /* ignore */
    }
  };

  const forwardLocalMessageTo = (toName: string) => {
    if (!forwardMessageId) return;
    const msg = localMessages.find((m) => m.id === forwardMessageId);
    if (!msg) return;
    const text = msg.text + (msg.mediaUrls?.length ? ` \n[attachments]` : '');
    const newMsg: LocalChatMessage = {
      id: Date.now(),
      from: currentUserName,
      to: toName,
      text,
      date: new Date().toISOString(),
      mediaUrls: msg.mediaUrls,
      mediaTypes: msg.mediaTypes,
    };
    setLocalMessages((prev) => {
      const u = [...prev, newMsg];
      SC.set('chat_messages', u);
      return u;
    });
    setForwardMessageId(null);
    setForwardTargetOpen(false);
  };

  const filteredPartners = useMemo(() => {
    // Get filtered chat partners
    const filtered = listPartners
      .filter((u) => u.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => {
        // Pinned chats first
        const aIsPinned = pinnedChats.has(a.user_id);
        const bIsPinned = pinnedChats.has(b.user_id);
        if (aIsPinned !== bIsPinned) return aIsPinned ? -1 : 1;
        // Then by last message time
        return new Date(b.last_at || '').getTime() - new Date(a.last_at || '').getTime();
      });

    // Add profile results that aren't already in chat partners
    const partnersIds = new Set(filtered.map((p) => p.user_id));
    const additionalProfiles = profileResults
      .filter((p) => !partnersIds.has(p.user_id))
      .map((p) => ({
        user_id: p.user_id,
        name: p.name,
        last_message: `${p.major} • ${p.year}`, // Show profile info
        last_at: '',
        unread_count: 0,
      }));

    return [...filtered, ...additionalProfiles];
  }, [listPartners, searchTerm, pinnedChats, profileResults]);

  const orderedDemoUsers = useMemo(() => {
    return sampleUsers
      .filter((u) => u.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .map((u) => {
        let lastTs = 0;
        for (const m of localMessages) {
          if (
            (m.from === currentUserName && m.to === u.name) ||
            (m.from === u.name && m.to === currentUserName)
          ) {
            const t = new Date(m.date).getTime();
            if (t > lastTs) lastTs = t;
          }
        }
        return { ...u, lastTs };
      })
      .sort((a, b) => {
        const ap = pinnedDemoNames.has(a.name);
        const bp = pinnedDemoNames.has(b.name);
        if (ap !== bp) return ap ? -1 : 1;
        return b.lastTs - a.lastTs || a.name.localeCompare(b.name);
      });
  }, [searchTerm, localMessages, currentUserName, pinnedDemoNames]);

  const demoForwardPartners = useMemo(
    () =>
      orderedDemoUsers
        .filter((u) => u.name !== selectedUserName)
        .map((u) => ({ user_id: stableNameKey(u.name), name: u.name })),
    [orderedDemoUsers, selectedUserName]
  );

  const apiForwardPartners = useMemo(
    () =>
      listPartners
        .filter((p) => (selectedId ? p.user_id !== selectedId : true))
        .map((p) => ({ user_id: p.user_id, name: p.name })),
    [listPartners, selectedId]
  );

  const chatTitle = token && selectedId ? peerName || `User #${selectedId}` : selectedUserName;

  const renderApiThread = () => {
    if (myId == null) {
      return (
        <p className="text-center text-sm opacity-60 py-6">
          Sign out and sign in again so your account id is available for chat actions.
        </p>
      );
    }

    let filtered = messageSearch
      ? apiMessages.filter((m) =>
          (m.body || '').toLowerCase().includes(messageSearch.toLowerCase())
        )
      : apiMessages;

    return filtered.map((msg) => {
      const mine = Number(msg.from_user_id) === myId;
      const { isTeammate, note } = parseTeammateBody(msg.body);
      const isPending = String(msg.teammate_status ?? '').toLowerCase() === 'pending';
      const isRecipient = Number(msg.to_user_id) === myId;
      const showActions = Boolean(
        msg.teammate_request_id && isPending && isRecipient && isTeammate
      );
      const isMatched = messageSearch && msg.body?.toLowerCase().includes(messageSearch.toLowerCase());

      const msgDate = new Date(msg.created_at || '');
      const timeStr = msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const readAt = msg.read_at;
      const sc = parseScMediaMessage(msg.body || '');
      return (
        <div
          key={msg.id}
          className={`flex ${mine ? 'justify-end' : 'justify-start'} group`}
        >
          <MessageBubbleWrap
            showMenu={Boolean(showContextMenu && selectedMessage?.id === msg.id)}
            onMenuClose={() => {
              setShowContextMenu(false);
              setSelectedMessage(null);
            }}
            options={[
              {
                id: 'reply',
                label: 'Reply',
                icon: 'reply',
                onClick: () => setReplyingTo(msg.id),
              },
              {
                id: 'forward',
                label: 'Forward',
                icon: 'share',
                onClick: () => {
                  setForwardMessageId(msg.id);
                  setForwardTargetOpen(true);
                },
              },
              {
                id: 'pin',
                label: pinnedMessages.has(msg.id) ? 'Unpin' : 'Pin',
                icon: 'thumbtack',
                onClick: () => handlePinMessage(msg.id),
              },
              {
                id: 'info',
                label: 'Info',
                icon: 'info-circle',
                onClick: () => setMessageInfo({ id: msg.id }),
              },
              {
                id: 'delete',
                label: 'Delete',
                icon: 'trash',
                color: 'text-red-600 dark:text-red-400',
                onClick: () => openDeleteMessageDialog(msg.id, mine),
              },
            ]}
          >
            <div
              role="presentation"
              className={`cursor-pointer space-y-2 rounded-2xl px-4 py-2 text-sm transition ${
                isMatched ? 'ring-2 ring-yellow-500' : ''
              }`}
              style={{
                background: mine ? 'var(--color-primary)' : 'rgba(255,255,255,0.2)',
                color: mine ? 'white' : 'inherit',
              }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedMessage({
                  id: msg.id,
                  pos: { x: e.clientX, y: e.clientY },
                  element: e.currentTarget as HTMLElement,
                });
                setShowContextMenu(true);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                setSelectedMessage({
                  id: msg.id,
                  pos: { x: e.clientX, y: e.clientY },
                  element: e.currentTarget as HTMLElement,
                });
                setShowContextMenu(true);
              }}
            >
            {pinnedMessages.has(msg.id) && (
              <div className="text-xs opacity-70 flex items-center gap-1">
                <i className="fas fa-thumbtack" /> Pinned
              </div>
            )}
            {isTeammate ? (
              <div>
                <p className="text-xs font-semibold opacity-90 mb-1">Teammate request</p>
                <p className="whitespace-pre-wrap">{note}</p>
                {String(msg.teammate_status ?? '').toLowerCase() === 'accepted' && (
                  <p className="text-xs mt-2 opacity-90">Accepted</p>
                )}
                {String(msg.teammate_status ?? '').toLowerCase() === 'rejected' && (
                  <p className="text-xs mt-2 opacity-80">Declined</p>
                )}
                {showActions && (
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-600 text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        respondTeammate(msg.teammate_request_id!, 'accept');
                      }}
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1 rounded-lg text-xs font-semibold bg-white/20"
                      onClick={(e) => {
                        e.stopPropagation();
                        respondTeammate(msg.teammate_request_id!, 'reject');
                      }}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ) : sc ? (
              <div className="space-y-2">
                {sc.kind === 'image' && (
                  <img
                    src={sc.dataUrl}
                    alt=""
                    className="max-h-48 rounded-lg border border-white/20"
                  />
                )}
                {sc.kind === 'video' && (
                  <video
                    src={sc.dataUrl}
                    controls
                    className="max-h-48 max-w-full rounded-lg border border-white/20"
                  />
                )}
                {sc.kind === 'audio' && (
                  <audio src={sc.dataUrl} controls className="w-full max-w-xs" />
                )}
                {(sc.kind === 'document' ||
                  !['image', 'video', 'audio'].includes(String(sc.kind))) && (
                  <a
                    href={sc.dataUrl}
                    download={sc.name}
                    className={`block break-all text-xs underline ${mine ? 'text-white/95' : ''}`}
                  >
                    Download: {sc.name}
                  </a>
                )}
                {sc.caption ? <ChatLinkifiedText text={sc.caption} isOwn={mine} /> : null}
              </div>
            ) : (
              <ChatLinkifiedText text={msg.body} isOwn={mine} />
            )}
            <div
              className={`mt-1 flex items-center gap-1.5 text-[11px] ${mine ? 'justify-end text-white/80' : 'opacity-70'}`}
            >
              <span>{timeStr}</span>
              {mine && (
                <span
                  title={readAt ? 'Seen' : 'Sent'}
                  className="inline-flex shrink-0 items-center"
                >
                  {readAt ? (
                    <i className="fas fa-check-double text-sky-300" />
                  ) : (
                    <i className="fas fa-check text-white/50" />
                  )}
                </span>
              )}
            </div>
            </div>
          </MessageBubbleWrap>

          {mine && (
            <div className="ml-2 flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
              <button
                type="button"
                onClick={() => setMessageInfo({ id: msg.id })}
                title="Message info"
                className="rounded p-1 text-xs hover:bg-white/20"
              >
                <i className="fas fa-info-circle" />
              </button>
            </div>
          )}
        </div>
      );
    });
  };

  if (!token) {
    return (
      <>
      <Layout>
        <div className="max-w-lg mx-auto glass-card p-8 text-center space-y-4">
          <p className="opacity-80">Sign in to use real chat, teammate requests, and accept or decline invites.</p>
          <Link to="/login" className="btn-primary inline-block px-6 py-2 rounded-full text-sm">
            Log in
          </Link>
          <p className="text-xs opacity-50 pt-4">Demo mode (local only) below — no account required.</p>
        </div>
        <div className="max-w-5xl mx-auto mt-8">
          <div className="glass-card overflow-hidden" style={{ height: 'calc(100vh - 380px)' }}>
            <div className="flex h-full">
              {/* Sidebar */}
              <div
                className={`${selectedUserName ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-72 border-r border-white/10`}
                style={{ background: 'rgba(0,0,0,0.15)' }}
              >
                <div className="border-b border-white/10 p-3" style={{ background: 'rgba(0,0,0,0.1)' }}>
                  <div className="glass-input flex items-center gap-2 px-3 py-2 text-sm">
                    <i className="fas fa-search shrink-0 opacity-50" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      className="min-w-0 flex-1 bg-transparent outline-none"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {orderedDemoUsers.map((user) => {
                    const isPinned = pinnedDemoNames.has(user.name);
                    const demoUnread = localStorage.getItem('demo_unread_counts');
                    const counts = demoUnread ? JSON.parse(demoUnread) : {};
                    const unreadCount = Number(counts[user.name]) || 0;
                    return (
                      <button
                        key={user.name}
                        type="button"
                        onClick={() => setSelectedUserName(user.name)}
                        className={`group flex w-full items-center gap-3 p-3 transition hover:bg-white/10 ${
                          selectedUserName === user.name ? 'bg-white/20' : ''
                        }`}
                      >
                        <div className="relative shrink-0">
                          <div
                            className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-primary-foreground"
                            style={{ background: 'var(--color-primary)' }}
                          >
                            {user.avatar}
                          </div>
                          {isPinned && (
                            <div
                              className="absolute right-0 top-0 h-3 w-3 rounded-full bg-amber-400"
                              title="Pinned"
                            />
                          )}
                        </div>
                        <div className="min-w-0 flex-1 text-left">
                          <p className="truncate text-sm font-semibold">{user.name}</p>
                        </div>
                        {unreadCount > 0 && selectedUserName !== user.name && (
                          <span className="flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-sky-500 px-1 text-[10px] font-bold text-white">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        )}
                        <SidebarChatMenu
                          isPinned={isPinned}
                          onPinChat={() => togglePinDemoName(user.name)}
                          onUnpinChat={() => togglePinDemoName(user.name)}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Chat Area */}
              <div className={`${selectedUserName ? 'flex' : 'hidden md:flex'} flex-col flex-1 relative`}>
                {selectedUserName ? (
                  <>
                    {/* Header */}
                    <div className="flex items-center justify-between gap-2 border-b border-white/10 p-3">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <button
                          type="button"
                          className="shrink-0 text-sm opacity-60 md:hidden"
                          onClick={() => setSelectedUserName('')}
                        >
                          <i className="fas fa-arrow-left" />
                        </button>
                        <span className="truncate text-sm font-semibold">{selectedUserName}</span>
                      </div>

                      <ChatHeaderMenu
                        onSearch={setMessageSearch}
                        onViewMedia={() => setShowMediaGallery(true)}
                        onBlockUser={handleBlockDemoUser}
                        onClearChat={handleClearChat}
                        isBlocked={blockedDemoNames.has(selectedUserName)}
                        onUnblockUser={handleBlockDemoUser}
                      />
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {localMessages
                        .filter(
                          (m) =>
                            (m.from === currentUserName && m.to === selectedUserName) ||
                            (m.from === selectedUserName && m.to === currentUserName)
                        )
                        .filter(
                          (m) =>
                            !messageSearch ||
                            m.text.toLowerCase().includes(messageSearch.toLowerCase())
                        )
                        .filter((m) => !hiddenDemoMessageIds.has(m.id))
                        .map((msg) => {
                          const msgDate = new Date(msg.date);
                          const timeStr = msgDate.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          });

                          const mine = msg.from === currentUserName;
                          return (
                            <div
                              key={msg.id}
                              className={`flex ${mine ? 'justify-end' : 'justify-start'} group`}
                            >
                              <MessageBubbleWrap
                                showMenu={Boolean(showContextMenu && selectedMessage?.id === msg.id)}
                                onMenuClose={() => {
                                  setShowContextMenu(false);
                                  setSelectedMessage(null);
                                }}
                                options={[
                                  {
                                    id: 'reply',
                                    label: 'Reply',
                                    icon: 'reply',
                                    onClick: () => setReplyingTo(msg.id),
                                  },
                                  {
                                    id: 'forward',
                                    label: 'Forward',
                                    icon: 'share',
                                    onClick: () => {
                                      setForwardMessageId(msg.id);
                                      setForwardTargetOpen(true);
                                    },
                                  },
                                  {
                                    id: 'pin',
                                    label: pinnedMessages.has(msg.id) ? 'Unpin' : 'Pin',
                                    icon: 'thumbtack',
                                    onClick: () => handlePinMessage(msg.id),
                                  },
                                  {
                                    id: 'info',
                                    label: 'Info',
                                    icon: 'info-circle',
                                    onClick: () => setMessageInfo({ id: msg.id }),
                                  },
                                  {
                                    id: 'delete',
                                    label: 'Delete',
                                    icon: 'trash',
                                    color: 'text-red-600 dark:text-red-400',
                                    onClick: () => openDeleteMessageDialog(msg.id, mine),
                                  },
                                ]}
                              >
                                <div
                                  role="presentation"
                                  className="cursor-pointer rounded-2xl px-4 py-2 text-sm"
                                  style={{
                                    background: mine ? 'var(--color-primary)' : 'rgba(255,255,255,0.2)',
                                    color: mine ? 'white' : 'inherit',
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedMessage({
                                      id: msg.id,
                                      pos: { x: e.clientX, y: e.clientY },
                                      element: e.currentTarget as HTMLElement,
                                    });
                                    setShowContextMenu(true);
                                  }}
                                  onContextMenu={(e) => {
                                    e.preventDefault();
                                    setSelectedMessage({
                                      id: msg.id,
                                      pos: { x: e.clientX, y: e.clientY },
                                      element: e.currentTarget as HTMLElement,
                                    });
                                    setShowContextMenu(true);
                                  }}
                                >
                                {pinnedMessages.has(msg.id) && (
                                  <div className="mb-1 flex items-center gap-1 text-xs opacity-70">
                                    <i className="fas fa-thumbtack" /> Pinned
                                  </div>
                                )}
                                {msg.mediaUrls?.map((url, mi) =>
                                  msg.mediaTypes?.[mi] === 'image' ? (
                                    <img
                                      key={mi}
                                      src={url}
                                      alt=""
                                      className="mb-1 max-h-48 rounded-lg border border-white/20"
                                    />
                                  ) : msg.mediaTypes?.[mi] === 'video' ? (
                                    <video
                                      key={mi}
                                      controls
                                      src={url}
                                      className="mb-1 max-h-48 max-w-full rounded-lg border border-white/20"
                                    />
                                  ) : msg.mediaTypes?.[mi] === 'audio' ? (
                                    <audio key={mi} controls src={url} className="mb-1 w-full max-w-xs" />
                                  ) : (
                                    <a
                                      key={mi}
                                      href={url}
                                      download={msg.text}
                                      className="mb-1 block text-xs underline"
                                    >
                                      Download: {msg.text}
                                    </a>
                                  )
                                )}
                                <ChatLinkifiedText text={msg.text} isOwn={mine} />
                                <div
                                  className={`mt-1 flex items-center gap-1.5 text-[11px] ${mine ? 'justify-end text-white/80' : 'opacity-70'}`}
                                >
                                  <span>{timeStr}</span>
                                  {mine && (
                                    <span
                                      title={msg.read ? 'Seen' : 'Sent'}
                                      className="inline-flex shrink-0 items-center"
                                    >
                                      {msg.read ? (
                                        <i className="fas fa-check-double text-sky-300" />
                                      ) : (
                                        <i className="fas fa-check text-white/50" />
                                      )}
                                    </span>
                                  )}
                                </div>
                                </div>
                              </MessageBubbleWrap>
                            </div>
                          );
                        })}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Message Input */}
                    <div className="relative border-t border-white/10 p-3">
                      {replyingTo != null && (
                        <div className="mb-2 flex items-center justify-between gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs">
                          <span className="min-w-0 truncate opacity-90">
                            Replying to{' '}
                            {localMessages.find((m) => m.id === replyingTo)?.text?.slice(0, 120) ||
                              'message'}
                          </span>
                          <button
                            type="button"
                            className="shrink-0 rounded p-1 hover:bg-white/10"
                            onClick={() => setReplyingTo(null)}
                            aria-label="Cancel reply"
                          >
                            <i className="fas fa-times" />
                          </button>
                        </div>
                      )}
                      <div className="flex items-end gap-2">
                        <div className="glass-input flex min-w-0 flex-1 flex-col overflow-visible rounded-xl">
                          <div className="relative z-20 flex items-center gap-0.5 border-b border-white/10 px-1.5 py-1">
                            <ChatInputToolbar
                              variant="inline"
                              onEmojiSelect={handleEmojiSelect}
                              onImageUpload={(files) => handleFileUpload(files, 'image')}
                              onVideoUpload={(files) => handleFileUpload(files, 'video')}
                              onDocumentUpload={(files) => handleFileUpload(files, 'document')}
                              onAudioUpload={(files) => handleFileUpload(files, 'audio')}
                            />
                          </div>
                          <input
                            type="text"
                            className="bg-transparent px-3 py-2.5 text-sm outline-none"
                            placeholder={
                              blockedDemoNames.has(selectedUserName)
                                ? 'You blocked this contact'
                                : 'Type a message...'
                            }
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && sendLocalMessage()}
                            disabled={blockedDemoNames.has(selectedUserName)}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={sendLocalMessage}
                          className="btn-primary shrink-0 px-4 py-2.5 text-sm"
                          disabled={blockedDemoNames.has(selectedUserName)}
                        >
                          <i className="fas fa-paper-plane" />
                        </button>
                      </div>
                    </div>

                    {/* Message Info Modal */}
                    {messageInfo &&
                      (() => {
                        const m = localMessages.find((x) => x.id === messageInfo.id);
                        if (!m) return null;
                        return (
                          <MessageInfo
                            sentTime={m.date}
                            deliveredTime={m.date}
                            readTime={m.read}
                            isOwnMessage={m.from === currentUserName}
                            onClose={() => setMessageInfo(null)}
                          />
                        );
                      })()}

                    <ForwardMessageDialog
                      open={forwardTargetOpen && forwardMessageId != null}
                      partners={demoForwardPartners}
                      excludeUserId={null}
                      onClose={() => {
                        setForwardTargetOpen(false);
                        setForwardMessageId(null);
                      }}
                      onSelect={(id) => {
                        const row = demoForwardPartners.find((p) => p.user_id === id);
                        if (row) forwardLocalMessageTo(row.name);
                        setForwardTargetOpen(false);
                        setForwardMessageId(null);
                      }}
                    />
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center opacity-40">
                    <div className="text-center">
                      <i className="fas fa-comments text-4xl mb-3" />
                      <p className="text-sm">Select a conversation</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Media Gallery Modal */}
        {showMediaGallery && (
          <MediaGallery
            media={getMediaFromMessages()}
            onClose={() => setShowMediaGallery(false)}
          />
        )}
      </Layout>
      <DeleteMessageDialog
        open={deleteMessagePrompt !== null}
        isOwn={Boolean(deleteMessagePrompt?.isOwn)}
        onClose={() => setDeleteMessagePrompt(null)}
        onDeleteForMe={() => {
          void confirmDeleteMessage('me');
        }}
        onDeleteForEveryone={() => {
          void confirmDeleteMessage('everyone');
        }}
      />
    </>
    );
  }

  return (
    <>
    <Layout>
      <div className="max-w-5xl mx-auto">
        <div className="glass-card overflow-hidden" style={{ height: 'calc(100vh - 180px)' }}>
          <div className="flex h-full">
            {/* Sidebar */}
            <div
              className={`${selectedId ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-72 border-r border-white/10`}
              style={{ background: 'rgba(0,0,0,0.15)' }}
            >
              <div className="border-b border-white/10 p-3" style={{ background: 'rgba(0,0,0,0.1)' }}>
                <div className="glass-input flex items-center gap-2 px-3 py-2 text-sm">
                  <i className="fas fa-search shrink-0 opacity-50" />
                  <input
                    type="text"
                    placeholder="Search conversations..."
                    className="min-w-0 flex-1 bg-transparent outline-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {filteredPartners.map((user) => {
                  const initials = user.name
                    .split(/\s+/)
                    .filter(Boolean)
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();
                  const unreadCount = user.unread_count ?? 0;
                  const isPinned = pinnedChats.has(user.user_id);
                  const isBlocked = blockedUsers.has(user.user_id) || blockedByOthers.has(user.user_id);

                  return (
                    <button
                      key={user.user_id}
                      type="button"
                      onClick={() => setSelectedId(user.user_id)}
                      className={`group flex w-full items-center gap-3 p-3 transition hover:bg-white/10 ${
                        selectedId === user.user_id ? 'bg-white/20' : ''
                      }`}
                    >
                      <div className="relative shrink-0">
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-primary-foreground"
                          style={{ background: 'var(--color-primary)' }}
                        >
                          {initials || '?'}
                        </div>
                        {isPinned && (
                          <div
                            className="absolute right-0 top-0 h-3 w-3 rounded-full bg-amber-400"
                            title="Pinned"
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <p className="truncate text-sm font-semibold">{user.name}</p>
                        <p className="truncate text-xs opacity-50">
                          {blockedByOthers.has(user.user_id)
                            ? '(You cannot message this contact)'
                            : blockedUsers.has(user.user_id)
                              ? '(Blocked)'
                              : user.last_message || 'Start a conversation'}
                        </p>
                      </div>
                      {unreadCount > 0 && selectedId !== user.user_id && (
                        <span className="flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-sky-500 px-1 text-[10px] font-bold text-white">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                      <SidebarChatMenu
                        isPinned={isPinned}
                        onPinChat={() => togglePinChatByUserId(user.user_id)}
                        onUnpinChat={() => togglePinChatByUserId(user.user_id)}
                      />
                    </button>
                  );
                })}
                {filteredPartners.length === 0 && (
                  <p className="p-4 text-xs opacity-50 text-center">No conversations yet. Message someone from their profile.</p>
                )}
              </div>
            </div>

            {/* Chat Area */}
            <div className={`${selectedId ? 'flex' : 'hidden md:flex'} flex-col flex-1 relative`}>
              {selectedId ? (
                <>
                  {/* Header */}
                  <div className="flex items-center justify-between gap-2 border-b border-white/10 p-3">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <button
                        type="button"
                        className="shrink-0 text-sm opacity-60 md:hidden"
                        onClick={() => setSelectedId(null)}
                      >
                        <i className="fas fa-arrow-left" />
                      </button>
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-primary-foreground"
                        style={{ background: 'var(--color-primary)' }}
                      >
                        {(chatTitle || '?')
                          .split(/\s+/)
                          .filter(Boolean)
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <Link
                        to={`/publicviewprofile?userId=${selectedId}`}
                        className="truncate text-sm font-semibold hover:underline"
                      >
                        {chatTitle}
                      </Link>
                    </div>

                    {/* Header menu */}
                    <ChatHeaderMenu
                      onSearch={setMessageSearch}
                      onViewMedia={() => setShowMediaGallery(true)}
                      onBlockUser={handleBlockUser}
                      onClearChat={handleClearChat}
                      isBlocked={blockedUsers.has(selectedId)}
                      onUnblockUser={handleBlockUser}
                    />
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {apiMessages.length === 0 && (
                      <p className="text-center text-sm opacity-40 mt-10">No messages yet. Say hello! 👋</p>
                    )}
                    {renderApiThread()}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Input */}
                  <div className="relative border-t border-white/10 p-3">
                    {replyingTo != null && (
                      <div className="mb-2 flex items-center justify-between gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs">
                        <span className="min-w-0 truncate opacity-90">
                          Replying to{' '}
                          {apiMessages.find((m) => m.id === replyingTo)?.body?.slice(0, 120) || 'message'}
                        </span>
                        <button
                          type="button"
                          className="shrink-0 rounded p-1 hover:bg-white/10"
                          onClick={() => setReplyingTo(null)}
                          aria-label="Cancel reply"
                        >
                          <i className="fas fa-times" />
                        </button>
                      </div>
                    )}
                    <div className="flex items-end gap-2">
                      <div className="glass-input flex min-w-0 flex-1 flex-col overflow-visible rounded-xl">
                        <div className="relative z-20 flex items-center gap-0.5 border-b border-white/10 px-1.5 py-1">
                          <ChatInputToolbar
                            variant="inline"
                            onEmojiSelect={handleEmojiSelect}
                            onImageUpload={(files) => handleFileUpload(files, 'image')}
                            onVideoUpload={(files) => handleFileUpload(files, 'video')}
                            onDocumentUpload={(files) => handleFileUpload(files, 'document')}
                            onAudioUpload={(files) => handleFileUpload(files, 'audio')}
                          />
                        </div>
                        <input
                          type="text"
                          className="bg-transparent px-3 py-2.5 text-sm outline-none"
                          placeholder={
                            blockedByOthers.has(selectedId)
                              ? 'You cannot message this user'
                              : blockedUsers.has(selectedId)
                                ? 'You blocked this contact'
                                : 'Type a message...'
                          }
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && sendApiMessage()}
                          disabled={blockedUsers.has(selectedId) || blockedByOthers.has(selectedId)}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={sendApiMessage}
                        className="btn-primary shrink-0 px-4 py-2.5 text-sm"
                        disabled={blockedUsers.has(selectedId) || blockedByOthers.has(selectedId)}
                      >
                        <i className="fas fa-paper-plane" />
                      </button>
                    </div>
                  </div>

                  {/* Message Info Modal */}
                  {messageInfo &&
                    (() => {
                      const m = apiMessages.find((x) => x.id === messageInfo.id);
                      if (!m) return null;
                      const own =
                        myId != null && Number(m.from_user_id) === myId;
                      return (
                        <MessageInfo
                          sentTime={m.created_at}
                          deliveredTime={m.created_at}
                          readTime={m.read_at || undefined}
                          isOwnMessage={own}
                          onClose={() => setMessageInfo(null)}
                        />
                      );
                    })()}

                  <ForwardMessageDialog
                    open={Boolean(token && forwardTargetOpen && forwardMessageId != null)}
                    partners={apiForwardPartners}
                    excludeUserId={selectedId}
                    onClose={() => {
                      setForwardTargetOpen(false);
                      setForwardMessageId(null);
                    }}
                    onSelect={(toUserId) => forwardApiMessageTo(toUserId)}
                  />
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center opacity-40">
                  <div className="text-center">
                    <i className="fas fa-comments text-4xl mb-3" />
                    <p className="text-sm">Select a conversation to start chatting</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Media Gallery Modal */}
        {showMediaGallery && (
          <MediaGallery
            media={getMediaFromMessages()}
            onClose={() => setShowMediaGallery(false)}
          />
        )}
      </div>
    </Layout>
    <DeleteMessageDialog
      open={deleteMessagePrompt !== null}
      isOwn={Boolean(deleteMessagePrompt?.isOwn)}
      onClose={() => setDeleteMessagePrompt(null)}
      onDeleteForMe={() => {
        void confirmDeleteMessage('me');
      }}
      onDeleteForEveryone={() => {
        void confirmDeleteMessage('everyone');
      }}
    />
    </>
  );
}

