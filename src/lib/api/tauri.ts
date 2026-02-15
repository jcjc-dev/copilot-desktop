import { invoke } from '@tauri-apps/api/core';
import { logger } from '$lib/utils/logger';

// NOTE: The interfaces below mirror Rust structs in src-tauri/src/commands.rs.
// Run `cargo test` in src-tauri/ to auto-generate TypeScript types via ts-rs
// into src-tauri/bindings/. Keep these definitions in sync with the generated files.

export interface Settings {
  theme: string;
  default_model: string | null;
  system_prompt: string | null;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: string | null;
}

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
  role: string;
  content: string;
  thinking?: string;
  created_at: string;
}

// Client lifecycle
export async function startClient(): Promise<void> {
  logger.debug('startClient', 'Initializing Copilot client…');
  const result = await invoke<void>('start_client');
  logger.debug('startClient', 'Client started successfully');
  return result;
}

export async function stopClient(): Promise<void> {
  logger.debug('stopClient', 'Stopping client');
  return invoke('stop_client');
}

// Models
export async function listModels(): Promise<ModelInfo[]> {
  return invoke('list_models');
}

export async function refreshModelList(): Promise<void> {
  return invoke('refresh_model_list');
}

// Sessions
export async function createSession(model?: string, systemPrompt?: string): Promise<string> {
  logger.debug('createSession', { model, systemPrompt });
  const id = await invoke<string>('create_session', { model, systemPrompt });
  logger.debug('createSession', 'Session created:', id);
  return id;
}

export async function destroySession(sessionId: string): Promise<void> {
  logger.debug('destroySession', sessionId);
  return invoke('destroy_session', { sessionId });
}

export async function sendMessage(sessionId: string, content: string): Promise<void> {
  logger.debug('sendMessage', { sessionId, contentLength: content.length });
  return invoke('send_message', { sessionId, content });
}

// Settings
export async function getSettings(): Promise<Settings> {
  return invoke('get_settings');
}

export async function updateSettings(settings: Settings): Promise<void> {
  return invoke('update_settings', { settings });
}

// Conversations
export async function listConversations(limit?: number, offset?: number): Promise<Conversation[]> {
  return invoke('list_conversations', { limit, offset });
}

export async function getConversation(conversationId: string, limit?: number, offset?: number): Promise<[Conversation, Message[]]> {
  return invoke('get_conversation', { conversationId, limit, offset });
}

export async function createConversation(title?: string, model?: string): Promise<Conversation> {
  return invoke('create_conversation', { title, model });
}

export async function deleteConversation(conversationId: string): Promise<void> {
  return invoke('delete_conversation', { conversationId });
}

export async function saveMessage(message: Message): Promise<void> {
  return invoke('save_message', { message });
}
