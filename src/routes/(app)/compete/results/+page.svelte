<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Trophy, Share2, Undo2, Plus } from 'lucide-svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';

	// Get result data from URL parameters
	const position = parseInt($page.url.searchParams.get('position') || '0');
	const score = parseInt($page.url.searchParams.get('score') || '0');
	const totalParticipants = parseInt($page.url.searchParams.get('total') || '0');

	let positionEmoji = '🏆';
	
	// Determine position emoji
	onMount(() => {
		if (position === 1) {
			positionEmoji = '🥇';
		} else if (position === 2) {
			positionEmoji = '🥈';
		} else if (position === 3) {
			positionEmoji = '🥉';
		} else {
			positionEmoji = `${position}`;
		}
	});

	// Share results
	function shareResults() {
		const text = `I finished ${getOrdinal(position)} out of ${totalParticipants} with ${score} reps in a RepWise fitness competition! 💪`;
		
		if (navigator.share) {
			navigator.share({
				title: 'RepWise Competition Results',
				text: text,
				url: window.location.href
			}).catch(err => {
				console.error('Error sharing:', err);
				copyToClipboard(text);
			});
		} else {
			copyToClipboard(text);
		}
	}

	function copyToClipboard(text: string) {
		navigator.clipboard.writeText(text);
		toast.success('Results copied to clipboard!');
	}

	// Get ordinal suffix (1st, 2nd, 3rd, etc.)
	function getOrdinal(n: number): string {
		const s = ['th', 'st', 'nd', 'rd'];
		const v = n % 100;
		return n + (s[(v - 20) % 10] || s[v] || s[0]);
	}
</script>

<div class="container mx-auto max-w-md px-4 py-10">
	<Card.Root class="text-center">
		<Card.Header class="pb-2">
			<div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
				<Trophy class="h-8 w-8 text-primary" />
			</div>
			<Card.Title class="mt-4 text-2xl font-bold">Competition Results</Card.Title>
			<Card.Description>Your performance summary</Card.Description>
		</Card.Header>

		<Card.Content class="space-y-6 pb-6">
			<div class="mt-4 rounded-lg bg-muted p-6">
				<div class="mb-2 text-5xl font-bold">
					{positionEmoji}
				</div>
				<h2 class="text-2xl font-bold">{getOrdinal(position)} Place</h2>
				<p class="text-sm text-muted-foreground">Out of {totalParticipants} competitors</p>
			</div>

			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div class="rounded-lg bg-muted p-4">
					<div class="text-sm text-muted-foreground">Your Score</div>
					<div class="text-2xl font-bold">{score} <span class="text-sm font-normal">reps</span></div>
				</div>

				<div class="rounded-lg bg-muted p-4">
					<div class="text-sm text-muted-foreground">Exercise</div>
					<div class="text-2xl font-bold">Push Up</div>
				</div>
			</div>

			<div class="mt-4 space-y-2">
				<Badge variant="outline" class="text-xs">30 second challenge</Badge>
				<p class="text-sm text-muted-foreground">
					Great job on completing the challenge! Keep pushing your limits.
				</p>
			</div>
		</Card.Content>

		<Card.Footer class="flex flex-col space-y-2">
			<div class="grid grid-cols-2 gap-2">
				<Button variant="outline" onclick={shareResults}>
					<Share2 class="mr-2 h-4 w-4" />
					Share Results
				</Button>
				
				<Button variant="outline" onclick={() => goto('/compete')}>
					<Plus class="mr-2 h-4 w-4" />
					New Competition
				</Button>
			</div>

			<Button variant="ghost" onclick={() => goto('/dashboard')} class="mt-2">
				<Undo2 class="mr-2 h-4 w-4" />
				Back to Dashboard
			</Button>
		</Card.Footer>
	</Card.Root>
</div>
