import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';

export interface ModelInfo {
  id: string;
  name: string;
  provider: string | null;
}

export const models = writable<ModelInfo[]>([]);
export const selectedModel = writable<string | null>(null);

/** IDs of models the user has enabled for the selector. Empty set = all enabled. */
export const enabledModelIds = writable<Set<string>>(
  browser ? loadEnabledModels() : new Set()
);

function loadEnabledModels(): Set<string> {
  try {
    const stored = localStorage.getItem('enabled-models');
    if (stored) return new Set(JSON.parse(stored));
  } catch { /* ignore */ }
  return new Set();
}

function persistEnabledModels(ids: Set<string>) {
  if (browser) {
    localStorage.setItem('enabled-models', JSON.stringify([...ids]));
  }
}

enabledModelIds.subscribe(ids => persistEnabledModels(ids));

/** Models visible in the selector — filtered by user preference. */
export const visibleModels = derived(
  [models, enabledModelIds],
  ([$models, $enabled]) => {
    if ($enabled.size === 0) return $models;
    return $models.filter(m => $enabled.has(m.id));
  }
);

export function setModelEnabled(modelId: string, enabled: boolean, allModelIds?: string[]) {
  enabledModelIds.update(ids => {
    let next = new Set(ids);
    // When set is empty (all enabled) and user is disabling one model,
    // first populate with all model IDs, then remove the target.
    if (next.size === 0 && !enabled && allModelIds) {
      next = new Set(allModelIds);
    }
    if (enabled) {
      next.add(modelId);
    } else {
      next.delete(modelId);
    }
    return next;
  });
}

export function isModelEnabled(modelId: string, enabledIds: Set<string>): boolean {
  return enabledIds.size === 0 || enabledIds.has(modelId);
}

export async function loadModels() {
  try {
    const { listModels } = await import('$lib/api/tauri');
    const modelList = await listModels();
    if (modelList.length === 0) {
      console.warn('Model list returned empty from backend');
    }
    models.set(modelList);

    // Set default if none selected
    const current = get(selectedModel);
    if (!current && modelList.length > 0) {
      const stored = browser ? localStorage.getItem('selected-model') : null;
      if (stored && modelList.find(m => m.id === stored)) {
        selectedModel.set(stored);
      } else {
        selectedModel.set(modelList[0].id);
      }
    }
  } catch (e) {
    console.warn('Failed to load models:', e);
  }
}

/** Force-refresh the model list from the backend, bypassing all caches. */
export async function refreshModels() {
  try {
    const { refreshModelList } = await import('$lib/api/tauri');
    await refreshModelList();
    await loadModels();
  } catch (e) {
    console.warn('Failed to refresh models:', e);
  }
}

// Persist model selection
selectedModel.subscribe(value => {
  if (browser && value) {
    localStorage.setItem('selected-model', value);
  }
});
