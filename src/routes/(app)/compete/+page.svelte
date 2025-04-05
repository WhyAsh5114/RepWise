<script lang="ts">
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import H1 from '$lib/components/typography/h1.svelte';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Loader2 } from 'lucide-svelte';

	// Simple room code for joining
	let roomCode = $state('');
	let errorMessage = $state('');
	let successMessage = $state('');
	let isCreatingRoom = $state(false);
	let isJoiningRoom = $state(false);

	async function createRoom() {
		if (isCreatingRoom || !browser) return;

		isCreatingRoom = true;
		errorMessage = '';
		successMessage = '';

		try {
			// Generate a simple alphanumeric room ID (no hyphens)
			const newRoomId = Math.random().toString(36).substring(2, 10);
			
			successMessage = `Room created! Room code: ${newRoomId}`;
			setTimeout(() => {
				goto(`/compete/${newRoomId}`);
			}, 1500);
		} catch (error) {
			console.error('Error creating room:', error);
			if (error instanceof Error)
				errorMessage = error.message || 'An error occurred while creating room';
		} finally {
			isCreatingRoom = false;
		}
	}

	async function joinRoom(id = roomCode) {
		if (isJoiningRoom || !browser) return;

		isJoiningRoom = true;
		errorMessage = '';
		successMessage = '';

		if (!id) {
			errorMessage = 'Room code is required';
			isJoiningRoom = false;
			return;
		}

		try {
			 // Simply navigate to the room - we'll connect to Agora there
			successMessage = 'Joining room...';
			setTimeout(() => {
				goto(`/compete/${id}`);
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

<div class="container space-y-6 p-4">
	<H1 class="text-left">Compete</H1>

	<div class="mb-6 flex justify-start">
		<Button variant="default" onclick={createRoom} disabled={isCreatingRoom} class="px-8">
			{#if isCreatingRoom}
				<Loader2 class="mr-2 h-4 w-4 animate-spin" />
			{/if}
			Create New Room
		</Button>
	</div>

	<div class="mb-8">
		<Card.Root>
			<Card.Header>
				<Card.Title>Join with Room Code</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="flex gap-4">
					<div class="flex-grow">
						<Input type="text" id="roomCode" bind:value={roomCode} placeholder="Enter room code" />
					</div>
					<Button
						variant="secondary"
						onclick={() => joinRoom()}
						disabled={isJoiningRoom || !roomCode}
					>
						{#if isJoiningRoom}
							<Loader2 class="mr-2 h-4 w-4 animate-spin" />
						{/if}
						Join
					</Button>
				</div>
			</Card.Content>
		</Card.Root>
	</div>

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
