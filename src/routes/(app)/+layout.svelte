<script lang="ts">
	import { Separator } from '$lib/components/ui/separator';
	import AppSidebar from './(components)/app-sidebar.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import LinkBreadcrumbs from './(components)/link-breadcrumbs.svelte';
	import CustomScrollArea from '$lib/components/ui/scroll-area/custom-scroll-area.svelte';

	let { children } = $props();
</script>

<Sidebar.Provider>
	<AppSidebar />

	<div class="mx-auto flex h-screen w-full max-w-xl md:max-w-4xl flex-col">
		<header
			class="sticky top-0 z-50 flex min-h-12 items-center gap-2 bg-background/80 px-4 py-2 backdrop-blur-sm"
		>
			<Sidebar.Trigger />
			<Separator orientation="vertical" class="mr-2 h-6" />
			<LinkBreadcrumbs />
		</header>
		<CustomScrollArea class="h-px w-full grow">
			<main class="flex w-full grow flex-col gap-2 p-4 pt-2 md:gap-4">
				{@render children?.()}
			</main>
		</CustomScrollArea>
	</div>
</Sidebar.Provider>
