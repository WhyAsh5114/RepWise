<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';

	let { children } = $props();

	const unprotectedRoutes = ['/', '/login'];
	let isAuthenticated: Boolean = false;

	$effect(() => {
		if (!isAuthenticated && !unprotectedRoutes.includes(page.url.pathname)) {
			goto('/login');
		}
	});
</script>

{@render children()}
