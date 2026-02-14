<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import AppLayout from '$lib/components/layout/AppLayout.svelte';
	import Toast from '$lib/components/common/Toast.svelte';
	import SettingsModal from '$lib/components/common/SettingsModal.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<AppLayout>
	{@render children()}
</AppLayout>

<Toast />
<SettingsModal />
