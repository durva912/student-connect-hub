import { useState } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import Sidebar from './Sidebar';
import InstallBanner from './InstallBanner';

interface LayoutProps {
  children: React.ReactNode;
  showFooter?: boolean;
}

export default function Layout({ children, showFooter = false }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="page-container">
      <InstallBanner />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Navbar onToggleSidebar={() => setSidebarOpen(o => !o)} />
      <main className="animate-fade-in">{children}</main>
      {showFooter && <Footer />}
    </div>
  );
}
