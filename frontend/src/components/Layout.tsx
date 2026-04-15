import React, { useState, useEffect } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import Sidebar from './Sidebar';
import { apiGet, getAuthToken, type ChatPartnerRow } from '@/lib/api';

interface LayoutProps {
  children: React.ReactNode;
  showFooter?: boolean;
}

export default function Layout({ children, showFooter = false }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);
  const [shoutrooomUnread, setShoutrooomUnread] = useState(0);

  useEffect(() => {
    if (!getAuthToken()) return;
    let cancelled = false;
    apiGet<ChatPartnerRow[]>('/api/chat/partners')
      .then((rows) => {
        if (cancelled) return;
        const total = rows.reduce((s, p) => s + (p.unread_count ?? 0), 0);
        localStorage.setItem('chat_dm_unread_total', String(total));
        setTotalUnread(total);
      })
      .catch(() => {
        if (!cancelled) setTotalUnread(0);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Listen for unread message updates
  useEffect(() => {
    const handleUnreadUpdate = () => {
      // DM unreads: API total from Chatroom, or demo buckets
      try {
        const token = localStorage.getItem('sc_auth_token');
        if (token) {
          const raw = localStorage.getItem('chat_dm_unread_total');
          const n = raw != null ? parseInt(raw, 10) : 0;
          setTotalUnread(Number.isFinite(n) && n >= 0 ? n : 0);
        } else {
          let total = 0;
          const demo = localStorage.getItem('demo_unread_counts');
          if (demo) {
            const o = JSON.parse(demo) as Record<string, unknown>;
            total = Object.values(o).reduce((s, v) => s + (Number(v) || 0), 0);
          }
          if (total === 0) {
            const unreadData = localStorage.getItem('chat_unread_counts');
            if (unreadData) {
              const counts = JSON.parse(unreadData) as Record<string, unknown>;
              total = Object.values(counts).reduce((s, v) => s + (Number(v) || 0), 0);
            }
          }
          setTotalUnread(total);
        }
      } catch {
        setTotalUnread(0);
      }

      // Track shoutroom unreads
      const shoutrooomData = localStorage.getItem('shoutroom_unread_count');
      if (shoutrooomData) {
        try {
          const count = parseInt(shoutrooomData, 10);
          setShoutrooomUnread(Number.isFinite(count) ? count : 0);
        } catch (e) {
          setShoutrooomUnread(0);
        }
      } else {
        setShoutrooomUnread(0);
      }
    };

    handleUnreadUpdate();

    // Listen for storage changes
    window.addEventListener('storage', handleUnreadUpdate);
    // Custom event for same-tab updates
    window.addEventListener('unread-messages-updated', handleUnreadUpdate);
    window.addEventListener('shoutroom-unread-updated', handleUnreadUpdate);

    return () => {
      window.removeEventListener('storage', handleUnreadUpdate);
      window.removeEventListener('unread-messages-updated', handleUnreadUpdate);
      window.removeEventListener('shoutroom-unread-updated', handleUnreadUpdate);
    };
  }, []);

  return (
    <div className="page-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Navbar onToggleSidebar={() => setSidebarOpen(o => !o)} unreadCount={totalUnread} shoutrooomUnread={shoutrooomUnread} />
      <main className="animate-fade-in">{children}</main>
      {showFooter && <Footer />}
    </div>
  );
}
