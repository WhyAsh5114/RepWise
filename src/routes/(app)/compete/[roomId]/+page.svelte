<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { PUBLIC_AGORA_APP_ID } from '$env/static/public';
	import { authClient } from '$lib/auth-client';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator';
	import type { IAgoraRTCClient, IAgoraRTCRemoteUser, ICameraVideoTrack } from 'agora-rtc-sdk-ng';
	import { Clipboard, LogOut, Trophy, UserRound, Users } from 'lucide-svelte';
	import { onDestroy, onMount } from 'svelte';
	import { toast } from 'svelte-sonner';

	// Simple interface for participant
	interface Participant {
		userId: string;
		name: string;
		image?: string;
	}

	let roomId = page.params.roomId;
	let isCompetitionActive = $state(false);
	let participants = $state<Participant[]>([]);
	let error = $state<string | null>(null);
	let loading = $state(true);
	let creatorId = $state<string | null>(null);

	// Agora related variables - only need client and tracks
	let agoraClient = $state<IAgoraRTCClient | null>(null);
	let localTrack = $state<ICameraVideoTrack | null>(null);
	let remoteUsers = $state<Record<string, IAgoraRTCRemoteUser>>({});
	let isJoined = $state(false);

	// Simple scoring system - just for this session
	let scores = $state<Record<string, number>>({});
	let rankings = $state<{ userId: string; score: number; userName: string }[]>([]);

	// Agora app ID
	const appId = PUBLIC_AGORA_APP_ID;

	let session = authClient.useSession();

	// Connect to Agora immediately - this is all we need for presence
	async function connectToAgora() {
		if (!browser) return;

		try {
			loading = true;

			// Dynamically import Agora RTC SDK only on the client side
			const AgoraRTC = (await import('agora-rtc-sdk-ng')).default;

			// Create Agora client
			agoraClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

			// Event listener for remote users joining
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			agoraClient.on('user-published', async (user: any, mediaType: 'audio' | 'video') => {
				await agoraClient?.subscribe(user, mediaType);

				if (mediaType === 'video') {
					remoteUsers[user.uid.toString()] = user;
					remoteUsers = { ...remoteUsers }; // Trigger reactivity

					// Try to find user info if available
					const userName = user.uid.toString();

					// Add to participants list if not there
					if (!participants.some((p) => p.userId === user.uid.toString())) {
						participants = [
							...participants,
							{
								userId: user.uid.toString(),
								name: userName
							}
						];

						// Initialize score
						if (!scores[user.uid.toString()]) {
							scores[user.uid.toString()] = 0;
						}

						updateRankings();
					}

					setTimeout(() => {
						user.videoTrack?.play(`user-${user.uid}`);
					}, 100);
				}
			});

			// Event listener for remote users leaving
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			agoraClient.on('user-unpublished', (user: any) => {
				delete remoteUsers[user.uid.toString()];
				remoteUsers = { ...remoteUsers }; // Trigger reactivity

				// Remove from participants
				participants = participants.filter((p) => p.userId !== user.uid.toString());
				updateRankings();
			});

			// Join the Agora channel (using roomId as channel name)
			const uid = $session.data?.user?.id || `user-${Math.floor(Math.random() * 10000)}`;
			await agoraClient.join(appId, roomId, null, uid);

			// Use sessionStorage to check if a creator exists
			const storedCreatorId = sessionStorage.getItem(`creator-${roomId}`);
			if (storedCreatorId) {
				creatorId = storedCreatorId;
			}

			// Check if there are other users in the room already
			const remoteUsersInChannel = agoraClient.remoteUsers;

			// If there are no remote users and no stored creator, you're the first one
			if (remoteUsersInChannel.length === 0 && !creatorId) {
				creatorId = uid;
				// Store the creator ID in session storage
				sessionStorage.setItem(`creator-${roomId}`, uid);

				// Let others know you're the creator (via metadata in video stream or other means)
				// This will depend on your specific implementation
				console.log('I am the creator of this room:', uid);
			}

			// Add current user to participants
			if ($session.data?.user) {
				const currentUser = {
					userId: uid,
					name: $session.data.user.name || 'You',
					image: $session.data.user.image ?? undefined
				};

				if (!participants.some((p) => p.userId === currentUser.userId)) {
					participants = [...participants, currentUser];
				}

				// Initialize score
				if (!scores[currentUser.userId]) {
					scores[currentUser.userId] = 0;
				}
			}

			isJoined = true;
			loading = false;

			updateRankings();
		} catch (err) {
			console.error('Error connecting to Agora:', err);
			if (err instanceof Error)
				error = err.message || 'An error occurred while connecting to the room';
			loading = false;
		}
	}

	// Start the video stream when competition starts
	async function startVideoStream() {
		if (!browser || !agoraClient) return;

		try {
			// Dynamically import Agora RTC SDK only on the client side
			const AgoraRTC = (await import('agora-rtc-sdk-ng')).default;

			// Create and publish video track (camera only, no microphone)
			localTrack = await AgoraRTC.createCameraVideoTrack();
			await agoraClient.publish([localTrack]);

			// Play local video stream
			setTimeout(() => {
				if (localTrack) {
					localTrack.play('local-player');
				}
			}, 100);

			toast.success('Joined video stream!');
		} catch (err) {
			console.error('Error starting video stream:', err);
			toast.error('Failed to start video stream');
		}
	}

	function updateRankings() {
		rankings = Object.entries(scores)
			.map(([userId, score]) => {
				const participant = participants.find((p) => p.userId === userId);
				return {
					userId,
					score,
					userName: participant?.name || 'Unknown'
				};
			})
			.sort((a, b) => b.score - a.score);
	}

	// Simulate scoring - in a real app this would be based on exercise detection
	function simulateScoring() {
		if (!browser || !isCompetitionActive) return;

		// Randomly increase scores
		let scoresChanged = false;

		participants.forEach((participant) => {
			if (Math.random() > 0.5) {
				const newScore = (scores[participant.userId] || 0) + Math.floor(Math.random() * 5) + 1;
				scores[participant.userId] = newScore;
				scoresChanged = true;
			}
		});

		if (scoresChanged) {
			updateRankings();
		}
	}

	async function leaveRoom() {
		try {
			// Stop and close tracks
			if (localTrack) {
				localTrack.close();
			}

			// Leave the channel
			if (agoraClient) {
				await agoraClient.leave();
			}

			isJoined = false;
			remoteUsers = {};

			// Redirect to compete page
			goto('/compete');
		} catch (err) {
			console.error('Error leaving room:', err);
			if (err instanceof Error) error = err.message || 'An error occurred while leaving the room';
		}
	}

	function copyRoomId() {
		if (!browser) return;

		navigator.clipboard.writeText(roomId);
		toast.success('Room ID copied to clipboard!');
	}

	async function startCompetition() {
		if (!browser) return;

		try {
			isCompetitionActive = true;

			// Start video stream now
			await startVideoStream();

			toast.success('Competition started!');
		} catch (err) {
			console.error('Error starting competition:', err);
			if (err instanceof Error)
				error = err.message || 'An error occurred while starting the competition';
		}
	}

	let scoreIntervalId: ReturnType<typeof setInterval>;

	onMount(() => {
		// Connect to Agora immediately when page loads
		connectToAgora();

		if (browser) {
			// Simulate score updates
			scoreIntervalId = setInterval(simulateScoring, 2000);
		}

		return () => {
			if (browser && scoreIntervalId) {
				clearInterval(scoreIntervalId);
			}
		};
	});

	onDestroy(() => {
		if (browser) {
			if (scoreIntervalId) clearInterval(scoreIntervalId);

			// Clean up Agora resources
			if (localTrack) {
				localTrack.close();
			}
			if (agoraClient) {
				agoraClient.leave();
			}
		}
	});

	let isHost = $derived($session.data?.user?.id === creatorId);
</script>

<!-- The UI remains similar but updates for our simplified approach -->
<div class="container mx-auto max-w-4xl p-4">
	{#if loading}
		<div class="flex h-64 items-center justify-center">
			<div class="space-y-4 text-center">
				<div
					class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
				></div>
				<p class="text-muted-foreground">Connecting to room...</p>
			</div>
		</div>
	{:else if error}
		<Alert variant="destructive" class="mb-4">
			<AlertDescription>{error}</AlertDescription>
			<div class="mt-4">
				<Button variant="destructive" onclick={() => goto('/compete')}>Back to Compete</Button>
			</div>
		</Alert>
	{:else if isCompetitionActive}
		<!-- Competition in progress view -->
		<div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
			<!-- Video streams section -->
			<div class="col-span-2 space-y-4">
				<Card.Root>
					<Card.Header>
						<Card.Title class="flex items-center">
							<Trophy class="mr-2 h-5 w-5 text-yellow-500" />
							Competition Streams
						</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="grid grid-cols-2 gap-3">
							<!-- Local stream -->
							<div class="relative overflow-hidden rounded-lg bg-muted">
								<div id="local-player" class="aspect-video w-full"></div>
								<div
									class="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-1 text-xs text-white"
								>
									You (Live)
								</div>
							</div>

							<!-- Remote streams -->
							<!-- eslint-disable-next-line @typescript-eslint/no-unused-vars -->
							{#each Object.entries(remoteUsers) as [uid, _]}
								<div class="relative overflow-hidden rounded-lg bg-muted">
									<div id="user-{uid}" class="aspect-video w-full"></div>
									<div
										class="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-1 text-xs text-white"
									>
										{participants.find((p) => p.userId === uid)?.name || 'Participant'}
									</div>
								</div>
							{/each}

							<!-- Placeholder for empty slots -->
							{#if Object.keys(remoteUsers).length < 3}
								<!-- eslint-disable-next-line @typescript-eslint/no-unused-vars -->
								{#each Array(3 - Object.keys(remoteUsers).length) as _}
									<div class="flex aspect-video items-center justify-center rounded-lg bg-muted/50">
										<div class="text-sm text-muted-foreground">Waiting for participant...</div>
									</div>
								{/each}
							{/if}
						</div>
					</Card.Content>
				</Card.Root>

				<!-- ...existing instructions card... -->
			</div>

			<!-- ...existing scores and ranking section... -->
		</div>
	{:else}
		<!-- Waiting room view -->
		<Card.Root class="w-full">
			<Card.Header>
				<div class="flex items-center justify-between">
					<Card.Title>Competition Room</Card.Title>
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
										{#if participant.image}
											<Avatar.Root class="mr-3">
												<Avatar.Image src={participant.image} alt="Profile" />
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
										<span>{participant.name}</span>
										{#if participant.userId === creatorId}
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
