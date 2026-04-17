import React, { useEffect, useState } from 'react';

const DISMISS_KEY = 'surebank-pwa-dismissed';

const PwaInstallPrompt = () => {
  const [installEvent, setInstallEvent] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(
    () => window.localStorage.getItem(DISMISS_KEY) === 'true'
  );

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;

    setIsInstalled(isStandalone);

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallEvent(event);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallEvent(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!installEvent) {
      return;
    }

    installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  };

  const handleDismiss = () => {
    window.localStorage.setItem(DISMISS_KEY, 'true');
    setIsDismissed(true);
  };

  if (isInstalled || isDismissed || !installEvent) {
    return null;
  }

  return (
    <div className="border-b border-blue-100 bg-gradient-to-r from-blue-600 to-sky-500 text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Install SureBank Shop</p>
          <p className="text-xs text-blue-50">
            Add the storefront to your phone or desktop for faster access.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleInstall}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
          >
            Install
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded-full border border-white/40 px-3 py-2 text-xs font-medium text-white transition hover:bg-white/10"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
};

export default PwaInstallPrompt;
