<script lang="ts">
	import { page } from '$app/state';
	import { authClient } from '$lib/auth-client';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { useSidebar } from '$lib/components/ui/sidebar/index.js';
	import {
		BarChartIcon,
		BlocksIcon,
		ChevronUpIcon,
		ClipboardListIcon,
		CogIcon,
		DumbbellIcon,
		LoaderCircleIcon,
		LogInIcon,
		ScanQrCodeIcon,

		SwordsIcon,
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
					label: 'Form Correction',
					href: '/form-correction',
					icon: DumbbellIcon
				},
				{
					label: 'Macro Tracking',
					href: '/macro-tracking',
					icon: BarChartIcon
				},
				{
					label: 'Onboarding',
					href: '/onboarding',
					icon: ClipboardListIcon
				},
				{
					label: 'Nutritional OCR',
					href: '/nutritional-ocr',
					icon: ScanQrCodeIcon
				},
				{
					label: 'Compete',
					href: '/compete',
					icon: SwordsIcon
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
	<Sidebar.Header class="bg-background text-foreground">
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<Sidebar.MenuButton
					class="h-fit w-full justify-start bg-secondary text-start"
					onclick={() => sidebar.setOpenMobile(false)}
				>
					<a class="flex w-full items-center gap-2 px-2 py-0 text-xl font-semibold" href="/">
						<img src="/favicon.ico" alt="logo" class="h-12 w-12" />
						RepWise
					</a>
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Header>
	<Sidebar.Content class="bg-background text-foreground">
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
	<Sidebar.Footer class="bg-background text-foreground">
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
								<DropdownMenu.Item
									class="text-destructive"
									onclick={() => {
										authClient.signOut();
										localStorage.clear();
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
