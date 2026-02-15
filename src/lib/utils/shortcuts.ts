import { startNewChat } from '$lib/services/conversations';
import { settingsOpen } from '$lib/stores/settings';
import { sidebarOpen } from '$lib/stores/sidebar';
import { get } from 'svelte/store';

export interface Shortcut {
  key: string;
  mod: boolean;
  shift?: boolean;
  label: string;
  action: () => void;
}

export const shortcuts: Shortcut[] = [
  { key: 'n', mod: true, label: 'New chat', action: () => startNewChat() },
  { key: 'b', mod: true, label: 'Toggle sidebar', action: () => sidebarOpen.toggle() },
  { key: ',', mod: true, label: 'Open settings', action: () => settingsOpen.set(true) },
  { key: 'w', mod: true, label: 'Close chat', action: () => startNewChat() },
  { key: '/', mod: true, label: 'Focus message input', action: () => focusInput() },
];

function focusInput() {
  const el = document.querySelector<HTMLTextAreaElement>('textarea[placeholder*="Send"]');
  el?.focus();
}

/** Returns true if the event matches a shortcut (i.e. it was handled). */
export function handleGlobalKeydown(event: KeyboardEvent): boolean {
  const mod = event.metaKey || event.ctrlKey;

  for (const s of shortcuts) {
    if (
      event.key.toLowerCase() === s.key &&
      mod === !!s.mod &&
      (s.shift ? event.shiftKey : !event.shiftKey)
    ) {
      event.preventDefault();
      s.action();
      return true;
    }
  }
  return false;
}
