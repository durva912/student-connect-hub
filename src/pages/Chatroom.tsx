import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { SC } from '../lib/store';

interface ChatMessage {
  id: number;
  from: string;
  to: string;
  text: string;
  date: string;
}

interface ChatUser {
  name: string;
  avatar: string;
  lastMessage?: string;
}

const sampleUsers: ChatUser[] = [
  { name: 'Aarav Sharma', avatar: 'AS' },
  { name: 'Sneha Gupta', avatar: 'SG' },
  { name: 'Raj Deshmukh', avatar: 'RD' },
  { name: 'Priya Patel', avatar: 'PP' },
  { name: 'Vikram Singh', avatar: 'VS' },
];

export default function Chatroom() {
  const [searchParams] = useSearchParams();
  const initialUser = searchParams.get('user') || '';
  const [selectedUser, setSelectedUser] = useState<string>(initialUser);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentUser = SC.getOne<any>('profile')?.name || 'Student User';

  useEffect(() => {
    const allMessages = SC.get<ChatMessage>('chat_messages');
    setMessages(allMessages);
  }, []);

  useEffect(() => {
    if (initialUser) setSelectedUser(initialUser);
  }, [initialUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedUser]);

  const sendMessage = () => {
    if (!input.trim() || !selectedUser) return;
    const newMsg: ChatMessage = {
      id: Date.now(),
      from: currentUser,
      to: selectedUser,
      text: input.trim(),
      date: new Date().toISOString(),
    };
    const updated = [...messages, newMsg];
    setMessages(updated);
    SC.set('chat_messages', updated);
    setInput('');

    // Simulate reply after 1s
    setTimeout(() => {
      const reply: ChatMessage = {
        id: Date.now() + 1,
        from: selectedUser,
        to: currentUser,
        text: getAutoReply(),
        date: new Date().toISOString(),
      };
      const withReply = [...updated, reply];
      setMessages(withReply);
      SC.set('chat_messages', withReply);
    }, 1000);
  };

  const getAutoReply = () => {
    const replies = [
      'That sounds great! 🎉',
      'Sure, let me know the details!',
      'I\'ll check and get back to you.',
      'Awesome! Looking forward to it.',
      'Thanks for reaching out! 😊',
    ];
    return replies[Math.floor(Math.random() * replies.length)];
  };

  const filteredUsers = sampleUsers.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const chatMessages = messages.filter(
    m => (m.from === currentUser && m.to === selectedUser) || (m.from === selectedUser && m.to === currentUser)
  );

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        <div className="glass-card overflow-hidden" style={{ height: 'calc(100vh - 180px)' }}>
          <div className="flex h-full">
            {/* User List */}
            <div className={`${selectedUser ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-72 border-r border-white/10`}>
              <div className="p-3 border-b border-white/10">
                <div className="glass-input flex items-center gap-2 px-3 py-2 text-sm">
                  <i className="fas fa-search opacity-50" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    className="bg-transparent outline-none flex-1"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {filteredUsers.map(user => {
                  const lastMsg = messages
                    .filter(m => (m.from === user.name && m.to === currentUser) || (m.from === currentUser && m.to === user.name))
                    .slice(-1)[0];
                  return (
                    <button
                      key={user.name}
                      onClick={() => setSelectedUser(user.name)}
                      className={`w-full flex items-center gap-3 p-3 transition hover:bg-white/10 ${selectedUser === user.name ? 'bg-white/20' : ''}`}
                    >
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0" style={{ background: 'var(--color-primary)' }}>
                        {user.avatar}
                      </div>
                      <div className="text-left flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{user.name}</p>
                        <p className="text-xs opacity-50 truncate">{lastMsg?.text || 'Start a conversation'}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Chat Area */}
            <div className={`${selectedUser ? 'flex' : 'hidden md:flex'} flex-col flex-1`}>
              {selectedUser ? (
                <>
                  <div className="p-3 border-b border-white/10 flex items-center gap-3">
                    <button className="md:hidden text-sm opacity-60" onClick={() => setSelectedUser('')}>
                      <i className="fas fa-arrow-left" />
                    </button>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground" style={{ background: 'var(--color-primary)' }}>
                      {selectedUser.split(' ').map(n => n[0]).join('')}
                    </div>
                    <span className="font-semibold text-sm">{selectedUser}</span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {chatMessages.length === 0 && (
                      <p className="text-center text-sm opacity-40 mt-10">No messages yet. Say hello! 👋</p>
                    )}
                    {chatMessages.map(msg => (
                      <div key={msg.id} className={`flex ${msg.from === currentUser ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className="max-w-[70%] px-4 py-2 rounded-2xl text-sm"
                          style={{
                            background: msg.from === currentUser ? 'var(--color-primary)' : 'rgba(255,255,255,0.2)',
                            color: msg.from === currentUser ? 'white' : 'inherit',
                          }}
                        >
                          {msg.text}
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                  <div className="p-3 border-t border-white/10 flex gap-2">
                    <input
                      type="text"
                      className="glass-input flex-1 px-4 py-2 text-sm"
                      placeholder="Type a message..."
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && sendMessage()}
                    />
                    <button onClick={sendMessage} className="btn-primary px-4 py-2 text-sm">
                      <i className="fas fa-paper-plane" />
                    </button>
                  </div>
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
      </div>
    </Layout>
  );
}
