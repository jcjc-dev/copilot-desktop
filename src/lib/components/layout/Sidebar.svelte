<script lang="ts">
  import { sidebarOpen } from '$lib/stores/sidebar';
  import { conversations, activeConversationId, type Conversation } from '$lib/stores/chat';
  import { switchConversation, removeConversation, startNewChat } from '$lib/services/conversations';
  import ConversationContextMenu from './ConversationContextMenu.svelte';

  let searchQuery = $state('');
  let open = $derived($sidebarOpen);
  let allConvos = $derived($conversations);
  let activeId = $derived($activeConversationId);

  let filteredConvos = $derived(
    searchQuery
      ? allConvos.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
      : allConvos
  );

  function groupByDate(convos: Conversation[]) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);
    const weekAgo = new Date(today.getTime() - 7 * 86400000);

    const groups: { label: string; items: Conversation[] }[] = [
      { label: 'Today', items: [] },
      { label: 'Yesterday', items: [] },
      { label: 'Previous 7 Days', items: [] },
      { label: 'Older', items: [] },
    ];

    for (const c of convos) {
      const date = new Date(c.updated_at);
      if (date >= today) groups[0].items.push(c);
      else if (date >= yesterday) groups[1].items.push(c);
      else if (date >= weekAgo) groups[2].items.push(c);
      else groups[3].items.push(c);
    }

    return groups.filter(g => g.items.length > 0);
  }

  let grouped = $derived(groupByDate(filteredConvos));

  function newChat() {
    startNewChat();
  }

  function selectConversation(id: string) {
    switchConversation(id);
  }

  function deleteConversation(id: string, event: Event) {
    event.stopPropagation();
    removeConversation(id);
  }

  let contextMenu = $state<{ conversation: Conversation; position: { x: number; y: number } } | null>(null);

  function handleContextMenu(event: MouseEvent, convo: Conversation) {
    event.preventDefault();
    event.stopPropagation();
    contextMenu = { conversation: convo, position: { x: event.clientX, y: event.clientY } };
  }

  function closeContextMenu() {
    contextMenu = null;
  }
</script>

{#if open}
<aside class="fixed top-12 left-0 bottom-0 w-64 bg-gray-50 dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 flex flex-col z-40">
  <div class="p-3">
    <button
      onclick={newChat}
      class="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-medium transition-colors"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
      </svg>
      New Chat
    </button>
  </div>

  <div class="px-3 pb-2">
    <input
      type="text"
      placeholder="Search conversations..."
      bind:value={searchQuery}
      class="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
    />
  </div>

  <div class="flex-1 overflow-y-auto px-2">
    {#each grouped as group}
      <div class="text-xs text-gray-400 dark:text-gray-500 px-2 py-2 uppercase tracking-wider">{group.label}</div>
      {#each group.items as convo}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          onclick={() => selectConversation(convo.id)}
          onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') selectConversation(convo.id); }}
          oncontextmenu={(e) => handleContextMenu(e, convo)}
          role="button"
          tabindex="0"
          class="w-full text-left group flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors mb-0.5 cursor-pointer
            {activeId === convo.id
              ? 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50'}"
        >
          <span class="flex-1 truncate">{convo.title}</span>
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <span
            role="button"
            tabindex="0"
            onclick={(e) => deleteConversation(convo.id, e)}
            onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') deleteConversation(convo.id, e); }}
            class="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-400 hover:text-red-500 transition-all"
            aria-label="Delete conversation"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </span>
        </div>
      {/each}
    {/each}

    {#if filteredConvos.length === 0}
      <p class="px-3 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
        {searchQuery ? 'No matching conversations' : 'No conversations yet'}
      </p>
    {/if}
  </div>

  <div class="p-3 border-t border-gray-200 dark:border-gray-800">
    <button class="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm transition-colors">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.11 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      Settings
    </button>
  </div>

  {#if contextMenu}
    <ConversationContextMenu
      conversation={contextMenu.conversation}
      position={contextMenu.position}
      onClose={closeContextMenu}
    />
  {/if}
</aside>
{/if}
