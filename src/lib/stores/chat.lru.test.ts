import { describe, it, expect, beforeEach } from 'vitest';
import {
  cacheMessages,
  getCachedMessages,
  clearAllCachedMessages,
  MAX_CACHE_SIZE,
} from './chat';
import type { Message } from './chat';

function makeMessages(conversationId: string): Message[] {
  return [
    {
      id: `msg-${conversationId}`,
      conversation_id: conversationId,
      role: 'user',
      content: `Message for ${conversationId}`,
      created_at: '2026-01-01',
    },
  ];
}

describe('LRU cache eviction', () => {
  beforeEach(() => {
    clearAllCachedMessages();
  });

  it('evicts oldest entries when exceeding MAX_CACHE_SIZE', () => {
    const totalInserts = MAX_CACHE_SIZE + 5;

    // Insert MAX_CACHE_SIZE + 5 items
    for (let i = 0; i < totalInserts; i++) {
      cacheMessages(`conv-${i}`, makeMessages(`conv-${i}`));
    }

    // The first 5 entries (conv-0 through conv-4) should have been evicted
    for (let i = 0; i < 5; i++) {
      expect(getCachedMessages(`conv-${i}`)).toBeUndefined();
    }

    // The remaining entries (conv-5 through conv-14) should still be present
    for (let i = 5; i < totalInserts; i++) {
      const cached = getCachedMessages(`conv-${i}`);
      expect(cached).toBeDefined();
      expect(cached![0].conversation_id).toBe(`conv-${i}`);
    }
  });

  it('respects LRU order — accessing an item prevents its eviction', () => {
    // Fill cache to capacity
    for (let i = 0; i < MAX_CACHE_SIZE; i++) {
      cacheMessages(`conv-${i}`, makeMessages(`conv-${i}`));
    }

    // Access conv-0 to move it to the "most recently used" end
    getCachedMessages('conv-0');

    // Insert 1 more item — this should evict conv-1 (the new oldest), not conv-0
    cacheMessages('conv-new', makeMessages('conv-new'));

    // conv-0 should survive because we accessed it
    expect(getCachedMessages('conv-0')).toBeDefined();

    // conv-1 should have been evicted (it became the oldest after conv-0 was accessed)
    expect(getCachedMessages('conv-1')).toBeUndefined();

    // The new item should be present
    expect(getCachedMessages('conv-new')).toBeDefined();
  });

  it('MAX_CACHE_SIZE is 10', () => {
    // Ensure the constant is what we expect
    expect(MAX_CACHE_SIZE).toBe(10);
  });
});
