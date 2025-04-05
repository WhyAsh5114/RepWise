<script lang="ts">
	import { goto } from '$app/navigation';
	import H1 from '$lib/components/typography/h1.svelte';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Loader2 } from 'lucide-svelte';

	let roomCode = $state('');
	let roomName = $state('');
	let errorMessage = $state('');
	let successMessage = $state('');
	let isCreatingRoom = $state(false);
	let isJoiningRoom = $state(false);

	async function createRoom() {
		if (isCreatingRoom) return;
		
		isCreatingRoom = true;
		errorMessage = '';
		successMessage = '';

		try {
			const response = await fetch('/api/rooms', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ name: roomName })
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.message || 'Failed to create room');
			}

			successMessage = `Room created! Room code: ${data.id}`;
			setTimeout(() => {
				goto(`/compete/${data.id}`);
			}, 1500);
		} catch (error) {
			console.error('Error creating room:', error);
			if (error instanceof Error)
				errorMessage = error.message || 'An error occurred while creating room';
		} finally {
			isCreatingRoom = false;
		}
	}

	async function joinRoom() {
		if (isJoiningRoom) return;
		
		isJoiningRoom = true;
		errorMessage = '';
		successMessage = '';

		if (!roomCode) {
			errorMessage = 'Room code is required';
			isJoiningRoom = false;
			return;
		}

		try {
			const response = await fetch(`/api/rooms/${roomCode}/join`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				}
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.message || 'Failed to join room');
			}

			successMessage = 'Joining room...';
			setTimeout(() => {
				goto(`/compete/${roomCode}`);
			}, 1000);
		} catch (error) {
			console.error('Error joining room:', error);
			if (error instanceof Error) {
				errorMessage = error.message || 'An error occurred while joining room';
			}
		} finally {
			isJoiningRoom = false;
		}
	}
</script>

<div class="container mx-auto max-w-md space-y-6 p-4">
	<H1 class="text-center">Compete</H1>

	<Card.Root>
		<Card.Header>
			<Card.Title>Create a Room</Card.Title>
		</Card.Header>
		<Card.Content class="space-y-4">
			<div class="space-y-2">
				<Label for="roomName">Room Name (Optional)</Label>
				<Input type="text" id="roomName" bind:value={roomName} placeholder="Enter a room name" />
			</div>
			<Button variant="default" class="w-full" onclick={createRoom} disabled={isCreatingRoom}>
				{#if isCreatingRoom}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				Create Room
			</Button>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Join a Room</Card.Title>
		</Card.Header>
		<Card.Content class="space-y-4">
			<div class="space-y-2">
				<Label for="roomCode">Room Code</Label>
				<Input type="text" id="roomCode" bind:value={roomCode} placeholder="Enter room code" />
			</div>
			<Button variant="secondary" class="w-full" onclick={joinRoom} disabled={isJoiningRoom}>
				{#if isJoiningRoom}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				Join Room
			</Button>
		</Card.Content>
	</Card.Root>

	{#if errorMessage}
		<Alert variant="destructive">
			<AlertDescription>{errorMessage}</AlertDescription>
		</Alert>
	{/if}

	{#if successMessage}
		<Alert>
			<AlertDescription>{successMessage}</AlertDescription>
		</Alert>
	{/if}
</div>
