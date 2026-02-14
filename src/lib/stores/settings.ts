import { writable, get } from 'svelte/store';

export interface AppSettings {
  theme: string;
  default_model: string | null;
  system_prompt: string | null;
}

export const settings = writable<AppSettings>({
  theme: 'dark',
  default_model: null,
  system_prompt: null,
});

export const settingsOpen = writable<boolean>(false);

export async function loadSettings() {
  try {
    const { getSettings } = await import('$lib/api/tauri');
    const s = await getSettings();
    settings.set(s);
  } catch (e) {
    console.warn('Failed to load settings:', e);
  }
}

export async function saveSettings(s: AppSettings) {
  settings.set(s);
  try {
    const { updateSettings } = await import('$lib/api/tauri');
    await updateSettings(s);
  } catch (e) {
    console.warn('Failed to save settings:', e);
  }
}
