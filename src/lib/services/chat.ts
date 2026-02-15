import { get } from 'svelte/store';
import { messages, streamingState, resetStreamingState, activeConversationId, conversations, cacheMessages, getCachedMessages, type Message } from '$lib/stores/chat';
import { selectedModel } from '$lib/stores/models';
import { logger } from '$lib/utils/logger';

const CONVERSATION_TITLE_MAX_LENGTH = 50;

/** Guard to prevent concurrent sendChatMessage calls from creating duplicate sessions */
let isSending = false;

let currentSessionId: string | null = null;
/** The conversation that the current streaming session belongs to */
let sessionConversationId: string | null = null;

let unlistenFns: Array<() => void> = [];

/**
 * Check if an incoming event belongs to the current streaming session.
 * Silently drops events from stale/old sessions.
 */
function isActiveSession(eventSessionId: string): boolean {
  const { sessionId } = get(streamingState);
  if (sessionId && eventSessionId !== sessionId) {
    logger.debug('DROPPED stale event', { event_session: eventSessionId, active_session: sessionId });
    return false;
  }
  return true;
}

/**
 * Destroy the current SDK session so the next message creates a fresh one.
 * This MUST be called whenever the user switches conversations or starts a
 * new chat — otherwise the model responds in the context of the old session.
 */
export async function resetSession() {
  if (currentSessionId) {
    logger.debug('resetSession', currentSessionId);
    // Immediately stop accepting events from the old session
    streamingState.update(s => ({ ...s, sessionId: null }));
    try {
      const { destroySession } = await import('$lib/api/tauri');
      await destroySession(currentSessionId);
    } catch (e) {
      console.warn('Failed to destroy session:', e);
    }
    currentSessionId = null;
    sessionConversationId = null;
  }
}

/**
 * Apply a message-list update to the correct destination:
 * - If the streaming conversation is the active one → update the live `messages` store.
 * - Otherwise → update the per-conversation cache so the messages appear when the user returns.
 */
function updateMessagesForStreamingConvo(updater: (msgs: Message[]) => Message[]) {
  const { conversationId } = get(streamingState);
  if (!conversationId) return;

  if (conversationId === get(activeConversationId)) {
    messages.update(updater);
  } else {
    // The user switched away — apply the update to the cache instead
    const cached = getCachedMessages(conversationId) ?? [];
    const updated = updater(cached);
    cacheMessages(conversationId, updated);
  }
}

export async function initChatListeners() {
  const { listen } = await import('@tauri-apps/api/event');

  const unlisten1 = await listen<{ session_id: string; delta: string }>('copilot:message-delta', (event) => {
    if (!isActiveSession(event.payload.session_id)) return;
    logger.debug('message-delta', { session: event.payload.session_id, deltaLen: event.payload.delta.length });
    streamingState.update(s => ({ ...s, content: s.content + event.payload.delta }));
    updateMessagesForStreamingConvo(msgs => {
      const last = msgs[msgs.length - 1];
      if (last && last.role === 'assistant' && last.id === 'streaming') {
        return [...msgs.slice(0, -1), { ...last, content: get(streamingState).content }];
      }
      return msgs;
    });
  });

  const unlisten2 = await listen<{ session_id: string; content: string }>('copilot:message-complete', (event) => {
    if (!isActiveSession(event.payload.session_id)) return;
    logger.debug('message-complete', { session: event.payload.session_id, contentLen: event.payload.content?.length });
    updateMessagesForStreamingConvo(msgs => {
      const last = msgs[msgs.length - 1];
      if (last && last.id === 'streaming') {
        // Keep id as 'streaming' — session-idle will assign the final UUID.
        // This prevents a duplicate bubble (finalized message + dots) between
        // the message-complete and session-idle events.
        return [...msgs.slice(0, -1), {
          ...last,
          content: event.payload.content || get(streamingState).content,
        }];
      }
      return msgs;
    });
  });

  const unlisten3 = await listen<{ session_id: string }>('copilot:session-idle', (event) => {
    if (!isActiveSession(event.payload.session_id)) return;
    logger.debug('session-idle', { session: event.payload.session_id });

    // Finalize the streaming placeholder with a real UUID, filtering all
    // occurrences so no orphaned placeholders survive.
    updateMessagesForStreamingConvo(msgs => {
      const streamingMsg = msgs.find(m => m.id === 'streaming');
      const filtered = msgs.filter(m => m.id !== 'streaming');
      if (streamingMsg) {
        return [...filtered, { ...streamingMsg, id: crypto.randomUUID() }];
      }
      return filtered;
    });

    // Clear streaming indicator *after* finalizing the message so the UI
    // never renders the dots alongside a completed response.
    if (get(streamingState).conversationId === get(activeConversationId)) {
      streamingState.update(s => ({ ...s, isActive: false }));
    }

    streamingState.update(s => ({ ...s, content: '' }));
    saveCurrentMessages();
    resetStreamingState();
  });

  const unlisten4 = await listen<{ session_id: string; message: string }>('copilot:session-error', (event) => {
    if (!isActiveSession(event.payload.session_id)) return;
    // Only clear UI streaming indicator if the active conversation is the one that was streaming
    if (get(streamingState).conversationId === get(activeConversationId)) {
      streamingState.update(s => ({ ...s, isActive: false }));
    }

    const convoId = get(streamingState).conversationId || get(activeConversationId) || '';
    updateMessagesForStreamingConvo(msgs => {
      const filtered = msgs.filter(m => m.id !== 'streaming');
      return [...filtered, {
        id: crypto.randomUUID(),
        conversation_id: convoId,
        role: 'assistant' as const,
        content: `Error: ${event.payload.message}`,
        created_at: new Date().toISOString(),
      }];
    });

    resetStreamingState();
  });

  unlistenFns = [unlisten1, unlisten2, unlisten3, unlisten4];
}

export function cleanupChatListeners() {
  unlistenFns.forEach(fn => fn());
  unlistenFns = [];
}

export async function sendChatMessage(content: string) {
  if (isSending) return;
  isSending = true;

  const conversationId = get(activeConversationId);
  let convoId = conversationId;

  try {
    const { createSession, sendMessage, createConversation } = await import('$lib/api/tauri');

    if (!convoId) {
      const model = get(selectedModel);
      const convo = await createConversation(content.substring(0, CONVERSATION_TITLE_MAX_LENGTH), model ?? undefined);
      convoId = convo.id;
      activeConversationId.set(convoId);
      conversations.add(convo);
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      conversation_id: convoId,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    };
    messages.update(msgs => [...msgs, userMessage]);

    if (!currentSessionId || sessionConversationId !== convoId) {
      // Destroy stale session from a different conversation
      if (currentSessionId && sessionConversationId !== convoId) {
        logger.debug('sendChatMessage', 'destroying stale session', currentSessionId, 'for new convo', convoId);
        try {
          const { destroySession } = await import('$lib/api/tauri');
          await destroySession(currentSessionId);
        } catch (error) { console.warn('Failed to destroy stale session:', currentSessionId, error); }
        currentSessionId = null;
      }
      const model = get(selectedModel);
      currentSessionId = await createSession(model ?? undefined);
      sessionConversationId = convoId;
      logger.debug('sendChatMessage', 'created new session', currentSessionId, 'for convo', convoId);
    }

    streamingState.update(s => ({ ...s, content: '' }));
    const assistantPlaceholder: Message = {
      id: 'streaming',
      conversation_id: convoId,
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
    };
    messages.update(msgs => [...msgs, assistantPlaceholder]);

    streamingState.set({ isActive: true, sessionId: currentSessionId, conversationId: convoId, content: '' });
    logger.debug('sendChatMessage', 'streaming session set', { sessionId: currentSessionId, convoId });

    await sendMessage(currentSessionId, content);
  } catch (error) {
    resetStreamingState();
    console.error('Failed to send message:', error);
    messages.update(msgs => {
      const filtered = msgs.filter(m => m.id !== 'streaming');
      return [...filtered, {
        id: crypto.randomUUID(),
        conversation_id: convoId || '',
        role: 'assistant' as const,
        content: `Error: ${error}`,
        created_at: new Date().toISOString(),
      }];
    });
  } finally {
    isSending = false;
  }
}

async function saveCurrentMessages() {
  try {
    const { saveMessage } = await import('$lib/api/tauri');

    // Determine which messages to save: if the streaming conversation is still
    // active we read from the store, otherwise from the cache.
    const { conversationId: streamConvoId } = get(streamingState);
    let currentMessages: Message[];
    if (streamConvoId && streamConvoId !== get(activeConversationId)) {
      currentMessages = getCachedMessages(streamConvoId) ?? [];
    } else {
      currentMessages = get(messages);
    }

    const toSave = currentMessages.slice(-2);
    for (const msg of toSave) {
      if (msg.id !== 'streaming') {
        await saveMessage(msg);
      }
    }

    // Also update the cache so a subsequent switch back sees the saved state
    if (streamConvoId) {
      cacheMessages(streamConvoId, currentMessages.filter(m => m.id !== 'streaming'));
    }
  } catch (e) {
    console.warn('Failed to save messages:', e);
  }
}
