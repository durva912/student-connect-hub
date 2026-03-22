import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem('install-banner-dismissed') === '1');

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setDeferredPrompt(null));
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!deferredPrompt || dismissed) return null;

  const handleInstall = async () => {
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('install-banner-dismissed', '1');
  };

  return (
    <div className="w-full px-4 py-2 flex items-center justify-center gap-3 text-sm"
      style={{ background: 'var(--color-primary)', color: '#fff' }}>
      <i className="fas fa-download" />
      <span className="font-medium">Install StudentConnect for a better experience</span>
      <button onClick={handleInstall} className="px-3 py-1 rounded-full text-xs font-bold"
        style={{ background: 'rgba(255,255,255,0.25)', color: '#fff' }}>
        Install
      </button>
      <button onClick={handleDismiss} className="ml-1 opacity-70 hover:opacity-100">
        <i className="fas fa-times" />
      </button>
    </div>
  );
}
