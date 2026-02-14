import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';

export interface ModelInfo {
  id: string;
  name: string;
  provider: string | null;
}

export const models = writable<ModelInfo[]>([]);
export const selectedModel = writable<string | null>(null);

export async function loadModels() {
  try {
    const { listModels } = await import('$lib/api/tauri');
    const modelList = await listModels();
    models.set(modelList);

    // Set default if none selected
    const current = get(selectedModel);
    if (!current && modelList.length > 0) {
      // Try to restore from localStorage, or use first model
      const stored = browser ? localStorage.getItem('selected-model') : null;
      if (stored && modelList.find(m => m.id === stored)) {
        selectedModel.set(stored);
      } else {
        selectedModel.set(modelList[0].id);
      }
    }
  } catch (e) {
    console.warn('Failed to load models:', e);
    // Provide fallback models for development
    models.set([
      { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
      { id: 'claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'Anthropic' },
    ]);
  }
}

// Persist model selection
selectedModel.subscribe(value => {
  if (browser && value) {
    localStorage.setItem('selected-model', value);
  }
});
