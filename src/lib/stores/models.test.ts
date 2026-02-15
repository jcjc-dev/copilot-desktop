import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { models, selectedModel, enabledModelIds, visibleModels, setModelEnabled, isModelEnabled } from './models';
import type { ModelInfo } from './models';

describe('models store', () => {
  beforeEach(() => {
    models.set([]);
    selectedModel.set(null);
  });

  it('starts with empty models', () => {
    expect(get(models)).toEqual([]);
  });

  it('can set models', () => {
    models.set([
      { id: 'gpt-4', name: 'GPT-4', provider: 'OpenAI' },
      { id: 'claude-3', name: 'Claude 3', provider: 'Anthropic' },
    ]);
    expect(get(models)).toHaveLength(2);
  });

  it('can select a model', () => {
    selectedModel.set('gpt-4');
    expect(get(selectedModel)).toBe('gpt-4');
  });
});

const testModels: ModelInfo[] = [
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
  { id: 'claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'Anthropic' },
  { id: 'gemini-pro', name: 'Gemini Pro', provider: 'Google' },
  { id: 'o3', name: 'o3', provider: 'OpenAI' },
];

describe('model visibility filtering', () => {
  beforeEach(() => {
    models.set(testModels);
    enabledModelIds.set(new Set());
  });

  it('shows all models when enabledModelIds is empty', () => {
    const visible = get(visibleModels);
    expect(visible).toHaveLength(4);
    expect(visible.map(m => m.id)).toEqual(['gpt-4o', 'claude-sonnet-4', 'gemini-pro', 'o3']);
  });

  it('filters to only enabled models', () => {
    enabledModelIds.set(new Set(['gpt-4o', 'gemini-pro']));
    const visible = get(visibleModels);
    expect(visible).toHaveLength(2);
    expect(visible.map(m => m.id)).toEqual(['gpt-4o', 'gemini-pro']);
  });

  it('setModelEnabled disables a model from all-enabled state', () => {
    expect(isModelEnabled('gpt-4o', get(enabledModelIds))).toBe(true);

    setModelEnabled('gpt-4o', false, testModels.map(m => m.id));

    const enabled = get(enabledModelIds);
    expect(enabled.has('gpt-4o')).toBe(false);
    expect(enabled.has('claude-sonnet-4')).toBe(true);
    expect(enabled.has('gemini-pro')).toBe(true);
    expect(enabled.has('o3')).toBe(true);

    const visible = get(visibleModels);
    expect(visible.map(m => m.id)).not.toContain('gpt-4o');
    expect(visible).toHaveLength(3);
  });

  it('setModelEnabled re-enables a disabled model', () => {
    enabledModelIds.set(new Set(['claude-sonnet-4', 'gemini-pro']));
    expect(get(visibleModels)).toHaveLength(2);

    setModelEnabled('gpt-4o', true);

    expect(get(enabledModelIds).has('gpt-4o')).toBe(true);
    expect(get(visibleModels)).toHaveLength(3);
  });

  it('disabling last enabled model resets to empty set (shows all)', () => {
    enabledModelIds.set(new Set(['gpt-4o']));
    setModelEnabled('gpt-4o', false);

    expect(get(enabledModelIds).size).toBe(0);
    expect(get(visibleModels)).toHaveLength(4);
  });

  it('isModelEnabled returns true for all when set is empty', () => {
    const empty = new Set<string>();
    expect(isModelEnabled('gpt-4o', empty)).toBe(true);
    expect(isModelEnabled('anything', empty)).toBe(true);
  });

  it('isModelEnabled returns false for models not in a non-empty set', () => {
    const partial = new Set(['gpt-4o']);
    expect(isModelEnabled('gpt-4o', partial)).toBe(true);
    expect(isModelEnabled('claude-sonnet-4', partial)).toBe(false);
  });
});
