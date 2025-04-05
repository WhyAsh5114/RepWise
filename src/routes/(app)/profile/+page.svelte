<script lang="ts">
	import { format } from 'date-fns';
	import { toast } from 'svelte-sonner';
	import { useSession } from '$lib/auth-client';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Separator } from '$lib/components/ui/separator';
	import { Mail, Calendar, CheckCircle2, XCircle } from 'lucide-svelte';

	type User = {
		id: string;
		name: string;
		email: string;
		createdAt: Date;
		updatedAt: Date;
		emailVerified: boolean;
		image?: string | null | undefined;
	};

	const session = useSession();
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let user = $state<User | undefined>(undefined);

	$effect(() => {
		try {
			isLoading = true;
			error = null;
			user = $session.data?.user as User | undefined;
		} catch (err) {
			error = 'Failed to load profile data';
			toast.error('Error loading profile data');
		} finally {
			isLoading = false;
		}
	});
</script>

<div class="container mx-auto max-w-3xl space-y-6 p-8">
	{#if error}
		<div class="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
			{error}
		</div>
	{/if}

	{#if isLoading}
		<div class="flex items-center justify-center py-8">
			<div
				class="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"
			></div>
		</div>
	{:else if user}
		<Card.Root>
			<Card.Header>
				<div class="flex items-start justify-between">
					<div class="flex items-center space-x-4">
						<Avatar.Root>
							<Avatar.Image src={user.image ?? ''} alt={user.name} />
							<Avatar.Fallback>{user.name?.[0]?.toUpperCase()}</Avatar.Fallback>
						</Avatar.Root>
						<div>
							<Card.Title class="text-2xl">{user.name}</Card.Title>
							<Card.Description class="flex items-center gap-2">
								<Mail class="h-4 w-4" />
								{user.email}
								{#if user.emailVerified}
									<CheckCircle2 class="h-4 w-4 text-green-500" />
								{:else}
									<XCircle class="h-4 w-4 text-destructive" />
								{/if}
							</Card.Description>
						</div>
					</div>
					<Button variant="outline">Edit Profile</Button>
				</div>
			</Card.Header>

			<Card.Content>
				<div class="space-y-4">
					<Separator />
					<div class="space-y-1">
						<h3 class="text-sm font-medium">Account Information</h3>
						<div class="grid gap-4 pt-3">
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-2">
									<Calendar class="h-4 w-4 opacity-70" />
									<span class="text-sm text-muted-foreground">Member since</span>
								</div>
								<span class="text-sm">
									{format(new Date(user.createdAt), 'MMMM do, yyyy')}
								</span>
							</div>
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-2">
									<Calendar class="h-4 w-4 opacity-70" />
									<span class="text-sm text-muted-foreground">Last updated</span>
								</div>
								<span class="text-sm">
									{format(new Date(user.updatedAt), 'MMMM do, yyyy')}
								</span>
							</div>
						</div>
					</div>
					<Separator />
				</div>
			</Card.Content>
		</Card.Root>
	{:else}
		<Card.Root>
			<Card.Content class="flex flex-col items-center justify-center py-10">
				<p class="text-center text-muted-foreground">No profile data available</p>
				<Button variant="outline" class="mt-4" href="/login">Sign In</Button>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
