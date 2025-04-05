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
		isHost?: boolean; // Add flag to track host status
		email?: string; // Add email for stable identification
	}

	let roomId = page.params.roomId;
	let isCompetitionActive = $state(false);
	let participants = $state<Participant[]>([]);
	let error = $state<string | null>(null);
	let loading = $state(true);
	let creatorId = $state<string | null>(null);
	let roomCreationTime = $state<number>(Date.now()); // Track room creation time

	// Agora related variables - only need client and tracks
	let agoraClient = $state<IAgoraRTCClient | null>(null);
	let localTrack = $state<ICameraVideoTrack | null>(null);
	let remoteUsers = $state<Record<string, IAgoraRTCRemoteUser>>({});
	let isJoined = $state(false);
	let localVideoPlaying = $state(false); // Track if local video is playing
	let localVideoAttempts = $state(0); // Track retry attempts

	// Simple scoring system - just for this session
	let scores = $state<Record<string, number>>({});
	let rankings = $state<{ userId: string; score: number; userName: string }[]>([]);

	// Agora app ID
	const appId = PUBLIC_AGORA_APP_ID;

	let session = authClient.useSession();

	// Retry playing local video with backoff
	function playLocalVideo(attempt = 0) {
		if (!localTrack || localVideoPlaying) return;

		try {
			const localPlayerElement = document.getElementById('local-player');
			if (localPlayerElement) {
				// Clear the element first
				while (localPlayerElement.firstChild) {
					localPlayerElement.firstChild.remove();
				}

				localTrack.play('local-player');
				console.log(`[AGORA] Playing local video (attempt ${attempt})`);
				localVideoPlaying = true;
			} else {
				console.warn(`[AGORA] Local player element not found`);
				if (attempt < 5) {
					// Retry with exponential backoff
					setTimeout(() => playLocalVideo(attempt + 1), 500 * Math.pow(1.5, attempt));
				}
			}
		} catch (err) {
			console.error(`[AGORA] Error playing local video:`, err);
			localVideoPlaying = false;

			if (attempt < 5) {
				setTimeout(() => playLocalVideo(attempt + 1), 500 * Math.pow(1.5, attempt));
			}
		}
	}

	// Connect to Agora immediately - this is all we need for presence
	async function connectToAgora() {
		if (!browser) return;

		try {
			loading = true;
			localVideoPlaying = false;

			// Dynamically import Agora RTC SDK only on the client side
			const AgoraRTC = (await import('agora-rtc-sdk-ng')).default;

			// Create Agora client - set to host to enable publishing by default
			agoraClient = AgoraRTC.createClient({
				mode: 'rtc',
				codec: 'vp8'
			});

			// Generate a simple numeric UID
			const uid = Math.floor(Math.random() * 999999) + 1;
			console.log(`[AGORA] Generated UID: ${uid} for room ${roomId}`);

			// Configure event listeners BEFORE joining
			console.log('[AGORA] Setting up event listeners');

			// Connection state changes
			agoraClient.on('connection-state-change', (curState, prevState) => {
				console.log(`[AGORA] Connection state: ${prevState} → ${curState}`);
			});

			// User joins with published stream
			agoraClient.on('user-published', async (user, mediaType) => {
				console.log(`[AGORA] Remote user ${user.uid} published ${mediaType} stream`);

				try {
					await agoraClient?.subscribe(user, mediaType);
					console.log(`[AGORA] Subscribed to ${user.uid}'s ${mediaType}`);

					if (mediaType === 'video') {
						// Add to remote users
						remoteUsers[user.uid.toString()] = user;
						remoteUsers = { ...remoteUsers }; // Trigger reactivity
						console.log(`[AGORA] Added to remoteUsers, total: ${Object.keys(remoteUsers).length}`);

						// Add to participants list with a generated name
						const userName = `User-${user.uid.toString().slice(0, 5)}`;

						if (!participants.some((p) => p.userId === user.uid.toString())) {
							participants = [
								...participants,
								{
									userId: user.uid.toString(),
									name: userName
								}
							];
							console.log(`[AGORA] Added to participants: ${userName}`);

							// Initialize score
							scores[user.uid.toString()] = 0;
							updateRankings();
						}

						// Play the video on next tick with retry
						setTimeout(() => {
							try {
								const playerElement = document.getElementById(`user-${user.uid}`);
								if (playerElement && user.videoTrack) {
									user.videoTrack.play(`user-${user.uid}`);
									console.log(`[AGORA] Playing remote video for ${user.uid}`);
								} else {
									console.warn(`[AGORA] Player element or track not ready for ${user.uid}`);
								}
							} catch (err) {
								console.error(`[AGORA] Error playing remote video:`, err);
							}
						}, 500);
					}
				} catch (err) {
					console.error(`[AGORA] Failed to subscribe to ${user.uid}:`, err);
				}
			});

			// User unpublishes stream
			agoraClient.on('user-unpublished', (user, mediaType) => {
				console.log(`[AGORA] User ${user.uid} unpublished ${mediaType}`);

				if (mediaType === 'video') {
					// We keep the user in the list but mark their track as unpublished
					console.log(`[AGORA] User ${user.uid} video track unpublished`);
				}
			});

			// User leaves entirely
			agoraClient.on('user-left', (user) => {
				console.log(`[AGORA] User ${user.uid} left the channel`);

				// Remove from remoteUsers
				if (remoteUsers[user.uid.toString()]) {
					delete remoteUsers[user.uid.toString()];
					remoteUsers = { ...remoteUsers }; // Trigger reactivity
					console.log(`[AGORA] Removed user ${user.uid} from remoteUsers`);
				}

				// Remove from participants
				participants = participants.filter((p) => p.userId !== user.uid.toString());
				console.log(
					`[AGORA] Removed user ${user.uid} from participants, remaining: ${participants.length}`
				);

				updateRankings();
			});

			// Use simple channel name for better reliability
			const channelName = roomId;
			console.log(`[AGORA] Attempting to join channel: ${channelName} with UID: ${uid}`);

			// Join the channel
			await agoraClient.join(appId, channelName, null, uid);
			console.log(`[AGORA] Successfully joined channel ${channelName}`);

			// Create and publish camera track immediately (this improves discovery)
			console.log(`[AGORA] Creating camera track`);
			localTrack = await AgoraRTC.createCameraVideoTrack();

			console.log(`[AGORA] Publishing camera track`);
			await agoraClient.publish([localTrack]);

			// Play local video with improved retry logic
			setTimeout(() => {
				playLocalVideo(0);
			}, 300);

			// Get remote users after a short delay
			setTimeout(() => {
				// Check if we have remote users
				const remoteUsersList = agoraClient?.remoteUsers || [];
				console.log(`[AGORA] After joining, found ${remoteUsersList.length} remote users`);

				// Set each remote user's stream as published to ensure they're detected
				remoteUsersList.forEach((user) => {
					console.log(`[AGORA] Remote user found: ${user.uid}`);
					if (user.videoTrack) {
						console.log(`[AGORA] Remote user ${user.uid} has video track, playing...`);
						try {
							remoteUsers[user.uid.toString()] = user;

							// Add to participants if not there
							if (!participants.some((p) => p.userId === user.uid.toString())) {
								participants = [
									...participants,
									{
										userId: user.uid.toString(),
										name: `User-${user.uid.toString().slice(0, 5)}`
									}
								];
								scores[user.uid.toString()] = 0;
							}

							// Try to play their video
							setTimeout(() => {
								try {
									user.videoTrack!.play(`user-${user.uid}`);
								} catch (err) {
									console.error(`[AGORA] Error playing existing remote video:`, err);
								}
							}, 500);
						} catch (err) {
							console.error(`[AGORA] Error handling existing remote user:`, err);
						}
					}
				});

				// Determine host - first joiner or based on email if authentication is used
				let isCurrentUserHost = false;
				const userEmail = $session.data?.user?.email;

				if (remoteUsersList.length === 0) {
					// First user to join becomes host
					isCurrentUserHost = true;
					console.log(`[AGORA] No other users found, setting self as host`);
				} else {
					// Check participants to see if there's already a host
					const existingHost = participants.find(p => p.isHost);

					// If no host is set yet, the first authenticated user becomes host
					if (!existingHost && userEmail) {
						isCurrentUserHost = true;
						console.log(`[AGORA] No host exists yet, setting authenticated user as host`);
					}
				}

				// Add current user to participants
				const userName = $session.data?.user?.name || `You (${uid})`;
				participants = [
					...participants
						.filter((p) => p.userId !== uid.toString())
						.map((p) => ({ ...p })),
					{
						userId: uid.toString(),
						name: userName,
						image: $session.data?.user?.image ?? undefined,
						email: userEmail,
						isHost: isCurrentUserHost
					}
				];

				// Make sure current user has a score
				scores[uid.toString()] = scores[uid.toString()] || 0;

				isJoined = true;
				loading = false;

				// Force update rankings
				updateRankings();

				// Force a UI refresh
				remoteUsers = { ...remoteUsers };
				participants = [...participants];

				// If competition is already active, auto-join
				if (creatorId !== uid.toString() && remoteUsersList.length > 0) {
					// Auto-join competition if it looks like it's in progress
					const hasActiveVideo = remoteUsersList.some((u) => u.videoTrack);
					if (hasActiveVideo) {
						console.log(`[AGORA] Auto-joining active competition`);
						isCompetitionActive = true;
					}
				}

				// Try again to play local video after all remote users are processed
				if (!localVideoPlaying && localTrack) {
					console.log('[AGORA] Retrying local video play after initialization');
					playLocalVideo(0);
				}
			}, 2000);
		} catch (err) {
			console.error('[AGORA] Error connecting:', err);
			error =
				err instanceof Error
					? err.message
					: 'Failed to connect to the competition room. Please check your camera and try again.';
			loading = false;
		}
	}

	// Start the video stream when competition starts -
	// Now just publishes a higher quality stream
	async function startVideoStream() {
		if (!browser || !agoraClient) return;

		try {
			console.log('[AGORA] Starting high quality video for competition');
			localVideoPlaying = false;

			// If we already have a track, close it first
			if (localTrack) {
				await agoraClient.unpublish([localTrack]);
				localTrack.close();
			}

			// Create a new high quality track
			const AgoraRTC = (await import('agora-rtc-sdk-ng')).default;
			localTrack = await AgoraRTC.createCameraVideoTrack({
				encoderConfig: 'high' // Higher quality for competition
			});

			await agoraClient.publish([localTrack]);
			console.log('[AGORA] Published high quality video');

			// Use our improved play function with retries
			setTimeout(() => {
				playLocalVideo(0);
			}, 300);

			toast.success('Joined video stream!');
		} catch (err) {
			console.error('[AGORA] Error enhancing video stream:', err);
			toast.error('Failed to enhance video stream. You can still participate.');
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
			localVideoPlaying = false;

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
			console.log('[AGORA] Starting competition');
			isCompetitionActive = true;

			// Notify other users that competition is starting (just console log for now)
			console.log('[AGORA] Notifying others that competition is starting');

			// Start video stream now
			await startVideoStream();

			toast.success('Competition started!');
		} catch (err) {
			console.error('[AGORA] Error starting competition:', err);
			if (err instanceof Error)
				error = err.message || 'An error occurred while starting the competition';
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

			localVideoPlaying = false;
		}
	});

	// Determine if current user is host
	let isHost = $derived(() => {
		const currentUserId = agoraClient?.uid?.toString();
		const currentUserParticipant = participants.find(p => p.userId === currentUserId);
		return !!currentUserParticipant?.isHost;
	});
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
										{#if participant.isHost}
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
