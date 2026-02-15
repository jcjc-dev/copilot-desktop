import { get } from 'svelte/store';
import { conversations, activeConversationId, messages, isStreaming, cacheMessages, getCachedMessages, type Conversation, type Message } from '$lib/stores/chat';

/**
 * Save the current conversation's messages to the in-memory cache
 * so they survive view switches.
 */
function saveCurrentToCache() {
  const currentId = get(activeConversationId);
  if (currentId) {
    const currentMsgs = get(messages);
    cacheMessages(currentId, currentMsgs);
  }
}

export async function loadConversations() {
  try {
    const { listConversations } = await import('$lib/api/tauri');
    const convos = await listConversations();
    conversations.set(convos);
  } catch (e) {
    console.warn('Failed to load conversations:', e);
  }
}

export async function switchConversation(conversationId: string) {
  // Don't switch to the already-active conversation
  if (get(activeConversationId) === conversationId) return;

  try {
    // Persist current conversation's messages in cache before switching
    saveCurrentToCache();

    // If streaming was in progress for the old conversation, stop the UI indicator
    // (the background request continues and results are captured by the session-aware handlers)
    isStreaming.set(false);

    activeConversationId.set(conversationId);

    // Try the in-memory cache first (preserves unsaved / just-streamed messages)
    const cached = getCachedMessages(conversationId);
    if (cached) {
      messages.set(cached);
      return;
    }

    // Fall back to loading from the database
    const { getConversation } = await import('$lib/api/tauri');
    const [_convo, msgs] = await getConversation(conversationId);
    messages.set(msgs);
  } catch (e) {
    console.warn('Failed to load conversation:', e);
  }
}

export async function removeConversation(conversationId: string) {
  try {
    const { deleteConversation } = await import('$lib/api/tauri');
    await deleteConversation(conversationId);
    conversations.remove(conversationId);

    if (get(activeConversationId) === conversationId) {
      activeConversationId.set(null);
      messages.set([]);
    }
  } catch (e) {
    console.warn('Failed to delete conversation:', e);
    // Still remove locally
    conversations.remove(conversationId);
  }
}

export function startNewChat() {
  // Persist current conversation's messages before clearing
  saveCurrentToCache();
  isStreaming.set(false);
  activeConversationId.set(null);
  messages.set([]);
}
