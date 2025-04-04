<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { useSession } from '$lib/auth-client';

	let { children } = $props();
	let session = useSession();

	const unprotectedRoutes = ['/', '/login'];
	let isAuthenticated = $derived(!!$session.data?.user?.id);

	$effect(() => {
		if (!isAuthenticated && !unprotectedRoutes.includes(page.url.pathname)) {
			goto('/login');
		}
	});
</script>

{@render children()}
