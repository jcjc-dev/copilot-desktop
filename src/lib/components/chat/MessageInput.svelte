<script lang="ts">
  import { isStreaming } from '$lib/stores/chat';

  let {
    onSend = (_msg: string) => {},
    disabled = false,
  }: {
    onSend?: (message: string) => void;
    disabled?: boolean;
  } = $props();

  let inputValue = $state('');
  let textareaEl: HTMLTextAreaElement;
  let streaming = $derived($isStreaming);

  function autoResize() {
    if (textareaEl) {
      textareaEl.style.height = 'auto';
      textareaEl.style.height = Math.min(textareaEl.scrollHeight, 200) + 'px';
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  function sendMessage() {
    const trimmed = inputValue.trim();
    if (!trimmed || streaming || disabled) return;
    
    onSend(trimmed);
    inputValue = '';
    
    if (textareaEl) {
      textareaEl.style.height = 'auto';
    }
  }
</script>

<div class="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3">
  <div class="max-w-5xl mx-auto">
    <div class="flex items-end gap-2 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 px-4 py-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all">
      <textarea
        bind:this={textareaEl}
        bind:value={inputValue}
        oninput={autoResize}
        onkeydown={handleKeydown}
        placeholder="Send a message..."
        disabled={streaming || disabled}
        rows="1"
        class="flex-1 bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 resize-none focus:outline-none disabled:opacity-50 max-h-[200px]"
      ></textarea>

      <button
        onclick={sendMessage}
        disabled={!inputValue.trim() || streaming || disabled}
        class="flex-shrink-0 p-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="Send message"
      >
        {#if streaming}
          <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
        {:else}
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19V5m0 0l-7 7m7-7l7 7" />
          </svg>
        {/if}
      </button>
    </div>

    <p class="text-xs text-center text-gray-400 dark:text-gray-500 mt-2">
      Copilot Desktop can make mistakes. Review important information.
    </p>
  </div>
</div>
