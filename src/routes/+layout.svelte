<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { useSession } from '$lib/auth-client';
	import { Toaster } from '$lib/components/ui/sonner/index.js';
	import { ModeWatcher } from 'mode-watcher';
	import '../app.css';

	let { children } = $props();
	const session = useSession();

	let isLoading: boolean = $state(true);
	const unprotectedRoutes = ['/', '/login'];
	const isAuthenticated = () => !!$session.data?.user?.id;

	$effect(() => {
		if ($session.isPending) {
			isLoading = true;
			return;
		}

		isLoading = false;

		const needsAuth = !unprotectedRoutes.includes(page.url.pathname);
		if (!isAuthenticated() && needsAuth) {
			goto('/login');
		}
	});
</script>

<svelte:head>
	<title>RepWise</title>
</svelte:head>

<ModeWatcher />
<Toaster />

{#if isLoading}
	<div class="flex h-screen items-center justify-center">
		<div
			class="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"
		></div>
	</div>
{:else}
	{@render children()}
{/if}
