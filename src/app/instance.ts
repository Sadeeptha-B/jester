const LOCK = 'jester-kingdom';
const PATIENCE_MS = 500;

/**
 * Only one window may run the kingdom. A browser tab and the installed app share
 * the same saves, so two running together would overwrite each other's history.
 * Resolves once this window holds the kingdom, which it then does until it closes.
 * A window that has to wait takes over by itself when the other one goes.
 */
export function claimKingdom(setWaiting: (waiting: boolean) => void): Promise<void> {
  const { locks } = navigator;
  if (!locks) return Promise.resolve();

  return new Promise((resolve) => {
    // A reload briefly overlaps with the page it replaces, which isn't worth mentioning.
    const notice = setTimeout(() => setWaiting(true), PATIENCE_MS);
    const hold = () => {
      clearTimeout(notice);
      setWaiting(false);
      resolve();
      return new Promise<void>(() => {});
    };
    void locks.request(LOCK, { ifAvailable: true }, (lock) => {
      if (lock) return hold();
      void locks.request(LOCK, hold);
      return undefined;
    });
  });
}
