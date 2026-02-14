<script lang="ts">
  import { conversations, type Conversation } from '$lib/stores/chat';

  let {
    conversation,
    position = { x: 0, y: 0 },
    onClose = () => {},
  }: {
    conversation: Conversation;
    position: { x: number; y: number };
    onClose: () => void;
  } = $props();

  let isRenaming = $state(false);
  let newTitle = $state(conversation.title);

  function handleRename() {
    isRenaming = true;
  }

  function submitRename() {
    if (newTitle.trim()) {
      conversations.updateTitle(conversation.id, newTitle.trim());
    }
    isRenaming = false;
    onClose();
  }

  function handleExport() {
    const data = JSON.stringify(conversation, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${conversation.title.replace(/[^a-z0-9]/gi, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onClose();
  }

  function handleDelete() {
    conversations.remove(conversation.id);
    onClose();
  }

  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.context-menu')) {
      onClose();
    }
  }
</script>

<svelte:window onclick={handleClickOutside} />

<div
  class="context-menu fixed z-[200] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-1 w-48"
  style="left: {position.x}px; top: {position.y}px;"
>
  {#if isRenaming}
    <div class="px-3 py-2">
      <input
        type="text"
        bind:value={newTitle}
        onkeydown={(e) => e.key === 'Enter' && submitRename()}
        class="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-transparent text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
        autofocus
      />
    </div>
  {:else}
    <button
      onclick={handleRename}
      class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
      Rename
    </button>
    <button
      onclick={handleExport}
      class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      Export
    </button>
    <div class="border-t border-gray-200 dark:border-gray-700 my-1"></div>
    <button
      onclick={handleDelete}
      class="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
      Delete
    </button>
  {/if}
</div>
