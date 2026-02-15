<script lang="ts">
  import { sidebarOpen } from '$lib/stores/sidebar';
  import { theme } from '$lib/stores/theme';
  import { initializeApp, shutdownApp, retryConnection, appStatus, appError } from '$lib/services/app';
  import { onMount, onDestroy } from 'svelte';
  import Navbar from './Navbar.svelte';
  import Sidebar from './Sidebar.svelte';

  let { children } = $props();
  let open = $derived($sidebarOpen ?? true);

  let unlistenClose: (() => void) | undefined;

  onMount(async () => {
    theme.init();
    await initializeApp();

    // Handle window close
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const window = getCurrentWindow();
      unlistenClose = await window.onCloseRequested(async () => {
        await shutdownApp();
      });
    } catch {}
  });

  onDestroy(() => {
    unlistenClose?.();
    shutdownApp();
  });
</script>

{#if $appStatus === 'initializing'}
  <div class="fixed top-0 left-0 right-0 h-1 bg-blue-500 animate-pulse z-[999]"></div>
{:else if $appStatus === 'error'}
  <div class="fixed top-12 left-0 right-0 bg-red-500/90 text-white text-sm px-4 py-2 flex items-center justify-between z-50">
    <span>⚠️ Failed to connect to Copilot: {$appError}</span>
    <button onclick={retryConnection} class="px-3 py-1 bg-white/20 rounded hover:bg-white/30 text-sm">
      Retry
    </button>
  </div>
{/if}

<div class="h-screen flex flex-col bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
  <Navbar />
  <Sidebar />

  <main
    class="flex-1 pt-12 transition-all duration-200 overflow-hidden min-h-0"
    class:ml-64={open}
    class:ml-0={!open}
  >
    {@render children()}
  </main>
</div>
