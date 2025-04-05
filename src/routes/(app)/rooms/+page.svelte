<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  let rooms: Array<{ id: string; users: number[] }> = [];

  onMount(async () => {
    await fetchRooms();
  });

  async function fetchRooms() {
    const response = await fetch('/api/rooms');
    rooms = await response.json();
  }

  async function createRoom() {
    const response = await fetch('/api/rooms', {
      method: 'POST'
    });
    const { roomId } = await response.json();
    goto(`/rooms/${roomId}`);
  }
</script>

<div class="container mx-auto p-4">
  <div class="flex justify-between items-center mb-6">
    <h1 class="text-2xl font-bold">Video Chat Rooms</h1>
    <button 
      class="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
      on:click={createRoom}
    >
      Create Room
    </button>
  </div>

  <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    {#each rooms as room}
      <div class="border rounded-lg p-4">
        <h2 class="font-medium mb-2">Room {room.id}</h2>
        <p class="text-sm text-muted-foreground mb-4">
          {room.users.length} users connected
        </p>
        <button 
          class="w-full px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/90"
          on:click={() => goto(`/room/${room.id}`)}
        >
          Join Room
        </button>
      </div>
    {/each}

    {#if rooms.length === 0}
      <div class="col-span-full text-center py-8 text-muted-foreground">
        No active rooms. Create one to get started!
      </div>
    {/if}
  </div>
</div>
