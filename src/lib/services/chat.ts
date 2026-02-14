import { get } from 'svelte/store';
import { messages, isStreaming, activeConversationId, conversations, type Message } from '$lib/stores/chat';
import { selectedModel } from '$lib/stores/models';

let currentSessionId: string | null = null;
let streamingContent = '';
let unlistenFns: Array<() => void> = [];

export async function initChatListeners() {
  const { listen } = await import('@tauri-apps/api/event');

  const unlisten1 = await listen<{ session_id: string; delta: string }>('copilot:message-delta', (event) => {
    streamingContent += event.payload.delta;
    messages.update(msgs => {
      const last = msgs[msgs.length - 1];
      if (last && last.role === 'assistant' && last.id === 'streaming') {
        return [...msgs.slice(0, -1), { ...last, content: streamingContent }];
      }
      return msgs;
    });
  });

  const unlisten2 = await listen<{ session_id: string; content: string }>('copilot:message-complete', (event) => {
    messages.update(msgs => {
      const last = msgs[msgs.length - 1];
      if (last && last.id === 'streaming') {
        return [...msgs.slice(0, -1), {
          ...last,
          id: crypto.randomUUID(),
          content: event.payload.content || streamingContent,
        }];
      }
      return msgs;
    });
  });

  const unlisten3 = await listen<{ session_id: string }>('copilot:session-idle', () => {
    isStreaming.set(false);
    messages.update(msgs => {
      const last = msgs[msgs.length - 1];
      if (last && last.id === 'streaming') {
        return [...msgs.slice(0, -1), {
          ...last,
          id: crypto.randomUUID(),
        }];
      }
      return msgs;
    });
    streamingContent = '';

    saveCurrentMessages();
  });

  const unlisten4 = await listen<{ session_id: string; message: string }>('copilot:session-error', (event) => {
    isStreaming.set(false);
    streamingContent = '';
    messages.update(msgs => {
      const filtered = msgs.filter(m => m.id !== 'streaming');
      return [...filtered, {
        id: crypto.randomUUID(),
        conversation_id: get(activeConversationId) || '',
        role: 'assistant' as const,
        content: `Error: ${event.payload.message}`,
        created_at: new Date().toISOString(),
      }];
    });
  });

  unlistenFns = [unlisten1, unlisten2, unlisten3, unlisten4];
}

export function cleanupChatListeners() {
  unlistenFns.forEach(fn => fn());
  unlistenFns = [];
}

export async function sendChatMessage(content: string) {
  const conversationId = get(activeConversationId);
  let convoId = conversationId;

  try {
    const { createSession, sendMessage, createConversation } = await import('$lib/api/tauri');

    if (!convoId) {
      const model = get(selectedModel);
      const convo = await createConversation(content.substring(0, 50), model ?? undefined);
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

    if (!currentSessionId) {
      const model = get(selectedModel);
      currentSessionId = await createSession(model ?? undefined);
    }

    streamingContent = '';
    const assistantPlaceholder: Message = {
      id: 'streaming',
      conversation_id: convoId,
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
    };
    messages.update(msgs => [...msgs, assistantPlaceholder]);

    isStreaming.set(true);

    await sendMessage(currentSessionId, content);
  } catch (error) {
    isStreaming.set(false);
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
  }
}

async function saveCurrentMessages() {
  try {
    const { saveMessage } = await import('$lib/api/tauri');
    const currentMessages = get(messages);
    const toSave = currentMessages.slice(-2);
    for (const msg of toSave) {
      if (msg.id !== 'streaming') {
        await saveMessage(msg);
      }
    }
  } catch (e) {
    console.warn('Failed to save messages:', e);
  }
}
