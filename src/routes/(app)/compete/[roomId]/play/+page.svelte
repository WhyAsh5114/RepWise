<script lang="ts">
	import { page } from '$app/stores';
	import { authClient } from '$lib/auth-client';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import { Button } from '$lib/components/ui/button';
	import type { RoomParticipant, User } from '@prisma/client';
	import { onDestroy, onMount } from 'svelte';

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

	$effect(() => {
		if (localVideoElement && localStream) {
			localVideoElement.srcObject = localStream;
		}
	});

	$effect(() => {
		Object.entries(remoteStreams).forEach(([peerId, stream]) => {
			if (remoteVideoElements[peerId]) {
				remoteVideoElements[peerId].srcObject = stream;
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
			}

			// Set up signaling via Cloudflare API
			connectToSignalingServer();
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

			// Handle incoming tracks
			pc.ontrack = (event) => {
				if (!remoteStreams[peerId]) {
					remoteStreams[peerId] = new MediaStream();
				}
				event.streams[0].getTracks().forEach((track) => {
					remoteStreams[peerId].addTrack(track);
				});
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

		await pc.setRemoteDescription(new RTCSessionDescription(message.offer));
		const answer = await pc.createAnswer();
		await pc.setLocalDescription(answer);

		sendSignalingMessage({
			type: 'answer',
			answer,
			from: $session.data?.user.id,
			to: peerId
		});
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	async function handleAnswer(message: any) {
		const pc = peerConnections[message.from];
		if (pc) {
			await pc.setRemoteDescription(new RTCSessionDescription(message.answer));
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	function handleIceCandidate(message: any) {
		const pc = peerConnections[message.from];
		if (pc) {
			pc.addIceCandidate(new RTCIceCandidate(message.candidate)).catch((err) =>
				console.error('Error adding ICE candidate:', err)
			);
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
		signalConnection!.close();
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

		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<!-- Local video -->
			<div class="relative aspect-video overflow-hidden rounded-lg bg-muted">
				{#if localStream}
					<video bind:this={localVideoElement} autoplay muted class="h-full w-full object-cover"
					></video>
					<div class="absolute bottom-2 left-2 rounded bg-background/80 px-2 py-1 text-sm text-foreground">
						You (Live)
					</div>
				{:else}
					<div class="flex h-full items-center justify-center">
						<p class="text-foreground">Camera not available</p>
					</div>
				{/if}
			</div>

			<!-- Remote videos -->
			<!-- eslint-disable-next-line @typescript-eslint/no-unused-vars -->
			{#each Object.entries(remoteStreams) as [peerId, _]}
				<div class="relative aspect-video overflow-hidden rounded-lg bg-muted">
					<video
						bind:this={remoteVideoElements[peerId]}
						autoplay
						class="h-full w-full object-cover"
					>
						<track kind="captions" />
					</video>
					<div class="absolute bottom-2 left-2 rounded bg-background/80 px-2 py-1 text-sm text-foreground">
						{participants.find((p) => p.user.id === peerId)?.user.name || 'Participant'} (Live)
					</div>
				</div>
			{/each}
		</div>

		<div class="mt-6">
			<h2 class="mb-2 text-xl font-semibold">Participants</h2>
			<div class="flex flex-wrap gap-2">
				{#each participants as participant}
					<div class="flex items-center space-x-2 rounded bg-secondary p-2">
						<Avatar.Root>
							{#if participant.user.image}
								<Avatar.Image src={participant.user.image} alt={participant.user.name} />
							{:else}
								<Avatar.Fallback>
									{participant.user.name?.charAt(0) || '?'}
								</Avatar.Fallback>
							{/if}
						</Avatar.Root>
						<span>{participant.user.name}</span>
						{#if participant.user.id !== $session.data?.user.id && !remoteStreams[participant.user.id]}
							<Button variant="outline" size="sm" onclick={() => initiateCall(participant.user.id)}>
								Connect
							</Button>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
