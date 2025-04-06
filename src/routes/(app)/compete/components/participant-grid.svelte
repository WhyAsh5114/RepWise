<script lang="ts">
	import type { IAgoraRTCRemoteUser } from 'agora-rtc-sdk-ng';

	export let remoteUsers: Record<string, IAgoraRTCRemoteUser> = {};
	export let participants: Array<{
		userId: string;
		name: string;
		image?: string;
		isHost?: boolean;
	}> = [];
	export let scores: Record<string, number> = {};
	export let rankings: Array<{ userId: string; score: number; userName: string }> = [];

	// Helper function to get participant position
	function getPosition(userId: string): number {
		return rankings.findIndex((r) => r.userId === userId) + 1;
	}
</script>

<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
	<!-- eslint-disable-next-line @typescript-eslint/no-unused-vars -->
	{#each Object.entries(remoteUsers) as [uid, _]}
		<div class="relative overflow-hidden rounded-lg border bg-muted">
			<div id="user-{uid}" class="aspect-video w-full"></div>

			<!-- Participant info overlay -->
			<div
				class="absolute bottom-0 left-0 right-0 flex items-center justify-between bg-black/70 px-2 py-1"
			>
				<span class="truncate text-xs text-white">
					{participants.find((p) => p.userId === uid)?.name || 'Participant'}
				</span>
				<div class="flex items-center gap-1">
					{#if participants.find((p) => p.userId === uid)?.isHost}
						<span class="text-xs text-yellow-400">Host</span>
					{/if}
				</div>
			</div>

			<!-- Position indicator -->
			<div
				class="absolute left-1 top-1 flex size-6 items-center justify-center rounded-full bg-black/70 text-xs font-bold text-white"
			>
				{getPosition(uid) || '-'}
			</div>

			<!-- Score overlay -->
			<div
				class="absolute right-1 top-1 rounded-md bg-primary/80 px-2 py-0.5 text-xs font-bold text-white"
			>
				{scores[uid] || 0} reps
			</div>
		</div>
	{/each}

	<!-- Placeholder for empty slots -->
	{#if Object.keys(remoteUsers).length < 3}
		<!-- eslint-disable-next-line @typescript-eslint/no-unused-vars -->
		{#each Array(3 - Object.keys(remoteUsers).length) as _}
			<div
				class="flex aspect-video items-center justify-center rounded-lg border border-dashed bg-muted/50"
			>
				<span class="text-sm text-muted-foreground">Waiting...</span>
			</div>
		{/each}
	{/if}
</div>
