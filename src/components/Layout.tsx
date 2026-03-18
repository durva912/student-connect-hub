import Navbar from './Navbar';
import Footer from './Footer';

export default function Layout({ children, showFooter = true }: { children: React.ReactNode; showFooter?: boolean }) {
  return (
    <div className="page-container">
      <Navbar />
      <main className="animate-fade-in">{children}</main>
      {showFooter && <Footer />}
    </div>
  );
}
