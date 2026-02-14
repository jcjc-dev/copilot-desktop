<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { activeConversationId, messages } from '$lib/stores/chat';
  import ChatPanel from '$lib/components/chat/ChatPanel.svelte';
  import MessageInput from '$lib/components/chat/MessageInput.svelte';
  import ModelSelector from '$lib/components/chat/ModelSelector.svelte';
  import { sendChatMessage, initChatListeners, cleanupChatListeners } from '$lib/services/chat';

  let activeId = $derived($activeConversationId);
  let msgList = $derived($messages);

  onMount(() => {
    initChatListeners();
  });

  onDestroy(() => {
    cleanupChatListeners();
  });

  function handleSend(content: string) {
    sendChatMessage(content);
  }
</script>

{#if !activeId && msgList.length === 0}
  <!-- Welcome screen -->
  <div class="h-full flex flex-col">
    <div class="flex-1 flex flex-col items-center justify-center px-4">
      <div class="text-center space-y-4 max-w-lg">
        <h2 class="text-2xl font-semibold text-gray-700 dark:text-gray-300">Welcome to Copilot Desktop</h2>
        <p class="text-gray-500 dark:text-gray-400">Start a conversation to get help with coding, writing, analysis, and more.</p>
        <div class="grid grid-cols-2 gap-3 mt-6">
          <button onclick={() => handleSend('Help me write some code')} class="p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition-colors">
            <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Write code</p>
            <p class="text-xs text-gray-400 mt-1">Generate, explain, or debug</p>
          </button>
          <button onclick={() => handleSend('Help me analyze some data')} class="p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition-colors">
            <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Analyze data</p>
            <p class="text-xs text-gray-400 mt-1">Patterns and insights</p>
          </button>
          <button onclick={() => handleSend('Help me draft a document')} class="p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition-colors">
            <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Draft content</p>
            <p class="text-xs text-gray-400 mt-1">Emails, docs, summaries</p>
          </button>
          <button onclick={() => handleSend('Explain a concept to me')} class="p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition-colors">
            <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Learn concepts</p>
            <p class="text-xs text-gray-400 mt-1">Explore and understand</p>
          </button>
        </div>
      </div>
    </div>
    <div class="pb-2">
      <MessageInput onSend={handleSend} />
      <div class="flex justify-center py-1">
        <ModelSelector />
      </div>
    </div>
  </div>
{:else}
  <!-- Chat view -->
  <div class="h-full flex flex-col">
    <ChatPanel />
    <MessageInput onSend={handleSend} />
    <div class="flex justify-center py-1 bg-white dark:bg-gray-900">
      <ModelSelector />
    </div>
  </div>
{/if}
