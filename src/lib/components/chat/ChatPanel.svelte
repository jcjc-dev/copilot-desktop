<script lang="ts">
  import { messages, isStreaming, activeConversationId } from '$lib/stores/chat';
  import { tick } from 'svelte';
  import MessageBubble from './MessageBubble.svelte';

  const INITIAL_MESSAGE_COUNT = 50;
  let displayCount = $state(INITIAL_MESSAGE_COUNT);

  let messageListEl: HTMLDivElement;
  let msgList = $derived($messages);
  let streaming = $derived($isStreaming);
  let activeId = $derived($activeConversationId);

  let visibleMessages = $derived(
    msgList.length > displayCount ? msgList.slice(msgList.length - displayCount) : msgList
  );
  let hasEarlierMessages = $derived(msgList.length > displayCount);

  // Reset display count when conversation changes
  $effect(() => {
    activeId;
    displayCount = INITIAL_MESSAGE_COUNT;
  });

  function loadEarlierMessages() {
    displayCount += INITIAL_MESSAGE_COUNT;
  }

  // Auto-scroll to bottom when new messages arrive
  $effect(() => {
    if (msgList.length > 0) {
      tick().then(() => {
        if (messageListEl) {
          messageListEl.scrollTop = messageListEl.scrollHeight;
        }
      });
    }
  });
</script>

<div class="flex-1 flex flex-col h-full overflow-hidden">
  <!-- Message list -->
  <div
    bind:this={messageListEl}
    class="flex-1 overflow-y-auto px-4 py-6" style="contain: content;"
  >
    {#if msgList.length === 0}
      <!-- Empty state -->
      <div class="h-full flex items-center justify-center">
        <div class="text-center space-y-3">
          <div class="w-12 h-12 mx-auto rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <svg class="w-6 h-6 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Send a message to start the conversation</p>
        </div>
      </div>
    {:else}
      <div class="max-w-5xl mx-auto space-y-6">
        {#if hasEarlierMessages}
          <div class="text-center">
            <button
              onclick={loadEarlierMessages}
              class="px-4 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              Load earlier messages ({msgList.length - displayCount} more)
            </button>
          </div>
        {/if}
        {#each visibleMessages as message (message.id)}
          {#if !(message.id === 'streaming' && !message.content)}
            <MessageBubble {message} />
          {/if}
        {/each}

        {#if streaming && !(msgList[msgList.length - 1]?.id === 'streaming' && msgList[msgList.length - 1]?.content)}
          <div class="flex gap-4 justify-start">
            <div class="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div class="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-md px-4 py-3">
              <div class="flex gap-1.5">
                <div class="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style="animation-delay: 0ms"></div>
                <div class="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style="animation-delay: 150ms"></div>
                <div class="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style="animation-delay: 300ms"></div>
              </div>
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>
