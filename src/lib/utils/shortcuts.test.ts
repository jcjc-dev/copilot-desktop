import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleGlobalKeydown, shortcuts } from './shortcuts';

// Mock dependencies
vi.mock('$lib/services/conversations', () => ({
  startNewChat: vi.fn(),
}));
vi.mock('$lib/stores/settings', async () => {
  const { writable } = await import('svelte/store');
  return { settingsOpen: writable(false) };
});
vi.mock('$lib/stores/sidebar', () => ({
  sidebarOpen: { toggle: vi.fn() },
}));

import { startNewChat } from '$lib/services/conversations';
import { sidebarOpen } from '$lib/stores/sidebar';

function makeKeyEvent(key: string, opts: { meta?: boolean; ctrl?: boolean; shift?: boolean } = {}): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    metaKey: opts.meta ?? false,
    ctrlKey: opts.ctrl ?? false,
    shiftKey: opts.shift ?? false,
    bubbles: true,
    cancelable: true,
  });
  vi.spyOn(event, 'preventDefault');
  return event;
}

describe('keyboard shortcuts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Cmd+N triggers new chat', () => {
    const event = makeKeyEvent('n', { meta: true });
    const handled = handleGlobalKeydown(event);
    expect(handled).toBe(true);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(startNewChat).toHaveBeenCalled();
  });

  it('Ctrl+N triggers new chat (Windows/Linux)', () => {
    const event = makeKeyEvent('n', { ctrl: true });
    const handled = handleGlobalKeydown(event);
    expect(handled).toBe(true);
    expect(startNewChat).toHaveBeenCalled();
  });

  it('Cmd+B toggles sidebar', () => {
    const event = makeKeyEvent('b', { meta: true });
    const handled = handleGlobalKeydown(event);
    expect(handled).toBe(true);
    expect(sidebarOpen.toggle).toHaveBeenCalled();
  });

  it('plain N without modifier does not trigger shortcut', () => {
    const event = makeKeyEvent('n');
    const handled = handleGlobalKeydown(event);
    expect(handled).toBe(false);
    expect(startNewChat).not.toHaveBeenCalled();
  });

  it('unrecognized shortcut returns false', () => {
    const event = makeKeyEvent('z', { meta: true });
    const handled = handleGlobalKeydown(event);
    expect(handled).toBe(false);
  });

  it('shortcuts list has expected entries', () => {
    const keys = shortcuts.map(s => s.key);
    expect(keys).toContain('n');
    expect(keys).toContain('b');
    expect(keys).toContain(',');
    expect(keys).toContain('/');
  });
});
