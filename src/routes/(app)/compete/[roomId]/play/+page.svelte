<script lang="ts">
	import { page } from '$app/stores';
	import { authClient } from '$lib/auth-client';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import { Button } from '$lib/components/ui/button';
	import type { RoomParticipant, User } from '@prisma/client';
	import { onDestroy, onMount } from 'svelte';
	import { Medal } from 'lucide-svelte';

	const roomId = $page.params.roomId;
	let session = authClient.useSession();

	let peerConnections = $state<Record<string, RTCPeerConnection>>({});
	let localStream = $state<MediaStream | null>(null);
	let remoteStreams = $state<Record<string, MediaStream>>({});
	let participants = $state<(RoomParticipant & { user: User })[]>([]);
	let error = $state<string | null>(null);
	let loading = $state(true);
	let localVideoElement = $state<HTMLVideoElement | null>(null);
	let remoteVideoElements = $state<Record<string, HTMLVideoElement>>({});

	// Add scoring system
	let participantScores = $state<Record<string, number>>({});
	const updateInterval = 2000; // Update scores every 2 seconds
	let scoreUpdateTimer: number | undefined;

	// Auto-generate random scores for demo purposes
	// In a real app, this would be based on exercise detection and form evaluation
	function updateScores() {
		participants.forEach((participant) => {
			if (!participantScores[participant.user.id]) {
				participantScores[participant.user.id] = 0;
			}

			// Random score increments between 0-5 points
			if (Math.random() > 0.3) {
				// 70% chance to increment score
				participantScores[participant.user.id] += Math.floor(Math.random() * 5) + 1;
			}
		});
	}

	// Get sorted participants by score (highest first)
	function getSortedParticipants() {
		return [...participants].sort((a, b) => {
			const scoreA = participantScores[a.user.id] || 0;
			const scoreB = participantScores[b.user.id] || 0;
			return scoreB - scoreA;
		});
	}

	// Get medal type based on rank
	function getMedalType(rank: number): string {
		if (rank === 0) return 'text-yellow-400';
		if (rank === 1) return 'text-gray-400';
		if (rank === 2) return 'text-amber-600';
		return '';
	}

	$effect(() => {
		if (localVideoElement && localStream) {
			localVideoElement.srcObject = localStream;
		}
	});

	$effect(() => {
		Object.entries(remoteStreams).forEach(([peerId, stream]) => {
			if (remoteVideoElements[peerId]) {
				remoteVideoElements[peerId].srcObject = stream;
				console.log(`Set stream for peer ${peerId}:`, stream.id, stream.getTracks().length);
			} else {
				console.warn(`Video element for ${peerId} not found`);
			}
		});
	});

	// WebRTC configuration with STUN servers
	const configuration = {
		iceServers: [
			{
				urls: 'stun:stun.cloudflare.com:3478'
			}
		]
	};

	async function setupWebRTC() {
		try {
			// Get room participants
			const response = await fetch(`/api/rooms/${roomId}`);
			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.message || 'Failed to load room details');
			}

			participants = data.participants;

			// Initialize scores for all participants
			participants.forEach((p) => {
				participantScores[p.user.id] = 0;
			});

			// Get local media stream
			localStream = await navigator.mediaDevices.getUserMedia({
				video: true,
				audio: true
			});

			// Initialize WebRTC connections for each participant
			for (const participant of participants) {
				// Skip self
				if (participant.user.id === $session.data?.user.id) continue;

				await createPeerConnection(participant.user.id);
				// Automatically initiate call instead of waiting for button click
				await initiateCall(participant.user.id);
			}

			// Set up signaling via Cloudflare API
			signalConnection = connectToSignalingServer();

			// Start score updating (simulating real exercise scoring)
			scoreUpdateTimer = window.setInterval(updateScores, updateInterval);

			loading = false;
		} catch (err) {
			console.error('Error setting up WebRTC:', err);
			if (err instanceof Error) {
				error = err.message || 'Failed to set up video connection';
			}
			loading = false;
		}
	}

	async function createPeerConnection(peerId: string) {
		try {
			const pc = new RTCPeerConnection(configuration);
			peerConnections[peerId] = pc;

			// Add local stream tracks to the peer connection
			localStream?.getTracks().forEach((track) => {
				pc.addTrack(track, localStream!);
			});

			// Handle ICE candidates
			pc.onicecandidate = (event) => {
				if (event.candidate) {
					sendSignalingMessage({
						type: 'ice-candidate',
						candidate: event.candidate,
						from: $session.data?.user.id,
						to: peerId
					});
				}
			};

			// Handle incoming tracks - improved handling
			pc.ontrack = (event) => {
				console.log(`Received tracks from ${peerId}:`, event.streams.length);
				if (event.streams && event.streams.length > 0) {
					// Use the incoming stream directly instead of creating a new one
					remoteStreams[peerId] = event.streams[0];
					
					// Force update the video element if it exists
					if (remoteVideoElements[peerId]) {
						remoteVideoElements[peerId].srcObject = event.streams[0];
					}
				} else {
					console.warn(`Received track event without streams from ${peerId}`);
				}
			};
			
			// Log connection state changes for debugging
			pc.oniceconnectionstatechange = () => {
				console.log(`ICE connection state with ${peerId}:`, pc.iceConnectionState);
				if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
					console.log(`Connection established with ${peerId}`);
				}
			};

			return pc;
		} catch (err) {
			console.error('Error creating peer connection:', err);
			throw err;
		}
	}

	function connectToSignalingServer() {
		// Set up WebSocket or polling for signaling
		const eventSource = new EventSource(`/api/rooms/${roomId}/signaling`);

		eventSource.onmessage = async (event) => {
			const message = JSON.parse(event.data);

			// Skip messages not intended for this user
			if (message.to !== $session.data?.user.id) return;

			switch (message.type) {
				case 'offer':
					await handleOffer(message);
					break;
				case 'answer':
					await handleAnswer(message);
					break;
				case 'ice-candidate':
					handleIceCandidate(message);
					break;
			}
		};

		eventSource.onerror = (err) => {
			console.error('EventSource error:', err);
			error = 'Connection to signaling server lost. Please reload the page.';
		};

		return eventSource;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	async function handleOffer(message: any) {
		const peerId = message.from;
		let pc = peerConnections[peerId];

		if (!pc) {
			pc = await createPeerConnection(peerId);
		}

		try {
			await pc.setRemoteDescription(new RTCSessionDescription(message.offer));
			const answer = await pc.createAnswer();
			await pc.setLocalDescription(answer);

			sendSignalingMessage({
				type: 'answer',
				answer,
				from: $session.data?.user.id,
				to: peerId
			});
		} catch (err) {
			console.error('Error handling offer:', err);
			error = 'Failed to establish connection with a participant.';
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	async function handleAnswer(message: any) {
		const pc = peerConnections[message.from];
		if (pc) {
			try {
				await pc.setRemoteDescription(new RTCSessionDescription(message.answer));
				console.log(`Successfully set remote description from ${message.from}`);
			} catch (err) {
				console.error('Error setting remote description:', err);
			}
		} else {
			console.warn(`No peer connection found for ${message.from} when handling answer`);
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	function handleIceCandidate(message: any) {
		const pc = peerConnections[message.from];
		if (pc) {
			pc.addIceCandidate(new RTCIceCandidate(message.candidate))
				.then(() => console.log(`Added ICE candidate from ${message.from}`))
				.catch((err) => console.error('Error adding ICE candidate:', err));
		} else {
			console.warn(`No peer connection found for ${message.from} when handling ICE candidate`);
		}
	}

	async function initiateCall(peerId: string) {
		try {
			const pc = peerConnections[peerId];
			if (!pc) return;

			const offer = await pc.createOffer();
			await pc.setLocalDescription(offer);

			sendSignalingMessage({
				type: 'offer',
				offer,
				from: $session.data?.user.id,
				to: peerId
			});
		} catch (err) {
			console.error('Error initiating call:', err);
		}
	}

	async function sendSignalingMessage(message: unknown) {
		try {
			await fetch(`/api/rooms/${roomId}/signaling`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(message)
			});
		} catch (err) {
			console.error('Error sending signaling message:', err);
		}
	}

	function leaveCompetition() {
		// Close all peer connections
		Object.values(peerConnections).forEach((pc) => pc.close());

		// Stop all local media tracks
		localStream?.getTracks().forEach((track) => track.stop());

		// Navigate back to room page
		window.location.href = `/compete/${roomId}`;
	}

	let signalConnection: EventSource | undefined = undefined;

	onMount(() => {
		setupWebRTC();
	});

	onDestroy(() => {
		// Clean up WebRTC connections when component is destroyed
		Object.values(peerConnections).forEach((pc) => pc.close());

		// Stop all local media tracks
		localStream?.getTracks().forEach((track) => track.stop());

		// Close signaling connection
		signalConnection?.close();

		// Clear score update timer
		if (scoreUpdateTimer) {
			window.clearInterval(scoreUpdateTimer);
		}
	});
</script>

<div class="container mx-auto max-w-4xl p-4">
	{#if loading}
		<div class="flex h-64 items-center justify-center">
			<div class="space-y-4 text-center">
				<div
					class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
				></div>
				<p class="text-muted-foreground">Setting up competition room...</p>
			</div>
		</div>
	{:else if error}
		<Alert variant="destructive" class="mb-4">
			<AlertDescription>{error}</AlertDescription>
			<div class="mt-4">
				<Button variant="destructive" href={`/compete/${roomId}`}>Back to Room</Button>
			</div>
		</Alert>
	{:else}
		<div class="mb-4 flex items-center justify-between">
			<h1 class="text-2xl font-bold">Live Competition</h1>
			<Button variant="destructive" onclick={leaveCompetition}>Leave Competition</Button>
		</div>

		<!-- Local video - full width -->
		<div class="relative mb-4 aspect-video w-full overflow-hidden rounded-lg bg-muted">
			{#if localStream}
				<video bind:this={localVideoElement} autoplay muted class="h-full w-full object-cover"
				></video>
				<div
					class="absolute bottom-2 left-2 rounded bg-background/80 px-2 py-1 text-sm text-foreground"
				>
					You (Live) - Score: {participantScores[$session.data?.user.id || ''] || 0}
				</div>
			{:else}
				<div class="flex h-full items-center justify-center">
					<p class="text-foreground">Camera not available</p>
				</div>
			{/if}
		</div>

		<!-- Leaderboard and remote videos -->
		<div class="space-y-4">
			<h2 class="text-xl font-semibold">Leaderboard</h2>

			<!-- Ranked participants and their videos -->
			<div class="grid grid-cols-1 gap-4">
				{#each getSortedParticipants() as participant, index}
					{#if participant.user.id !== $session.data?.user.id}
						<div
							class="flex flex-col items-center gap-4 rounded-lg border border-muted p-3 md:flex-row"
						>
							<div class="flex w-full items-center gap-2 md:w-64">
								<div class="flex h-8 w-8 items-center justify-center">
									{#if index < 3}
										<Medal class={getMedalType(index)} size={24} />
									{:else}
										<span class="font-bold">{index + 1}</span>
									{/if}
								</div>

								<Avatar.Root>
									{#if participant.user.image}
										<Avatar.Image src={participant.user.image} alt={participant.user.name} />
									{:else}
										<Avatar.Fallback>
											{participant.user.name?.charAt(0) || '?'}
										</Avatar.Fallback>
									{/if}
								</Avatar.Root>

								<div class="flex flex-col">
									<span class="font-medium">{participant.user.name}</span>
									<span class="text-sm text-muted-foreground"
										>Score: {participantScores[participant.user.id] || 0}</span
									>
								</div>
							</div>

							<!-- Video feed -->
							{#if remoteStreams[participant.user.id]}
								<div
									class="relative aspect-video w-full overflow-hidden rounded-lg bg-muted md:flex-1"
								>
									<video
										bind:this={remoteVideoElements[participant.user.id]}
										autoplay
										playsinline
										class="h-full w-full object-cover"
									>
										<track kind="captions" />
									</video>
								</div>
							{:else}
								<div
									class="flex aspect-video w-full items-center justify-center rounded-lg bg-muted md:flex-1"
								>
									<p class="text-muted-foreground">Connecting...</p>
								</div>
							{/if}
						</div>
					{/if}
				{/each}
			</div>
		</div>
	{/if}
</div>
