<script lang="ts">
	import { Info } from 'lucide-svelte';
	import H1 from '$lib/components/typography/h1.svelte';
	import * as Popover from '$lib/components/ui/popover';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Select from '$lib/components/ui/select/index.js';
	import DetectionComponent from '$lib/detection-component.svelte';
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert';

	let timer = $state(3);
	let selectedCamera = $state('');
	let detectionStarted = $state(false);
	let videoFile = $state<File | null>(null);
	let cameras = $state<MediaDeviceInfo[]>([]);
	let inputSource = $state<'webcam' | 'file'>('webcam');
	let selectedExercise = $state<keyof typeof exerciseGuides>('Squat');
	let permissionStatus = $state<'granted' | 'denied' | 'prompt' | 'checking'>('checking');

	const exerciseGuides = {
		Squat: {
			image: '/exercises/squat.png',
			description:
				'Place your camera at hip height and about 6-8 feet away, from the side view to best capture the full range of motion.',
			placement: 'Side view, hip height'
		},
		'Push Up': {
			image: '/exercises/pushup.png',
			description:
				'Position your camera at floor level, about 4-6 feet away from your side to capture your full body position.',
			placement: 'Side view, ground level'
		}
	};

	$effect(() => {
		if (inputSource === 'webcam') {
			checkCameraPermission();
			getCameras();
		}
	});

	async function checkCameraPermission() {
		try {
			permissionStatus = 'checking';
			const result = await navigator.permissions.query({ name: 'camera' });
			permissionStatus = result.state as 'granted' | 'denied' | 'prompt';

			result.addEventListener('change', () => {
				permissionStatus = result.state as 'granted' | 'denied' | 'prompt';
				if (result.state === 'granted') {
					getCameras();
				}
			});
		} catch (error) {
			console.error('Error checking camera permission:', error);

			try {
				const stream = await navigator.mediaDevices.getUserMedia({ video: true });
				stream.getTracks().forEach((track) => track.stop());
				permissionStatus = 'granted';
			} catch {
				permissionStatus = 'denied';
			}
		}
	}

	async function requestCameraPermission() {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ video: true });
			stream.getTracks().forEach((track) => track.stop());
			permissionStatus = 'granted';
			await getCameras();
			return true;
		} catch (error) {
			console.error('Permission denied or error accessing camera:', error);
			permissionStatus = 'denied';
			return false;
		}
	}

	async function getCameras() {
		try {
			const devices = await navigator.mediaDevices.enumerateDevices();
			cameras = devices.filter((device) => device.kind === 'videoinput');
			if (cameras.length > 0) {
				selectedCamera = cameras[0].deviceId;
			}
		} catch (error) {
			console.error('Error enumerating cameras:', error);
		}
	}

	async function startDetection(e: SubmitEvent) {
		e.preventDefault();

		if (inputSource === 'webcam') {
			if (permissionStatus !== 'granted') {
				const granted = await requestCameraPermission();
				if (!granted) return;
			}
		} else if (inputSource === 'file') {
			if (!videoFile) {
				alert('Please select a video file');
				return;
			}
		}

		detectionStarted = true;
	}

	function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		if (input.files && input.files.length > 0) {
			videoFile = input.files[0];
		}
	}
</script>

<H1>Form correction</H1>

{#if permissionStatus === 'denied' && inputSource === 'webcam'}
	<Alert variant="destructive" class="mb-4">
		<AlertTitle>Camera access denied</AlertTitle>
		<AlertDescription>
			To use this feature, you need to allow camera access in your browser settings. After changing
			the settings, refresh this page.
		</AlertDescription>
	</Alert>
{/if}

<form
	class="grid grid-cols-2 items-end gap-2 rounded-md border bg-card p-6"
	onsubmit={startDetection}
>
	<div class="col-span-2 flex items-end gap-2">
		<Label class="flex-1 space-y-1.5">
			<span>Select an exercise</span>
			<Select.Root type="single" bind:value={selectedExercise} required>
				<Select.Trigger class="w-full">{selectedExercise}</Select.Trigger>
				<Select.Content>
					<Select.Item value="Squat">Squat</Select.Item>
					<Select.Item value="Push Up">Push Up</Select.Item>
				</Select.Content>
			</Select.Root>
		</Label>

		<Popover.Root>
			<Popover.Trigger>
				<Button variant="outline" size="icon" class="h-10 w-10">
					<Info class="h-5 w-5" />
					<span class="sr-only">View camera placement guide</span>
				</Button>
			</Popover.Trigger>
			<Popover.Content class="w-80">
				<div class="grid gap-4">
					<div class="space-y-2">
						<h4 class="font-medium leading-none">Camera Placement Guide</h4>
						<p class="text-sm text-muted-foreground">
							{exerciseGuides[selectedExercise].placement}
						</p>
					</div>
					<div class="rounded-lg border">
						<img
							src={exerciseGuides[selectedExercise].image}
							alt={`Camera placement guide for ${selectedExercise}`}
							class="aspect-video w-full rounded-lg object-cover"
						/>
					</div>
					<p class="text-sm text-muted-foreground">
						{exerciseGuides[selectedExercise].description}
					</p>
				</div>
			</Popover.Content>
		</Popover.Root>
	</div>

	<Label class="col-span-2 space-y-1.5">
		<span>Input Source</span>
		<RadioGroup.Root bind:value={inputSource} class="mt-2 flex flex-wrap gap-4">
			<div
				class="flex items-center space-x-2 rounded-md border px-4 py-2 transition-colors hover:bg-muted/50"
			>
				<RadioGroup.Item value="webcam" id="webcam" />
				<Label for="webcam" class="cursor-pointer">Webcam</Label>
			</div>
			<div
				class="flex items-center space-x-2 rounded-md border px-4 py-2 transition-colors hover:bg-muted/50"
			>
				<RadioGroup.Item value="file" id="file" />
				<Label for="file" class="cursor-pointer">Video File</Label>
			</div>
		</RadioGroup.Root>
	</Label>

	{#if inputSource === 'webcam'}
		<Label class="col-span-2 space-y-1.5">
			<span>Select a camera</span>
			<Select.Root type="single" bind:value={selectedCamera} required>
				<Select.Trigger class="w-full">
					{cameras.find((c) => c.deviceId === selectedCamera)?.label || 'Default camera'}
				</Select.Trigger>
				<Select.Content>
					{#each cameras as camera}
						<Select.Item value={camera.deviceId}>
							{camera.label}
						</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</Label>
	{:else if inputSource === 'file'}
		<Label class="col-span-2 space-y-1.5">
			<span>Select a video file</span>
			<Input type="file" onchange={handleFileSelect} required />
		</Label>
	{/if}

	<div class="flex w-full max-w-sm flex-col gap-1.5">
		<Label for="timer">Timer</Label>
		<Input type="number" id="timer" placeholder="Timer (in seconds)" bind:value={timer} required />
	</div>
	<Button
		type="submit"
		disabled={(inputSource === 'webcam' && permissionStatus === 'denied') ||
			(inputSource === 'file' && !videoFile) ||
			detectionStarted}
	>
		{inputSource === 'webcam' && permissionStatus === 'prompt' ? 'Allow Camera & Start' : 'Start'}
	</Button>
</form>

{#if detectionStarted}
	<DetectionComponent
		{timer}
		exerciseName={selectedExercise}
		{selectedCamera}
		{inputSource}
		{videoFile}
	/>
{/if}
