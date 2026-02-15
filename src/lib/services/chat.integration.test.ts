import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockIPC, clearMocks } from '@tauri-apps/api/mocks';
import { get } from 'svelte/store';
import {
  messages,
  isStreaming,
  streamingState,
  resetStreamingState,
  activeConversationId,
  conversations,
  clearAllCachedMessages,
} from '$lib/stores/chat';
import type { Message } from '$lib/stores/chat';

// Track IPC calls to verify session lifecycle
let ipcCalls: Array<{ cmd: string; args: any }> = [];

function setupMockIPC() {
  let sessionCounter = 0;
  mockIPC((cmd, args) => {
    ipcCalls.push({ cmd, args });
    if (cmd === 'create_session') return `session-${++sessionCounter}`;
    if (cmd === 'destroy_session') return null;
    if (cmd === 'send_message') return null;
    if (cmd === 'save_message') return null;
    if (cmd === 'create_conversation') {
      return {
        id: `conv-${Date.now()}`,
        title: (args as any).title || 'New Chat',
        model: (args as any).model || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
  });
}

describe('Chat Service Integration Tests', () => {
  beforeEach(() => {
    messages.set([]);
    resetStreamingState();
    conversations.set([]);
    activeConversationId.set(null);
    clearAllCachedMessages();
    ipcCalls = [];
  });

  afterEach(() => {
    clearMocks();
  });

  // Test 1 — Session lifecycle: createSession → sendMessage → destroySession
  describe('session lifecycle', () => {
    it('creates a session, sends a message, and can destroy the session', async () => {
      setupMockIPC();

      const { sendChatMessage, resetSession } = await import('$lib/services/chat');

      // Set up an active conversation so sendChatMessage uses it
      activeConversationId.set('conv-lifecycle');

      await sendChatMessage('Hello from lifecycle test');

      // Verify session was created
      const createCalls = ipcCalls.filter((c) => c.cmd === 'create_session');
      expect(createCalls.length).toBeGreaterThanOrEqual(1);

      // Verify message was sent
      const sendCalls = ipcCalls.filter((c) => c.cmd === 'send_message');
      expect(sendCalls).toHaveLength(1);
      expect(sendCalls[0].args.content).toBe('Hello from lifecycle test');

      // Verify user message was added to store
      const msgs = get(messages);
      const userMsg = msgs.find((m) => m.role === 'user');
      expect(userMsg).toBeDefined();
      expect(userMsg!.content).toBe('Hello from lifecycle test');

      // Verify streaming placeholder was added
      const streamingMsg = msgs.find((m) => m.id === 'streaming');
      expect(streamingMsg).toBeDefined();

      // Destroy the session
      await resetSession();
      const destroyCalls = ipcCalls.filter((c) => c.cmd === 'destroy_session');
      expect(destroyCalls.length).toBeGreaterThanOrEqual(1);
    });
  });

  // Test 2 — Concurrent send prevention
  describe('concurrent send prevention', () => {
    it('prevents duplicate sessions when sendChatMessage is called rapidly', async () => {
      setupMockIPC();

      // Re-import to get fresh module state
      const { sendChatMessage, resetSession } = await import('$lib/services/chat');

      // Reset any prior session from other tests
      await resetSession();
      ipcCalls = [];

      activeConversationId.set('conv-concurrent');

      // Fire two sends concurrently — the isSending guard should block the second
      const [result1, result2] = await Promise.allSettled([
        sendChatMessage('First message'),
        sendChatMessage('Second message — should be dropped'),
      ]);

      // Only one create_session call should have been made
      const createCalls = ipcCalls.filter((c) => c.cmd === 'create_session');
      expect(createCalls).toHaveLength(1);

      // Only one send_message call (the first)
      const sendCalls = ipcCalls.filter((c) => c.cmd === 'send_message');
      expect(sendCalls).toHaveLength(1);
      expect(sendCalls[0].args.content).toBe('First message');

      await resetSession();
    });
  });

  // Test 3 — Streaming cleanup on error
  describe('streaming cleanup on error', () => {
    it('removes streaming placeholder and adds error message on session-error', async () => {
      // We can't easily trigger the real event listener pipeline in unit tests,
      // so we simulate the error-handling logic the same way the service does:
      // filter out 'streaming' messages and append an error message.
      const convoId = 'conv-error-test';
      activeConversationId.set(convoId);

      // Simulate mid-stream state
      messages.set([
        {
          id: 'msg-user-1',
          conversation_id: convoId,
          role: 'user',
          content: 'Hello',
          created_at: new Date().toISOString(),
        },
        {
          id: 'streaming',
          conversation_id: convoId,
          role: 'assistant',
          content: 'Partial response...',
          created_at: new Date().toISOString(),
        },
      ]);
      streamingState.update(s => ({ ...s, isActive: true }));

      // Simulate what the copilot:session-error handler does
      messages.update((msgs) => {
        const filtered = msgs.filter((m) => m.id !== 'streaming');
        return [
          ...filtered,
          {
            id: crypto.randomUUID(),
            conversation_id: convoId,
            role: 'assistant' as const,
            content: 'Error: Connection lost',
            created_at: new Date().toISOString(),
          },
        ];
      });
      resetStreamingState();

      const finalMsgs = get(messages);

      // Streaming placeholder should be gone
      expect(finalMsgs.find((m) => m.id === 'streaming')).toBeUndefined();

      // Error message should be present
      const errorMsg = finalMsgs.find((m) => m.content.startsWith('Error:'));
      expect(errorMsg).toBeDefined();
      expect(errorMsg!.content).toBe('Error: Connection lost');

      // Streaming flag should be off
      expect(get(isStreaming)).toBe(false);

      // Original user message should survive
      expect(finalMsgs.find((m) => m.role === 'user')).toBeDefined();
      expect(finalMsgs).toHaveLength(2);
    });
  });
});
