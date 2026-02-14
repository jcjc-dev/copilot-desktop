import { writable } from 'svelte/store';
import { browser } from '$app/environment';

function createSidebarStore() {
  const stored = browser ? localStorage.getItem('sidebar-open') !== 'false' : true;
  const { subscribe, set, update } = writable<boolean>(stored);

  return {
    subscribe,
    toggle: () => update(open => {
      const next = !open;
      if (browser) localStorage.setItem('sidebar-open', String(next));
      return next;
    }),
    open: () => {
      if (browser) localStorage.setItem('sidebar-open', 'true');
      set(true);
    },
    close: () => {
      if (browser) localStorage.setItem('sidebar-open', 'false');
      set(false);
    }
  };
}

export const sidebarOpen = createSidebarStore();
