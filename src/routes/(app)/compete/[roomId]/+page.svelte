<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { authClient } from '$lib/auth-client';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator';
	import type { Room, RoomParticipant } from '@prisma/client';
	import type { User } from 'better-auth';
	import { Clipboard, LogOut, UserRound, Users } from 'lucide-svelte';
	import { onDestroy, onMount } from 'svelte';
	import { toast } from 'svelte-sonner';

	const roomId = $page.params.roomId;
	let room = $state<Room | null>(null);
	let participants = $state<(RoomParticipant & { user: User })[]>([]);
	let error = $state<string | null>(null);
	let loading = $state(true);

	let session = authClient.useSession();

	async function fetchRoomDetails() {
		try {
			const response = await fetch(`/api/rooms/${roomId}`);
			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.message || 'Failed to load room details');
			}

			room = data.room;
			participants = data.participants;
			if (room?.status === 'ACTIVE') {
				toast.success('Competition has started!');
				goto(`/compete/${roomId}/play`);
			} else if (room?.status === 'CLOSED') {
				toast.error('Competition has ended!');
				goto(`/compete`);
			}
			loading = false;
		} catch (err) {
			console.error('Error fetching room details:', err);
			if (err instanceof Error)
				error = err.message || 'An error occurred while loading room details';
			loading = false;
		}
	}

	async function leaveRoom() {
		try {
			const response = await fetch(`/api/rooms/${roomId}/leave`, {
				method: 'POST'
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.message || 'Failed to leave room');
			}

			window.location.href = '/compete';
		} catch (err) {
			console.error('Error leaving room:', err);
			if (err instanceof Error) error = err.message || 'An error occurred while leaving the room';
		}
	}

	function copyRoomId() {
		navigator.clipboard.writeText(roomId);
		toast.success('Room ID copied to clipboard!');
	}

	async function startCompetition() {
		try {
			const response = await fetch(`/api/rooms/${roomId}/start`, {
				method: 'POST'
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.message || 'Failed to start competition');
			}

			toast.success('Competition started!');
			// Redirect to the play page
			window.location.href = `/compete/${roomId}/play`;
		} catch (err) {
			console.error('Error starting competition:', err);
			if (err instanceof Error)
				error = err.message || 'An error occurred while starting the competition';
		}
	}

	let intervalId: ReturnType<typeof setInterval>;

	onMount(() => {
		fetchRoomDetails();
		// Poll for updates every 1 second
		intervalId = setInterval(fetchRoomDetails, 1000);
	});

	onDestroy(() => {
		clearInterval(intervalId);
	});

	let isHost = $derived(
		participants.find((p) => p.user.id === $session.data?.user.id && p.user.id === room?.creatorId)
	);
</script>

<div class="container mx-auto max-w-3xl p-4">
	{#if loading}
		<div class="flex h-64 items-center justify-center">
			<div class="space-y-4 text-center">
				<div
					class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
				></div>
				<p class="text-muted-foreground">Loading room details...</p>
			</div>
		</div>
	{:else if error}
		<Alert variant="destructive" class="mb-4">
			<AlertDescription>{error}</AlertDescription>
			<div class="mt-4">
				<Button variant="destructive" onclick={() => (window.location.href = '/compete')}>
					Back to Compete
				</Button>
			</div>
		</Alert>
	{:else}
		<Card.Root class="w-full">
			<Card.Header>
				<div class="flex items-center justify-between">
					<Card.Title>{room?.name || 'Competition Room'}</Card.Title>
					<Badge variant="outline" class="ml-2">Room ID: {roomId}</Badge>
				</div>
			</Card.Header>

			<Card.Content>
				<div class="space-y-4">
					<div>
						<div class="mb-2 flex items-center gap-2">
							<Users size={18} />
							<h3 class="text-lg font-medium">Participants ({participants.length})</h3>
						</div>
						<Separator class="my-2" />

						{#if participants.length === 0}
							<p class="py-4 text-center text-muted-foreground">Waiting for participants...</p>
						{:else}
							<div class="mt-3 space-y-2">
								{#each participants as participant}
									<div
										class="flex items-center rounded-md px-3 py-2 transition-colors hover:bg-muted/50"
									>
										{#if participant.user.image}
											<Avatar.Root class="mr-3">
												<Avatar.Image src={participant.user.image} alt="Profile" />
												<Avatar.Fallback>
													<UserRound size={16} class="text-primary" />
												</Avatar.Fallback>
											</Avatar.Root>
										{:else}
											<div
												class="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10"
											>
												<UserRound size={16} class="text-primary" />
											</div>
										{/if}
										<span>{participant.user.name}</span>
										{#if participant.userId === room?.creatorId}
											<Badge variant="secondary" class="ml-2">Host</Badge>
										{/if}
									</div>
								{/each}
							</div>
						{/if}
					</div>
				</div>
			</Card.Content>

			<Card.Footer>
				<div class="flex w-full flex-col gap-4 sm:flex-row sm:justify-between">
					<div class="flex justify-between gap-2">
						<Button variant="outline" onclick={copyRoomId}>
							<Clipboard class="mr-2 h-4 w-4" />
							Share Room ID
						</Button>

						{#if participants.length > 1 && isHost}
							<Button onclick={startCompetition}>Start Competition</Button>
						{/if}
					</div>

					<Button variant="destructive" onclick={leaveRoom}>
						<LogOut class="mr-2 h-4 w-4" />
						Leave Room
					</Button>
				</div>
			</Card.Footer>
		</Card.Root>
	{/if}
</div>
