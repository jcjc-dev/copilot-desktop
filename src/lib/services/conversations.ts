import { get } from 'svelte/store';
import { conversations, activeConversationId, messages, type Conversation, type Message } from '$lib/stores/chat';

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
  try {
    const { getConversation } = await import('$lib/api/tauri');
    const [convo, msgs] = await getConversation(conversationId);
    activeConversationId.set(conversationId);
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
  activeConversationId.set(null);
  messages.set([]);
}
