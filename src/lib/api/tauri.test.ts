import { describe, it, expect, vi, afterEach } from 'vitest';
import { mockIPC, clearMocks } from '@tauri-apps/api/mocks';
import { invoke } from '@tauri-apps/api/core';

describe('Tauri IPC Commands', () => {
  afterEach(() => {
    clearMocks();
  });

  describe('start_client', () => {
    it('calls start_client command', async () => {
      mockIPC((cmd) => {
        if (cmd === 'start_client') return null;
      });
      const result = await invoke('start_client');
      expect(result).toBeNull();
    });

    it('handles start_client errors', async () => {
      mockIPC((cmd) => {
        if (cmd === 'start_client') {
          throw new Error('Could not find Copilot CLI');
        }
      });
      await expect(invoke('start_client')).rejects.toThrow('Could not find Copilot CLI');
    });
  });

  describe('list_models', () => {
    it('returns model list', async () => {
      mockIPC((cmd) => {
        if (cmd === 'list_models') {
          return [
            { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
            { id: 'claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'Anthropic' },
          ];
        }
      });
      const models = await invoke('list_models');
      expect(models).toHaveLength(2);
      expect((models as any)[0].id).toBe('gpt-4o');
    });

    it('handles empty model list', async () => {
      mockIPC((cmd) => {
        if (cmd === 'list_models') return [];
      });
      const models = await invoke('list_models');
      expect(models).toEqual([]);
    });
  });

  describe('get_settings', () => {
    it('returns settings', async () => {
      mockIPC((cmd) => {
        if (cmd === 'get_settings') {
          return { theme: 'dark', default_model: null, system_prompt: null };
        }
      });
      const settings = await invoke('get_settings');
      expect((settings as any).theme).toBe('dark');
    });
  });

  describe('update_settings', () => {
    it('sends settings to backend', async () => {
      const receivedArgs: any[] = [];
      mockIPC((cmd, args) => {
        if (cmd === 'update_settings') {
          receivedArgs.push(args);
          return null;
        }
      });
      await invoke('update_settings', {
        settings: { theme: 'light', default_model: 'gpt-4o', system_prompt: 'Be helpful' },
      });
      expect(receivedArgs).toHaveLength(1);
      expect(receivedArgs[0].settings.theme).toBe('light');
    });
  });

  describe('conversation CRUD', () => {
    it('creates a conversation', async () => {
      mockIPC((cmd, args) => {
        if (cmd === 'create_conversation') {
          return {
            id: 'conv-123',
            title: (args as any).title || 'New Chat',
            model: (args as any).model || null,
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          };
        }
      });
      const convo = await invoke('create_conversation', { title: 'Test Chat' });
      expect((convo as any).title).toBe('Test Chat');
    });

    it('lists conversations', async () => {
      mockIPC((cmd) => {
        if (cmd === 'list_conversations') {
          return [
            { id: 'c1', title: 'Chat 1', model: null, created_at: '2026-01-01', updated_at: '2026-01-01' },
            { id: 'c2', title: 'Chat 2', model: 'gpt-4', created_at: '2026-01-02', updated_at: '2026-01-02' },
          ];
        }
      });
      const convos = await invoke('list_conversations');
      expect(convos).toHaveLength(2);
    });

    it('deletes a conversation', async () => {
      let deletedId = '';
      mockIPC((cmd, args) => {
        if (cmd === 'delete_conversation') {
          deletedId = (args as any).conversationId;
          return null;
        }
      });
      await invoke('delete_conversation', { conversationId: 'c1' });
      expect(deletedId).toBe('c1');
    });
  });

  describe('send_message', () => {
    it('sends message with session and content', async () => {
      let sentArgs: any = null;
      mockIPC((cmd, args) => {
        if (cmd === 'send_message') {
          sentArgs = args;
          return null;
        }
      });
      await invoke('send_message', { sessionId: 'sess-1', content: 'Hello world' });
      expect(sentArgs.sessionId).toBe('sess-1');
      expect(sentArgs.content).toBe('Hello world');
    });
  });

  describe('create_session', () => {
    it('creates session with model', async () => {
      mockIPC((cmd) => {
        if (cmd === 'create_session') {
          return 'session-abc-123';
        }
      });
      const sessionId = await invoke('create_session', { model: 'gpt-4o' });
      expect(sessionId).toBe('session-abc-123');
    });
  });
});
