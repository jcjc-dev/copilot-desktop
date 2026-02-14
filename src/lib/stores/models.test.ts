import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { models, selectedModel } from './models';

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
