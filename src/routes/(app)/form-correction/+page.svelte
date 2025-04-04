<script lang="ts">
	import H1 from '$lib/components/typography/h1.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
	import { LoaderCircle } from 'lucide-svelte';

	let poseLandmarker: PoseLandmarker | undefined = $state();
	let selectedExercise = $state('Squat');
	let timer = $state(5);

	$effect(() => {
		loadLandmarker();
	});

	async function loadLandmarker() {
		const vision = await FilesetResolver.forVisionTasks(
			'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
		);

		poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
			baseOptions: {
				modelAssetPath: '/pose_landmarker_heavy.task',
				delegate: 'GPU'
			},
			runningMode: 'VIDEO'
		});
	}

	async function startDetection(e: SubmitEvent) {
		e.preventDefault();
	}
</script>

<H1>Form correction</H1>

{#if poseLandmarker === undefined}
	<div class="flex h-px grow flex-col items-center justify-center gap-2">
		<LoaderCircle class="animate-spin" size={48} />
		<p>Loading model</p>
	</div>
{:else}
	<form
		class="grid grid-cols-2 items-end gap-2 rounded-md border bg-card p-6"
		onsubmit={startDetection}
	>
		<Label class="col-span-2 space-y-1.5">
			<span>Select an exercise</span>
			<Select.Root type="single" bind:value={selectedExercise} required>
				<Select.Trigger class="w-full">{selectedExercise}</Select.Trigger>
				<Select.Content>
					<Select.Item value="Squat">Squat</Select.Item>
					<Select.Item value="Push Up">Push Up</Select.Item>
				</Select.Content>
			</Select.Root>
		</Label>
		<div class="flex w-full max-w-sm flex-col gap-1.5">
			<Label for="timer">Email</Label>
			<Input
				type="number"
				id="timer"
				placeholder="Timer (in seconds)"
				bind:value={timer}
				required
			/>
		</div>
		<Button type="submit">Start</Button>
	</form>
{/if}
