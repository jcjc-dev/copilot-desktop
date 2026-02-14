<script lang="ts">
  import { models, selectedModel, type ModelInfo } from '$lib/stores/models';

  let open = $state(false);
  let allModels = $derived($models);
  let currentModel = $derived($selectedModel);

  function selectModel(modelId: string) {
    selectedModel.set(modelId);
    open = false;
  }

  function getDisplayName(modelId: string | null): string {
    if (!modelId) return 'Select model';
    const model = allModels.find(m => m.id === modelId);
    return model ? model.name : modelId;
  }

  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.model-selector')) {
      open = false;
    }
  }
</script>

<svelte:window onclick={handleClickOutside} />

<div class="model-selector relative">
  <button
    onclick={() => open = !open}
    class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
  >
    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
    {getDisplayName(currentModel)}
    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
    </svg>
  </button>

  {#if open}
    <div class="absolute bottom-full left-0 mb-1 w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-1 z-50 max-h-60 overflow-y-auto">
      {#if allModels.length === 0}
        <p class="px-4 py-3 text-sm text-gray-400">No models available</p>
      {:else}
        {#each allModels as model}
          <button
            onclick={() => selectModel(model.id)}
            class="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-between
              {currentModel === model.id ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-700 dark:text-gray-300'}"
          >
            <div>
              <div class="font-medium">{model.name}</div>
              {#if model.provider}
                <div class="text-xs text-gray-400">{model.provider}</div>
              {/if}
            </div>
            {#if currentModel === model.id}
              <svg class="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            {/if}
          </button>
        {/each}
      {/if}
    </div>
  {/if}
</div>
