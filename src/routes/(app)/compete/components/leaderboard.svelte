<script lang="ts">
    import { Trophy } from 'lucide-svelte';
    import * as Card from '$lib/components/ui/card';
    import { Badge } from '$lib/components/ui/badge';

    export let rankings: { userId: string; score: number; userName: string }[] = [];
    export let currentUserId: string = '';
    export let scores: Record<string, number> = {};
</script>

<div class="space-y-4">
    <Card.Root>
        <Card.Header>
            <Card.Title class="flex items-center">
                <Trophy class="mr-2 h-5 w-5 text-yellow-500" />
                Leaderboard
            </Card.Title>
        </Card.Header>
        <Card.Content>
            <div class="space-y-3">
                {#each rankings.slice(0, 10) as participant, index}
                    <div class="flex items-center justify-between rounded-md bg-muted/40 p-2">
                        <div class="flex items-center gap-2">
                            <div
                                class="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10"
                            >
                                {#if index === 0}
                                    <span class="text-yellow-500">🥇</span>
                                {:else if index === 1}
                                    <span class="text-gray-400">🥈</span>
                                {:else if index === 2}
                                    <span class="text-amber-700">🥉</span>
                                {:else}
                                    <span class="text-muted-foreground">{index + 1}</span>
                                {/if}
                            </div>
                            <span class="font-medium">{participant.userName}</span>
                            {#if participant.userId === currentUserId}
                                <Badge variant="outline" class="ml-1">You</Badge>
                            {/if}
                        </div>
                        <Badge variant="secondary">{participant.score} reps</Badge>
                    </div>
                {/each}

                {#if rankings.length === 0}
                    <p class="py-4 text-center text-muted-foreground">No scores yet</p>
                {/if}
            </div>
        </Card.Content>
    </Card.Root>

    <!-- User stats card -->
    <Card.Root>
        <Card.Header>
            <Card.Title>Your Stats</Card.Title>
        </Card.Header>
        <Card.Content>
            <div class="space-y-4">
                <div class="flex justify-between">
                    <span class="text-muted-foreground">Your Reps:</span>
                    <span class="font-semibold">{scores[currentUserId] || 0}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-muted-foreground">Current Rank:</span>
                    <span class="font-semibold">
                        {rankings.findIndex((r) => r.userId === currentUserId) + 1 || '-'}
                        / {rankings.length}
                    </span>
                </div>
                <div class="flex justify-between">
                    <span class="text-muted-foreground">Personal Best:</span>
                    <span class="font-semibold">{scores[currentUserId] || 0}</span>
                </div>
            </div>
        </Card.Content>
    </Card.Root>
</div>
