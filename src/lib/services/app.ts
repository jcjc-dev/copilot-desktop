import { writable } from 'svelte/store';

export type AppStatus = 'initializing' | 'ready' | 'error' | 'disconnected';
export const appStatus = writable<AppStatus>('initializing');
export const appError = writable<string | null>(null);

export async function initializeApp() {
  appStatus.set('initializing');
  appError.set(null);

  try {
    // 1. Start Copilot client
    const { startClient } = await import('$lib/api/tauri');
    await startClient();

    // 2. Load settings
    const { loadSettings } = await import('$lib/stores/settings');
    await loadSettings();

    // 3. Load models
    const { loadModels } = await import('$lib/stores/models');
    await loadModels();

    // 4. Load conversations
    const { loadConversations } = await import('$lib/services/conversations');
    await loadConversations();

    // 5. Initialize chat event listeners
    const { initChatListeners } = await import('$lib/services/chat');
    await initChatListeners();

    appStatus.set('ready');
  } catch (error) {
    console.error('Failed to initialize app:', error);
    appError.set(String(error));
    appStatus.set('error');

    // Still try to load what we can without the client
    try {
      const { loadSettings } = await import('$lib/stores/settings');
      await loadSettings();
    } catch {}
  }
}

export async function shutdownApp() {
  try {
    const { cleanupChatListeners } = await import('$lib/services/chat');
    cleanupChatListeners();

    const { stopClient } = await import('$lib/api/tauri');
    await stopClient();
  } catch (error) {
    console.warn('Error during shutdown:', error);
  }
}

export async function retryConnection() {
  await initializeApp();
}
