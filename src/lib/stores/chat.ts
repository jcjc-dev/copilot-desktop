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
  thinking?: string;
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
export interface StreamingState {
  isActive: boolean;
  sessionId: string | null;
  conversationId: string | null;
  content: string;
  thinking: string;
  isThinking: boolean;
}

export const streamingState = writable<StreamingState>({
  isActive: false,
  sessionId: null,
  conversationId: null,
  content: '',
  thinking: '',
  isThinking: false,
});

// Helper to reset streaming state
export function resetStreamingState() {
  streamingState.set({
    isActive: false,
    sessionId: null,
    conversationId: null,
    content: '',
    thinking: '',
    isThinking: false,
  });
}

// Backward-compatible derived store
export const isStreaming = derived(streamingState, $s => $s.isActive);

// Per-conversation message cache so switching views doesn't lose messages
export const MAX_CACHE_SIZE = 10;
const messageCache = new Map<string, Message[]>();

export function cacheMessages(conversationId: string, msgs: Message[]) {
  // Move to end (most recently used) by deleting and re-inserting
  messageCache.delete(conversationId);

  // Evict oldest if at capacity
  if (messageCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = messageCache.keys().next().value;
    if (oldestKey) messageCache.delete(oldestKey);
  }

  // Strip streaming placeholders before caching
  messageCache.set(conversationId, msgs.filter(m => m.id !== 'streaming'));
}

export function getCachedMessages(conversationId: string): Message[] | undefined {
  const msgs = messageCache.get(conversationId);
  if (msgs) {
    // Move to end for LRU
    messageCache.delete(conversationId);
    messageCache.set(conversationId, msgs);
  }
  return msgs;
}

export function clearCachedMessages(conversationId: string) {
  messageCache.delete(conversationId);
}

export function clearAllCachedMessages() {
  messageCache.clear();
}
