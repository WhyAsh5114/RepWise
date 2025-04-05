<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { agoraClient, joinChannel, leaveChannel } from '$lib/agora';
  import type { IAgoraRTCRemoteUser } from 'agora-rtc-sdk-ng';

  const roomId = $page.params.roomId;
  const uid = Math.floor(Math.random() * 1000000);
  
  let localVideoContainer: HTMLDivElement;
  let isConnected = false;
  let error = '';

  onMount(async () => {
    try {
      // Handle user published events
      agoraClient.on('user-published', async (user: IAgoraRTCRemoteUser, mediaType: 'video' | 'audio') => {
        if (mediaType === 'video') {
          await agoraClient.subscribe(user, mediaType);
          handleUserPublished(user);
        }
      });

      // Handle user left events
      agoraClient.on('user-left', (user: IAgoraRTCRemoteUser) => {
        handleUserLeft(user);
      });

      const { videoTrack } = await joinChannel(roomId, uid);
      if (localVideoContainer) {
        videoTrack.play(localVideoContainer);
      }
      isConnected = true;
    } catch (err) {
      error = 'Failed to join video chat';
      console.error(err);
    }
  });

  function handleUserPublished(user: IAgoraRTCRemoteUser) {
    const container = document.createElement('div');
    container.id = `player-${user.uid}`;
    container.className = 'remote-video-container';
    document.getElementById('remote-videos')?.appendChild(container);
    user.videoTrack?.play(container);
  }

  function handleUserLeft(user: IAgoraRTCRemoteUser) {
    const container = document.getElementById(`player-${user.uid}`);
    container?.remove();
  }

  onDestroy(async () => {
    if (isConnected) {
      await leaveChannel();
    }
  });
</script>

<div class="flex flex-col gap-4 p-4">
  <h1 class="text-2xl font-bold">Room: {roomId}</h1>
  
  {#if error}
    <div class="bg-red-100 text-red-700 p-4 rounded">
      {error}
    </div>
  {/if}

  <div class="grid grid-cols-2 gap-4">
    <!-- Local Video -->
    <div class="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
      <div bind:this={localVideoContainer} class="absolute inset-0">
      </div>
      <div class="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-white text-sm">
        You
      </div>
    </div>

    <!-- Remote Videos -->
    <div id="remote-videos" class="grid gap-4 auto-rows-fr">
    </div>
  </div>
</div>

<style>
  .remote-video-container {
    @apply relative aspect-video bg-gray-900 rounded-lg overflow-hidden;
  }
</style>
