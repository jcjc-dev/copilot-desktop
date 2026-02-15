<script lang="ts">
  import type { Message } from '$lib/stores/chat';
  import MarkdownRenderer from './MarkdownRenderer.svelte';

  let { message }: { message: Message } = $props();
  let showCopied = $state(false);
  let thinkingExpanded = $state(false);

  function copyContent() {
    navigator.clipboard.writeText(message.content);
    showCopied = true;
    setTimeout(() => { showCopied = false; }, 2000);
  }

  function formatTime(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
</script>

<div class="group flex gap-3 {message.role === 'user' ? 'flex-row-reverse' : ''}">
  <!-- Avatar -->
  <div class="flex-shrink-0 mt-1">
    {#if message.role === 'assistant'}
      <div class="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
        <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
    {:else}
      <div class="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
        <svg class="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </div>
    {/if}
  </div>

  <!-- Message content -->
  <div class="flex-1 max-w-[85%] space-y-1">
    {#if message.role === 'user'}
      <div class="bg-blue-600 text-white rounded-2xl rounded-br-md px-4 py-2.5 inline-block">
        <p class="text-sm whitespace-pre-wrap">{message.content}</p>
      </div>
    {:else}
      <div class="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-md px-4 py-3 space-y-2">
        {#if message.thinking}
          <button
            onclick={() => thinkingExpanded = !thinkingExpanded}
            class="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            <svg
              class="w-3 h-3 transition-transform {thinkingExpanded ? 'rotate-90' : ''}"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            {#if message.id === 'streaming' && !message.content}
              Thinking…
            {:else}
              Thought process
            {/if}
          </button>
          {#if thinkingExpanded || (message.id === 'streaming' && !message.content)}
            <div class="border-l-2 border-purple-300 dark:border-purple-600 pl-3 py-1 text-sm text-gray-500 dark:text-gray-400 italic">
              <MarkdownRenderer content={message.thinking} />
            </div>
          {/if}
        {/if}
        {#if message.content}
          <MarkdownRenderer content={message.content} />
        {/if}
      </div>
    {/if}

    <!-- Actions row -->
    <div class="flex items-center gap-2 px-1 {message.role === 'user' ? 'justify-end' : ''}">
      <span class="text-xs text-gray-400 dark:text-gray-500">{formatTime(message.created_at)}</span>
      <button
        onclick={copyContent}
        class="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all"
        aria-label="Copy message"
      >
        {#if showCopied}
          <svg class="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        {:else}
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        {/if}
      </button>
    </div>
  </div>
</div>
