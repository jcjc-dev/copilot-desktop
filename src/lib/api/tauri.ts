import { invoke } from '@tauri-apps/api/core';

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
  created_at: string;
}

// Client lifecycle
export async function startClient(): Promise<void> {
  return invoke('start_client');
}

export async function stopClient(): Promise<void> {
  return invoke('stop_client');
}

// Models
export async function listModels(): Promise<ModelInfo[]> {
  return invoke('list_models');
}

// Sessions
export async function createSession(model?: string, systemPrompt?: string): Promise<string> {
  return invoke('create_session', { model, systemPrompt });
}

export async function destroySession(sessionId: string): Promise<void> {
  return invoke('destroy_session', { sessionId });
}

export async function sendMessage(sessionId: string, content: string): Promise<void> {
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
export async function listConversations(): Promise<Conversation[]> {
  return invoke('list_conversations');
}

export async function getConversation(conversationId: string): Promise<[Conversation, Message[]]> {
  return invoke('get_conversation', { conversationId });
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
