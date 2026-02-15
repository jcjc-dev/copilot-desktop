import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { clearMocks } from '@tauri-apps/api/mocks';
import { get } from 'svelte/store';
import { messages, isStreaming, conversations, activeConversationId, streamingState, resetStreamingState } from '$lib/stores/chat';

describe('Chat Service Integration', () => {
  beforeEach(() => {
    messages.set([]);
    resetStreamingState();
    conversations.set([]);
    activeConversationId.set(null);
  });

  afterEach(() => {
    clearMocks();
  });

  it('stores handle message state correctly', () => {
    expect(get(messages)).toEqual([]);
    expect(get(isStreaming)).toBe(false);
    expect(get(activeConversationId)).toBeNull();
  });

  it('can simulate a full message send flow via stores', () => {
    // 1. Add user message
    messages.update((msgs) => [
      ...msgs,
      {
        id: 'msg-1',
        conversation_id: 'conv-1',
        role: 'user' as const,
        content: 'Hello',
        created_at: new Date().toISOString(),
      },
    ]);
    expect(get(messages)).toHaveLength(1);

    // 2. Set streaming
    streamingState.update(s => ({ ...s, isActive: true }));
    expect(get(isStreaming)).toBe(true);

    // 3. Add streaming placeholder
    messages.update((msgs) => [
      ...msgs,
      {
        id: 'streaming',
        conversation_id: 'conv-1',
        role: 'assistant' as const,
        content: '',
        created_at: new Date().toISOString(),
      },
    ]);
    expect(get(messages)).toHaveLength(2);

    // 4. Simulate streaming deltas
    messages.update((msgs) => {
      const last = msgs[msgs.length - 1];
      if (last.id === 'streaming') {
        return [...msgs.slice(0, -1), { ...last, content: 'Hello! ' }];
      }
      return msgs;
    });
    expect(get(messages)[1].content).toBe('Hello! ');

    // 5. Finalize
    messages.update((msgs) => {
      const last = msgs[msgs.length - 1];
      if (last.id === 'streaming') {
        return [...msgs.slice(0, -1), { ...last, id: 'msg-2', content: 'Hello! How can I help?' }];
      }
      return msgs;
    });
    resetStreamingState();

    expect(get(messages)).toHaveLength(2);
    expect(get(messages)[1].content).toBe('Hello! How can I help?');
    expect(get(isStreaming)).toBe(false);
  });
});
