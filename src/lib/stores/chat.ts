import { writable, derived } from 'svelte/store';

export interface Conversation {
  id: string;
  title: string;
  model: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

function createConversationStore() {
  const { subscribe, set, update } = writable<Conversation[]>([]);

  return {
    subscribe,
    set,
    add: (conversation: Conversation) => {
      update(convos => [conversation, ...convos]);
    },
    remove: (id: string) => {
      update(convos => convos.filter(c => c.id !== id));
    },
    updateTitle: (id: string, title: string) => {
      update(convos => convos.map(c => c.id === id ? { ...c, title } : c));
    },
  };
}

export const conversations = createConversationStore();
export const activeConversationId = writable<string | null>(null);
export const messages = writable<Message[]>([]);
export const isStreaming = writable<boolean>(false);

// Per-conversation message cache so switching views doesn't lose messages
const messageCache = new Map<string, Message[]>();

export function cacheMessages(conversationId: string, msgs: Message[]) {
  // Strip the transient streaming placeholder before caching
  messageCache.set(conversationId, msgs.filter(m => m.id !== 'streaming'));
}

export function getCachedMessages(conversationId: string): Message[] | undefined {
  return messageCache.get(conversationId);
}

export function clearCachedMessages(conversationId: string) {
  messageCache.delete(conversationId);
}

export function clearAllCachedMessages() {
  messageCache.clear();
}
