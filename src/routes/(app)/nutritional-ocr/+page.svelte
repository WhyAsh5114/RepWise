<script lang="ts">
	import { onMount } from 'svelte';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import {
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow
	} from '$lib/components/ui/table';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { Loader2, Camera } from 'lucide-svelte';
	import {
		Sheet,
		SheetContent,
		SheetHeader,
		SheetTitle,
		SheetDescription,
		SheetClose
	} from '$lib/components/ui/sheet';

	let videoEl: HTMLVideoElement;
	let canvasEl: HTMLCanvasElement;
	let stream: MediaStream | null = null;

	let result = '';
	let error = '';
	let loading = $state(false);
	let sheetOpen = $state(false);
	let cameraActive = $state(false);

	let parsedNutrition: {
		calories?: string;
		fat?: string;
		carbs?: string;
		protein?: string;
	} = {};

	// Camera selection
	let selectedCamera = $state<string>('rear');
	let selectedConstraints = $state<MediaTrackConstraints>({ facingMode: 'environment' });

	const defaultConstraintOptions = [
		{ id: 'front', label: 'Front Camera', constraints: { facingMode: 'user' } },
		{ id: 'rear', label: 'Rear Camera', constraints: { facingMode: 'environment' } }
	];

	type CameraOption = {
		id: string;
		label: string;
		constraints: { facingMode: string } | { deviceId: string };
	};
	let availableCameras = $state<CameraOption[]>(defaultConstraintOptions);

	// Setup cameras and enumerate available devices
	async function setupCameras() {
		try {
			const devices = await navigator.mediaDevices.enumerateDevices();
			const videoDevices = devices.filter(({ kind }) => kind === 'videoinput');

			availableCameras = [
				...defaultConstraintOptions,
				...videoDevices.map((device) => ({
					id: device.deviceId,
					constraints: { deviceId: device.deviceId },
					label: device.label || `Camera ${availableCameras.length + 1}`
				}))
			];
		} catch (e) {
			console.error('Failed to enumerate cameras', e);
			error = 'Failed to enumerate camera devices';
		}
	}

	// Handle camera change
	async function handleCameraChange(value: string) {
		const camera = availableCameras.find((c) => c.id === value);
		if (camera) {
			selectedCamera = value;
			selectedConstraints = camera.constraints;

			// Stop current stream
			if (stream) {
				stream.getTracks().forEach((track) => track.stop());
				stream = null;
				cameraActive = false;
			}

			// Start new stream with selected constraints
			try {
				stream = await navigator.mediaDevices.getUserMedia({ video: selectedConstraints });
				videoEl.srcObject = stream;
				await videoEl.play();
				cameraActive = true;
			} catch (err) {
				error = 'Failed to access the selected camera.';
				console.error(err);
			}
		}
	}

	// Ask for camera access on load
	onMount(async () => {
		try {
			// Enumerate cameras first
			await setupCameras();

			// Start with default camera
			stream = await navigator.mediaDevices.getUserMedia({ video: selectedConstraints });
			videoEl.srcObject = stream;
			await videoEl.play();
			cameraActive = true;
		} catch (err) {
			error = 'Camera access denied or unavailable.';
			console.error(err);
		}
	});

	// Extract values
	function extractValue(label: string, text: string): string | undefined {
		const regex = new RegExp(`${label}:[\\s\\S]*?:Per\\s+100g:\\s*(\\d+(\\.\\d+)?)`, 'i');
		const match = regex.exec(text);
		return match?.[1];
	}

	// Capture image and send to OCR
	async function captureAndSendOCR() {
		if (!videoEl || !canvasEl || !stream) return;

		error = '';
		result = '';
		loading = true;

		const ctx = canvasEl.getContext('2d');
		if (!ctx) return;

		canvasEl.width = videoEl.videoWidth;
		canvasEl.height = videoEl.videoHeight;
		ctx.drawImage(videoEl, 0, 0);

		canvasEl.toBlob(async (blob) => {
			if (!blob) return;

			const formData = new FormData();
			formData.append('file', blob, 'capture.jpg');

			try {
				const res = await fetch('/api/ocr', {
					method: 'POST',
					body: formData
				});

				const data = await res.json();

				if (!res.ok || !data.success) {
					throw new Error(data.error || 'Failed to process image');
				}

				result = data.result;
				parsedNutrition.calories = extractValue('Calories', result);
				parsedNutrition.fat = extractValue('Total Fat', result);
				parsedNutrition.carbs = extractValue('Total Carbohydrate', result);
				parsedNutrition.protein = extractValue('Protein', result);
				sheetOpen = true;
			} catch (err) {
				if (err instanceof Error) error = err.message;
			} finally {
				loading = false;
			}
		}, 'image/jpeg');
	}
</script>

<svelte:window on:beforeunload={() => stream?.getTracks().forEach((t) => t.stop())} />

<Card class="mx-auto w-full max-w-md">
	<CardHeader>
		<CardTitle>Scan Nutrition Label</CardTitle>
	</CardHeader>
	<CardContent>
		<div class="space-y-4">
			<div class="space-y-2">
				<Label>Select Camera</Label>
				<Select.Root type="single" value={selectedCamera} onValueChange={handleCameraChange}>
					<Select.Trigger class="w-full">
						<span>
							{availableCameras.find((c) => c.id === selectedCamera)?.label ?? 'Select a camera'}
						</span>
					</Select.Trigger>
					<Select.Content>
						{#each availableCameras as camera}
							<Select.Item value={camera.id}>
								{camera.label}
							</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>

			<div class="relative aspect-video overflow-hidden rounded-lg bg-black">
				<video bind:this={videoEl} autoplay muted playsinline class="h-full w-full object-cover"
				></video>
				<canvas bind:this={canvasEl} class="hidden"></canvas>
			</div>

			<Button
				onclick={captureAndSendOCR}
				disabled={loading || !cameraActive}
				variant="default"
				class="w-full"
			>
				{#if loading}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					Processing...
				{:else}
					Capture & Process
				{/if}
			</Button>

			{#if error && cameraActive}
				<Alert variant="destructive">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			{/if}
		</div>
	</CardContent>
</Card>

<Sheet bind:open={sheetOpen}>
	<SheetContent class="h-full overflow-y-auto">
		<SheetHeader>
			<SheetTitle>Nutrition Information</SheetTitle>
			<SheetDescription>Extracted data from nutrition label</SheetDescription>
		</SheetHeader>

		<div class="py-6">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Nutrient</TableHead>
						<TableHead>Amount per 100g</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					<TableRow>
						<TableCell class="font-medium">Calories</TableCell>
						<TableCell>{parsedNutrition.calories || '-'}</TableCell>
					</TableRow>
					<TableRow>
						<TableCell class="font-medium">Fats</TableCell>
						<TableCell>{parsedNutrition.fat ? `${parsedNutrition.fat}g` : '-'}</TableCell>
					</TableRow>
					<TableRow>
						<TableCell class="font-medium">Carbohydrates</TableCell>
						<TableCell>{parsedNutrition.carbs ? `${parsedNutrition.carbs}g` : '-'}</TableCell>
					</TableRow>
					<TableRow>
						<TableCell class="font-medium">Protein</TableCell>
						<TableCell>{parsedNutrition.protein ? `${parsedNutrition.protein}g` : '-'}</TableCell>
					</TableRow>
				</TableBody>
			</Table>
		</div>
	</SheetContent>
</Sheet>
