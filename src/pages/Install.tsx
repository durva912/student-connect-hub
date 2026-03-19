import { useState, useEffect } from 'react';
import Layout from '../components/Layout';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    const ua = window.navigator.userAgent.toLowerCase();
    setIsIos(/iphone|ipad|ipod/.test(ua));

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setInstalled(true));

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') setInstalled(true);
    setDeferredPrompt(null);
  };

  return (
    <Layout>
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="glass-card p-10 animate-fade-in">
          <i className="fas fa-mobile-alt text-5xl mb-6" style={{ color: 'var(--color-primary)' }} />
          <h1 className="text-2xl font-bold mb-4">Install StudentConnect</h1>

          {installed ? (
            <div className="space-y-4">
              <i className="fas fa-check-circle text-4xl" style={{ color: 'var(--color-success)' }} />
              <p className="text-sm opacity-70">App installed successfully! You can now use it from your home screen.</p>
            </div>
          ) : deferredPrompt ? (
            <div className="space-y-4">
              <p className="text-sm opacity-70 mb-6">
                Install StudentConnect on your device for a faster, app-like experience with offline support.
              </p>
              <button onClick={handleInstall} className="btn-primary text-lg px-8 py-3">
                <i className="fas fa-download" /> Install App
              </button>
            </div>
          ) : isIos ? (
            <div className="space-y-4 text-left">
              <p className="text-sm opacity-70 text-center mb-4">
                To install on your iPhone or iPad:
              </p>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.2)' }}>
                  <span className="font-bold text-sm" style={{ color: 'var(--color-primary)' }}>1</span>
                  <span className="text-sm">Tap the <i className="fas fa-share-square" /> Share button in Safari</span>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.2)' }}>
                  <span className="font-bold text-sm" style={{ color: 'var(--color-primary)' }}>2</span>
                  <span className="text-sm">Scroll down and tap <strong>"Add to Home Screen"</strong></span>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.2)' }}>
                  <span className="font-bold text-sm" style={{ color: 'var(--color-primary)' }}>3</span>
                  <span className="text-sm">Tap <strong>"Add"</strong> to confirm</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm opacity-70">
                Use your browser menu to install this app, or visit this page on a supported mobile browser.
              </p>
              <p className="text-xs opacity-50">
                Chrome, Edge, or Samsung Internet on Android • Safari on iOS
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
