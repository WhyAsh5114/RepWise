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
	import * as Select from '$lib/components/ui/select';
	import DetectionComponent from '$lib/detection-component.svelte';
	import type { IAgoraRTCClient, IAgoraRTCRemoteUser, ICameraVideoTrack } from 'agora-rtc-sdk-ng';
	import { Clipboard, LogOut, Trophy, UserRound, Users } from 'lucide-svelte';
	import { onDestroy, onMount } from 'svelte';
	import { toast } from 'svelte-sonner';

	// Import our new components
	import Leaderboard from '../components/leaderboard.svelte';
	import ParticipantGrid from '../components/participant-grid.svelte';

	// Simple interface for participant
	interface Participant {
		userId: string;
		name: string;
		image?: string;
		isHost?: boolean; // Add flag to track host status
		email?: string; // Add email for stable identification
	}

	// Interface for room state
	interface RoomState {
		hostId: string | null;
		creationTime: number;
	}

	let roomId = page.params.roomId;
	let isCompetitionActive = $state(false);
	let participants = $state<Participant[]>([]);
	let error = $state<string | null>(null);
	let loading = $state(true);
	let creatorId = $state<string | null>(null);
	let roomCreationTime = $state<number>(Date.now()); // Track room creation time
	let roomState = $state<RoomState>({ hostId: null, creationTime: Date.now() });

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

	let detectionEnabled = $state(false);
	let exerciseName = $state('Push Up'); // Default exercise type
	let selectedCamera = $state('');
	let detectionRepCount = $state(0);
	let availableCameras = $state<MediaDeviceInfo[]>([]);

	// Competition timer variables
	let competitionTimeInSeconds = $state(30);
	let competitionTimerInterval: ReturnType<typeof setInterval>;
	let scoreUpdateInterval: ReturnType<typeof setInterval>;
	let scoresRefreshInterval: ReturnType<typeof setInterval>;

	// Enumerate available cameras
	async function getCameras() {
		if (!browser) return;

		try {
			const devices = await navigator.mediaDevices.enumerateDevices();
			availableCameras = devices.filter(device => device.kind === 'videoinput');

			// Set default camera if none selected yet
			if (availableCameras.length > 0 && !selectedCamera) {
				selectedCamera = availableCameras[0].deviceId;
			}

			console.log(`[CAMERA] Found ${availableCameras.length} cameras`);
		} catch (err) {
			console.error('[CAMERA] Error enumerating devices:', err);
		}
	}

	// Switch to selected camera
	async function switchCamera(deviceId: string) {
		if (!browser || !agoraClient) return;

		try {
			selectedCamera = deviceId;
			console.log(`[CAMERA] Switching to camera: ${deviceId}`);

			// Close existing track if it exists
			if (localTrack) {
				await agoraClient.unpublish([localTrack]);
				localTrack.close();
			}

			// Create track with selected device
			const AgoraRTC = (await import('agora-rtc-sdk-ng')).default;
			localTrack = await AgoraRTC.createCameraVideoTrack({
				cameraId: deviceId,
				encoderConfig: isCompetitionActive ? 'high' : 'standard'
			});

			// Publish the new track
			await agoraClient.publish([localTrack]);

			// Play local video
			setTimeout(() => playLocalVideo(0), 300);

			toast.success('Camera switched successfully');
		} catch (err) {
			console.error('[CAMERA] Error switching camera:', err);
			toast.error('Failed to switch camera');
		}
	}

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

				// Check if the host left
				const userIdStr = user.uid.toString();
				const wasHost = participants.find((p) => p.userId === userIdStr && p.isHost);

				// Remove from participants
				participants = participants.filter((p) => p.userId !== userIdStr);
				console.log(
					`[AGORA] Removed user ${user.uid} from participants, remaining: ${participants.length}`
				);

				// If the host left, assign a new host
				if (wasHost && participants.length > 0) {
					// Select the participant who has been in the room the longest
					const oldestParticipant = participants[0];
					oldestParticipant.isHost = true;
					roomState.hostId = oldestParticipant.userId;

					// Update participants to trigger reactivity
					participants = [...participants];
					console.log(`[AGORA] Host left, assigned ${oldestParticipant.name} as new host`);
				}

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

				// Improved host determination logic
				let shouldBeHost = false;
				const userEmail = $session.data?.user?.email;

				// Get existing host if any
				const existingHost = participants.find((p) => p.isHost);

				if (!existingHost) {
					// No existing host found
					if (remoteUsersList.length === 0) {
						// First user in the room becomes host
						shouldBeHost = true;
						roomState.hostId = uid.toString();
						roomState.creationTime = Date.now();
						console.log(`[AGORA] First user in room, becoming host`);
					} else {
						// There are other users but no host yet (possible during initialization)
						// Wait a moment to check if any other user is claiming host status
						shouldBeHost = false;
						console.log(`[AGORA] Other users present but no host, waiting to determine host`);

						// We'll check again after a delay to see if a host appeared
						setTimeout(() => {
							const delayedHostCheck = participants.find((p) => p.isHost);
							if (!delayedHostCheck && participants.length > 0) {
								// Still no host, make the first participant the host
								const firstParticipant = participants[0];
								firstParticipant.isHost = true;
								roomState.hostId = firstParticipant.userId;
								participants = [...participants]; // Trigger reactivity
								console.log(`[AGORA] Assigned ${firstParticipant.name} as host after delay`);
							}
						}, 3000);
					}
				} else {
					// Host already exists, respect that
					console.log(`[AGORA] Host already exists: ${existingHost.name}`);
					roomState.hostId = existingHost.userId;
				}

				// Add current user to participants
				const userName = $session.data?.user?.name || `You (${uid})`;
				participants = [
					...participants.filter((p) => p.userId !== uid.toString()).map((p) => ({ ...p })),
					{
						userId: uid.toString(),
						name: userName,
						image: $session.data?.user?.image ?? undefined,
						email: userEmail,
						isHost: shouldBeHost
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

			// After successful connection, enumerate cameras
			getCameras();
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

			// Create a new high quality track with selected camera
			const AgoraRTC = (await import('agora-rtc-sdk-ng')).default;
			localTrack = await AgoraRTC.createCameraVideoTrack({
				cameraId: selectedCamera || undefined,
				encoderConfig: 'high' // Higher quality for competition
			});

			await agoraClient.publish([localTrack]);
			console.log('[AGORA] Published high quality video');

			// Enable detection after local track is ready
			detectionEnabled = true;

			// Instead of playing in local-player, we'll handle this through the detection component
			// but we still set this flag for state management
			localVideoPlaying = true;

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

	// Function to sync score with database
	async function syncScore() {
		if (!browser || !agoraClient?.uid || !isCompetitionActive) return;

		try {
			const currentScore = scores[agoraClient.uid.toString()] || 0;

			await fetch('/api/competition/score', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					userId: agoraClient.uid.toString(),
					roomId,
					score: currentScore,
					reps: currentScore // Using same value for both since reps = score in our app
				})
			});
		} catch (err) {
			console.error('Error syncing score:', err);
		}
	}

	// Function to fetch all scores from the database
	async function fetchScores() {
		if (!browser || !isCompetitionActive) return;

		try {
			const response = await fetch(`/api/competition/scores/${roomId}`);
			if (!response.ok) throw new Error('Failed to fetch scores');

			const data = await response.json();

			// Update local scores state with fetched data
			const fetchedScores: Record<string, number> = {};
			data.scores.forEach((entry: { userId: string; score: number }) => {
				fetchedScores[entry.userId] = entry.score;
			});

			// Only update scores for remote users to prevent overriding local score
			Object.keys(fetchedScores).forEach(userId => {
				if (userId !== agoraClient?.uid?.toString()) {
					scores[userId] = fetchedScores[userId];
				}
			});

			// Trigger update of rankings
			scores = { ...scores };
			updateRankings();
		} catch (err) {
			console.error('Error fetching scores:', err);
		}
	}

	// Start competition with timer
	async function startCompetition() {
		if (!browser) return;

		try {
			console.log('[AGORA] Starting competition');
			isCompetitionActive = true;
			competitionTimeInSeconds = 30; // Reset timer to 30 seconds

			// Start the countdown timer
			competitionTimerInterval = setInterval(() => {
				if (competitionTimeInSeconds > 0) {
					competitionTimeInSeconds--;
				} else {
					// Time's up, end the competition
					endCompetition();
				}
			}, 1000);

			// Start score sync interval (every second)
			scoreUpdateInterval = setInterval(syncScore, 1000);

			// Start scores refresh interval (every second)
			scoresRefreshInterval = setInterval(fetchScores, 1000);

			// Notify other users that competition is starting
			console.log('[AGORA] Notifying others that competition is starting');

			// Start video stream
			await startVideoStream();

			toast.success('Competition started!');
		} catch (err) {
			console.error('[AGORA] Error starting competition:', err);
			if (err instanceof Error)
				error = err.message || 'An error occurred while starting the competition';
		}
	}

	// End competition function
	function endCompetition() {
		isCompetitionActive = false;

		// Clear all intervals
		if (competitionTimerInterval) clearInterval(competitionTimerInterval);
		if (scoreUpdateInterval) clearInterval(scoreUpdateInterval);
		if (scoresRefreshInterval) clearInterval(scoresRefreshInterval);

		// Final sync of scores
		syncScore().then(() => {
			// Determine current user's position
			const currentUserId = agoraClient?.uid?.toString() || '';
			const userPosition = rankings.findIndex(r => r.userId === currentUserId) + 1;
			const userScore = scores[currentUserId] || 0;
			
			// Create URL with search parameters
			const searchParams = new URLSearchParams();
			searchParams.set('position', userPosition.toString());
			searchParams.set('score', userScore.toString());
			searchParams.set('total', rankings.length.toString());
			searchParams.set('roomId', roomId);
			
			// Redirect to results page with parameters
			toast.info('Competition ended!');
			setTimeout(() => {
				goto(`/compete/results?${searchParams.toString()}`);
			}, 1500);
		});
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

	// Listen for rep count updates from the detection component
	function handleRepCountUpdate(newCount: number) {
		detectionRepCount = newCount;
		// Update the user's score with the rep count
		if (agoraClient?.uid) {
			scores[agoraClient.uid.toString()] = newCount;
			updateRankings();
		}
	}

	onMount(() => {
		// Connect to Agora immediately when page loads
		connectToAgora();

		// Request camera permissions early to make deviceId accessible
		if (browser) {
			navigator.mediaDevices.getUserMedia({ video: true })
				.then(() => getCameras())
				.catch(err => console.error('[CAMERA] Permission error:', err));
		}

		return () => {
			if (browser) {
				// Clear all intervals on component unmount
				if (competitionTimerInterval) clearInterval(competitionTimerInterval);
				if (scoreUpdateInterval) clearInterval(scoreUpdateInterval);
				if (scoresRefreshInterval) clearInterval(scoresRefreshInterval);

				// Clean up Agora resources
				if (localTrack) {
					localTrack.close();
				}
				if (agoraClient) {
					agoraClient.leave();
				}
			}
		};
	});

	onDestroy(() => {
		if (browser) {
			// Clear all intervals on component destruction
			if (competitionTimerInterval) clearInterval(competitionTimerInterval);
			if (scoreUpdateInterval) clearInterval(scoreUpdateInterval);
			if (scoresRefreshInterval) clearInterval(scoresRefreshInterval);

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
		// Check both the participant list and roomState to determine host status
		const isHostInParticipants = participants.some((p) => p.userId === currentUserId && p.isHost);
		const isHostInState = roomState.hostId === currentUserId;
		return isHostInParticipants || isHostInState;
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
			<!-- Main content and videos section (takes 2/3 of screen on large displays) -->
			<div class="col-span-1 space-y-4 lg:col-span-2">
				<Card.Root>
					<Card.Header>
						<div class="flex items-center justify-between">
							<Card.Title class="flex items-center">
								<Trophy class="mr-2 h-5 w-5 text-yellow-500" />
								Competition
							</Card.Title>
							<!-- Timer display -->
							<div class="flex items-center gap-2">
								<Badge variant="outline" class="text-lg">
									<span class="font-mono"
										>{Math.floor(competitionTimeInSeconds / 60)}:{(competitionTimeInSeconds % 60)
											.toString()
											.padStart(2, '0')}</span
									>
								</Badge>
							</div>
						</div>
					</Card.Header>
					<Card.Content class="space-y-4">
						<!-- Camera selector -->
						{#if availableCameras.length > 1}
							<div class="mb-2">
								<Select.Root
									value={selectedCamera}
									type="single"
									onValueChange={(value) => switchCamera(value)}
								>
									<Select.Trigger class="w-full">
										{#if selectedCamera}
											<span>
												{availableCameras.find((camera) => camera.deviceId === selectedCamera)
													?.label ||
													`Camera ${availableCameras.indexOf(availableCameras.find((camera) => camera.deviceId === selectedCamera)!) + 1}`}
											</span>
										{:else}
											<span>Select a camera</span>
										{/if}
									</Select.Trigger>
									<Select.Content>
										{#each availableCameras as camera}
											<Select.Item value={camera.deviceId}>
												{camera.label || `Camera ${availableCameras.indexOf(camera) + 1}`}
											</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
							</div>
						{/if}

						<!-- Local stream (full width) -->
						<div class="relative overflow-hidden rounded-lg bg-muted">
							{#if detectionEnabled && localTrack}
								<DetectionComponent
									timer={0}
									{exerciseName}
									{selectedCamera}
									inputSource="webcam"
									videoFile={null}
									on:repcount={(e) => handleRepCountUpdate(e.detail)}
								/>
							{:else}
								<div id="local-player" class="aspect-video w-full"></div>
							{/if}
							<div
								class="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-1 text-xs text-white"
							>
								You (Live)
							</div>

							<!-- Your score overlay -->
							<div
								class="absolute right-2 top-2 rounded-md bg-primary/90 px-3 py-1 text-sm font-bold text-white"
							>
								{scores[agoraClient?.uid?.toString() || ''] || 0} reps
							</div>
						</div>

						<!-- Instructions -->
						<div class="rounded-lg bg-muted p-3">
							<p class="text-sm text-muted-foreground">
								Perform as many push-ups as you can with proper form. The system will count your
								reps automatically.
							</p>
						</div>

						<!-- Other participants grid -->
						<div class="mt-4">
							<h3 class="mb-2 font-medium">Other Competitors</h3>
							<ParticipantGrid {remoteUsers} {participants} {scores} {rankings} />
						</div>
					</Card.Content>
				</Card.Root>
			</div>

			<!-- Leaderboard and stats section (takes 1/3 of screen on large displays) -->
			<div class="col-span-1">
				<Leaderboard {rankings} currentUserId={agoraClient?.uid?.toString() || ''} {scores} />
			</div>
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
					<!-- Camera selector for waiting room -->
					{#if availableCameras.length > 1}
						<div class="mb-4">
							<label for="camera-select" class="mb-2 block text-sm font-medium">Select Camera</label
							>
							<Select.Root
								type="single"
								value={selectedCamera}
								onValueChange={(value) => switchCamera(value)}
							>
								<Select.Trigger class="w-full">
									{#if selectedCamera}
										<span>
											{availableCameras.find((camera) => camera.deviceId === selectedCamera)
												?.label ||
												`Camera ${availableCameras.indexOf(availableCameras.find((camera) => camera.deviceId === selectedCamera)!) + 1}`}
										</span>
									{:else}
										<span>Select a camera</span>
									{/if}
								</Select.Trigger>
								<Select.Content>
									{#each availableCameras as camera}
										<Select.Item value={camera.deviceId}>
											{camera.label || `Camera ${availableCameras.indexOf(camera) + 1}`}
										</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
						</div>
					{/if}

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

						{#if participants.length > 1 && isHost()}
							<Button onclick={startCompetition}>Start 30s Competition</Button>
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
