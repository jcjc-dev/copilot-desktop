import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { settings, settingsOpen } from './settings';

describe('settings store', () => {
  beforeEach(() => {
    settings.set({
      theme: 'dark',
      default_model: null,
      system_prompt: null,
    });
    settingsOpen.set(false);
  });

  it('has correct default values', () => {
    const s = get(settings);
    expect(s.theme).toBe('dark');
    expect(s.default_model).toBeNull();
    expect(s.system_prompt).toBeNull();
  });

  it('can update settings', () => {
    settings.set({
      theme: 'light',
      default_model: 'gpt-4',
      system_prompt: 'You are helpful.',
    });
    const s = get(settings);
    expect(s.theme).toBe('light');
    expect(s.default_model).toBe('gpt-4');
    expect(s.system_prompt).toBe('You are helpful.');
  });

  it('settingsOpen defaults to false', () => {
    expect(get(settingsOpen)).toBe(false);
  });

  it('can toggle settingsOpen', () => {
    settingsOpen.set(true);
    expect(get(settingsOpen)).toBe(true);
  });
});
