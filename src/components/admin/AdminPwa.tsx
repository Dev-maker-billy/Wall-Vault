'use client';

import { useEffect, useState } from 'react';

type InstallEvent = Event & {
  prompt: () => Promise<void>;
};

const DISMISS_KEY = 'wall-vault-install-dismissed';

/**
 * Makes the admin area installable: registers the service worker, asks the browser to
 * keep this site's saved login safe from automatic cleanup, and offers an Install bar.
 */
export default function AdminPwa() {
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
    // Persistent storage lowers the chance the browser clears the saved login when space runs low.
    Promise.resolve(navigator.storage?.persist?.()).catch(() => {});

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;

    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      // Storage can be unavailable in private windows; the bar just shows again next time.
    }
    setHidden(dismissed || standalone);
    setIosHint(/iphone|ipad|ipod/i.test(navigator.userAgent) && !standalone);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as InstallEvent);
    };
    const onInstalled = () => {
      setInstallEvent(null);
      setHidden(true);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  function dismiss() {
    setHidden(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // Ignore: dismissal just won't be remembered.
    }
  }

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    setInstallEvent(null);
  }

  if (hidden || (!installEvent && !iosHint)) return null;

  return (
    <div className="border-b border-line bg-panel">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2.5 text-sm sm:px-8">
        <p className="min-w-0 text-mute">
          {installEvent
            ? 'Install Vault Admin to open it from your home screen.'
            : 'To install: tap Share, then Add to Home Screen.'}
        </p>
        <div className="flex shrink-0 gap-2">
          {installEvent && (
            <button type="button" onClick={install} className="btn-primary px-3 py-1.5">
              Install
            </button>
          )}
          <button type="button" onClick={dismiss} className="btn-quiet px-3 py-1.5">
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
