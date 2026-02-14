<script lang="ts">
  import { settings, settingsOpen, saveSettings, type AppSettings } from '$lib/stores/settings';
  import { theme } from '$lib/stores/theme';

  let open = $derived($settingsOpen);
  let currentSettings = $derived($settings);
  let activeTab = $state<'general' | 'models' | 'about'>('general');

  let editTheme = $state('dark');
  let editSystemPrompt = $state('');

  $effect(() => {
    editTheme = currentSettings.theme;
    editSystemPrompt = currentSettings.system_prompt || '';
  });

  function close() {
    settingsOpen.set(false);
  }

  function save() {
    const updated: AppSettings = {
      ...currentSettings,
      theme: editTheme,
      system_prompt: editSystemPrompt || null,
    };
    saveSettings(updated);
    theme.set(editTheme as 'dark' | 'light');
    close();
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      close();
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') close();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]"
    onclick={handleBackdropClick}
  >
    <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Settings</h2>
        <button onclick={close} class="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Tabs -->
      <div class="flex border-b border-gray-200 dark:border-gray-800 px-6">
        {#each ['general', 'models', 'about'] as tab}
          <button
            onclick={() => activeTab = tab as typeof activeTab}
            class="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize
              {activeTab === tab
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}"
          >
            {tab}
          </button>
        {/each}
      </div>

      <!-- Content -->
      <div class="p-6 max-h-[400px] overflow-y-auto">
        {#if activeTab === 'general'}
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Theme</label>
              <select
                bind:value={editTheme}
                class="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-100"
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="system">System</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">System Prompt</label>
              <textarea
                bind:value={editSystemPrompt}
                placeholder="Custom instructions for the assistant..."
                rows="4"
                class="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 resize-none"
              ></textarea>
            </div>
          </div>
        {:else if activeTab === 'models'}
          <div class="space-y-4">
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Model configuration coming soon. Models are loaded from Copilot CLI.
            </p>
          </div>
        {:else}
          <div class="space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <div class="flex justify-between">
              <span>Version</span>
              <span class="text-gray-900 dark:text-gray-100 font-mono">0.1.0</span>
            </div>
            <div class="flex justify-between">
              <span>Powered by</span>
              <span class="text-gray-900 dark:text-gray-100">GitHub Copilot SDK</span>
            </div>
            <div class="flex justify-between">
              <span>Runtime</span>
              <span class="text-gray-900 dark:text-gray-100">Tauri V2</span>
            </div>
          </div>
        {/if}
      </div>

      <!-- Footer -->
      <div class="flex justify-end gap-2 px-6 py-4 border-t border-gray-200 dark:border-gray-800">
        <button onclick={close} class="px-4 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
          Cancel
        </button>
        <button onclick={save} class="px-4 py-2 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-700">
          Save
        </button>
      </div>
    </div>
  </div>
{/if}
