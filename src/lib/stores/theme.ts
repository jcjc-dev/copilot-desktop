import { writable } from 'svelte/store';
import { browser } from '$app/environment';

type Theme = 'dark' | 'light' | 'system';

function isDark(value: Theme): boolean {
  return value === 'dark' || (value === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
}

async function syncNativeTheme(value: Theme) {
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    const win = getCurrentWindow();
    // null tells Tauri to follow the system theme
    await win.setTheme(value === 'system' ? null : value);
  } catch {
    // Not running in Tauri (e.g. browser dev, tests)
  }
}

function applyTheme(value: Theme) {
  localStorage.setItem('theme', value);
  if (isDark(value)) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  syncNativeTheme(value);
}

function createThemeStore() {
  const stored = browser ? localStorage.getItem('theme') as Theme : null;
  const { subscribe, set, update } = writable<Theme>(stored || 'dark');

  return {
    subscribe,
    set: (value: Theme) => {
      if (browser) {
        applyTheme(value);
      }
      set(value);
    },
    toggle: () => {
      update(current => {
        const next = current === 'dark' ? 'light' : 'dark';
        if (browser) {
          applyTheme(next);
        }
        return next;
      });
    },
    init: () => {
      if (browser) {
        const stored = localStorage.getItem('theme') as Theme || 'dark';
        applyTheme(stored);
      }
    }
  };
}

export const theme = createThemeStore();
