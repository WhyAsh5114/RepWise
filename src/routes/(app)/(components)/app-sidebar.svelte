<script lang="ts">
	import { page } from '$app/state';
	import { authClient } from '$lib/auth/auth-client';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { useSidebar } from '$lib/components/ui/sidebar/index.js';
	import {
		BlocksIcon,
		ChevronUpIcon,
		CogIcon,
		LoaderCircleIcon,
		LogInIcon,
		UserRound,
		UserRoundIcon
	} from 'lucide-svelte';

	const sidebar = useSidebar();
	const session = authClient.useSession();

	const SIDEBAR_LINK_GROUPS = [
		{
			label: 'App',
			items: [
				{
					label: 'Dashboard',
					href: '/dashboard',
					icon: BlocksIcon
				},
				{
					label: 'Settings',
					href: '/settings',
					icon: CogIcon
				}
			]
		},
		{
			label: 'Profile',
			items: [
				{
					label: 'View Profile',
					href: '/profile',
					icon: UserRound
				}
			]
		}
	];
</script>

<Sidebar.Root>
	<Sidebar.Header>
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<Sidebar.MenuButton
					class="h-fit w-full justify-start bg-secondary text-start"
					onclick={() => sidebar.setOpenMobile(false)}
				>
					<a class="flex w-full items-center gap-2 px-2 py-0 text-xl font-semibold" href="/">
						<img src="/favicon.ico" alt="logo" class="h-12 w-12" />
						MyFit <span class="ml-auto text-sm font-normal">v4</span>
					</a>
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Header>
	<Sidebar.Content>
		{#each SIDEBAR_LINK_GROUPS as linkGroup (linkGroup.label)}
			<Sidebar.Group>
				<Sidebar.GroupLabel>{linkGroup.label}</Sidebar.GroupLabel>
				<Sidebar.GroupContent>
					<Sidebar.Menu>
						{#each linkGroup.items as link (link.label)}
							<Sidebar.MenuItem>
								<Sidebar.MenuButton
									onclick={() => sidebar.setOpenMobile(false)}
									isActive={page.url.pathname.startsWith(link.href)}
								>
									{#snippet child({ props })}
										<a href={link.href} {...props}>
											<link.icon />
											<span>{link.label}</span>
										</a>
									{/snippet}
								</Sidebar.MenuButton>
							</Sidebar.MenuItem>
						{/each}
					</Sidebar.Menu>
				</Sidebar.GroupContent>
			</Sidebar.Group>
		{/each}
	</Sidebar.Content>
	<Sidebar.Footer>
		<Sidebar.Menu class="flex w-full flex-row">
			<Sidebar.MenuItem class="grow">
				{#if $session.isPending || $session.isRefetching}
					<Sidebar.MenuButton variant="outline" class="justify-center">
						<LoaderCircleIcon class="animate-spin" />
					</Sidebar.MenuButton>
				{:else if !$session.data}
					<Sidebar.MenuButton variant="outline">
						{#snippet child({ props })}
							<a {...props} href="/login">
								<LogInIcon /> Login
							</a>
						{/snippet}
					</Sidebar.MenuButton>
				{:else}
					<DropdownMenu.Root>
						<DropdownMenu.Trigger>
							{#snippet child({ props })}
								<Sidebar.MenuButton variant="outline" {...props}>
									<UserRoundIcon />
									{$session.data!.user.name}
									<ChevronUpIcon class="ml-auto" />
								</Sidebar.MenuButton>
							{/snippet}
						</DropdownMenu.Trigger>
						<DropdownMenu.Content class="w-[var(--bits-dropdown-menu-anchor-width)]">
							<DropdownMenu.Group>
								<DropdownMenu.Item onclick={() => sidebar.setOpenMobile(false)}>
									{#snippet child({ props })}
										<a href="/settings" {...props}><CogIcon /> Settings</a>
									{/snippet}
								</DropdownMenu.Item>
								<DropdownMenu.Item onclick={() => sidebar.setOpenMobile(false)}>
									{#snippet child({ props })}
										<a href="/profile" {...props}><UserRoundIcon /> Profile</a>
									{/snippet}
								</DropdownMenu.Item>
								<DropdownMenu.Item
									class="text-destructive"
									onclick={() => {
										authClient.signOut();
										localStorage.clear();
										client.resetDatabase();
									}}
								>
									<LogInIcon />
									Logout
								</DropdownMenu.Item>
							</DropdownMenu.Group>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				{/if}
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Footer>
</Sidebar.Root>
