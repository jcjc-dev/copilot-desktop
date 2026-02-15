import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { conversations, activeConversationId, messages, isStreaming, cacheMessages, getCachedMessages, clearCachedMessages, clearAllCachedMessages } from './chat';

describe('chat store', () => {
  beforeEach(() => {
    conversations.set([]);
    activeConversationId.set(null);
    messages.set([]);
    isStreaming.set(false);
    clearAllCachedMessages();
  });

  describe('conversations', () => {
    it('starts empty', () => {
      expect(get(conversations)).toEqual([]);
    });

    it('adds a conversation', () => {
      conversations.add({
        id: 'test-1',
        title: 'Test Chat',
        model: 'gpt-4',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      });
      const convos = get(conversations);
      expect(convos).toHaveLength(1);
      expect(convos[0].title).toBe('Test Chat');
    });

    it('removes a conversation', () => {
      conversations.add({
        id: 'test-1',
        title: 'Test',
        model: null,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      });
      conversations.remove('test-1');
      expect(get(conversations)).toHaveLength(0);
    });

    it('updates conversation title', () => {
      conversations.add({
        id: 'test-1',
        title: 'Original',
        model: null,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      });
      conversations.updateTitle('test-1', 'Updated');
      expect(get(conversations)[0].title).toBe('Updated');
    });

    it('prepends new conversations', () => {
      conversations.add({
        id: '1',
        title: 'First',
        model: null,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      });
      conversations.add({
        id: '2',
        title: 'Second',
        model: null,
        created_at: '2026-01-02',
        updated_at: '2026-01-02',
      });
      const convos = get(conversations);
      expect(convos[0].id).toBe('2'); // Most recent first
    });
  });

  describe('activeConversationId', () => {
    it('starts as null', () => {
      expect(get(activeConversationId)).toBeNull();
    });

    it('can be set', () => {
      activeConversationId.set('test-1');
      expect(get(activeConversationId)).toBe('test-1');
    });
  });

  describe('messages', () => {
    it('starts empty', () => {
      expect(get(messages)).toEqual([]);
    });

    it('can add messages', () => {
      messages.set([{
        id: 'msg-1',
        conversation_id: 'conv-1',
        role: 'user',
        content: 'Hello',
        created_at: '2026-01-01',
      }]);
      expect(get(messages)).toHaveLength(1);
    });
  });

  describe('isStreaming', () => {
    it('defaults to false', () => {
      expect(get(isStreaming)).toBe(false);
    });
  });

  describe('messageCache', () => {
    it('caches and retrieves messages for a conversation', () => {
      const msgs = [
        { id: 'msg-1', conversation_id: 'conv-1', role: 'user' as const, content: 'Hello', created_at: '2026-01-01' },
        { id: 'msg-2', conversation_id: 'conv-1', role: 'assistant' as const, content: 'Hi!', created_at: '2026-01-01' },
      ];
      cacheMessages('conv-1', msgs);
      expect(getCachedMessages('conv-1')).toEqual(msgs);
    });

    it('returns undefined for uncached conversations', () => {
      expect(getCachedMessages('nonexistent')).toBeUndefined();
    });

    it('strips streaming placeholders when caching', () => {
      const msgs = [
        { id: 'msg-1', conversation_id: 'conv-1', role: 'user' as const, content: 'Hello', created_at: '2026-01-01' },
        { id: 'streaming', conversation_id: 'conv-1', role: 'assistant' as const, content: 'partial...', created_at: '2026-01-01' },
      ];
      cacheMessages('conv-1', msgs);
      const cached = getCachedMessages('conv-1')!;
      expect(cached).toHaveLength(1);
      expect(cached[0].id).toBe('msg-1');
    });

    it('clears cache for a specific conversation', () => {
      cacheMessages('conv-1', [{ id: 'msg-1', conversation_id: 'conv-1', role: 'user' as const, content: 'Hello', created_at: '2026-01-01' }]);
      cacheMessages('conv-2', [{ id: 'msg-2', conversation_id: 'conv-2', role: 'user' as const, content: 'World', created_at: '2026-01-01' }]);
      clearCachedMessages('conv-1');
      expect(getCachedMessages('conv-1')).toBeUndefined();
      expect(getCachedMessages('conv-2')).toBeDefined();
    });

    it('clears all cached messages', () => {
      cacheMessages('conv-1', [{ id: 'msg-1', conversation_id: 'conv-1', role: 'user' as const, content: 'Hello', created_at: '2026-01-01' }]);
      cacheMessages('conv-2', [{ id: 'msg-2', conversation_id: 'conv-2', role: 'user' as const, content: 'World', created_at: '2026-01-01' }]);
      clearAllCachedMessages();
      expect(getCachedMessages('conv-1')).toBeUndefined();
      expect(getCachedMessages('conv-2')).toBeUndefined();
    });
  });
});
