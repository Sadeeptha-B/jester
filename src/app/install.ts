import { registerSW } from 'virtual:pwa-register';
import { useUi } from '../presentation/ui/store';

interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let installer: InstallPrompt | null = null;

/** Offline support, updates, and the browser's offer to install. */
export function setUpApp() {
  registerSW({
    // The new version is already downloaded and takes over once every window has closed.
    onNeedRefresh: () => useUi.getState().say('A new edition of the kingdom has arrived, Your Majesty. It will be on stage next time you open it.', 'delight'),
  });

  addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    installer = event as InstallPrompt;
    useUi.getState().setCanInstall(true);
  });

  addEventListener('appinstalled', () => {
    installer = null;
    useUi.getState().setCanInstall(false);
  });
}

export async function install() {
  if (!installer) return;
  const offer = installer;
  installer = null;
  useUi.getState().setCanInstall(false);
  await offer.prompt();
}
