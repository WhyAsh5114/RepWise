<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { useSession } from '$lib/auth-client';

	let { children } = $props();
	const session = useSession();

	let isLoading: B = $state(true);
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

{#if isLoading}
	<div class="flex h-screen items-center justify-center">
		<div
			class="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"
		></div>
	</div>
{:else}
	{@render children()}
{/if}
