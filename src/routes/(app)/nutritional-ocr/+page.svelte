<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Sheet from '$lib/components/ui/sheet';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { Camera, Scan, X, AlertCircle, Package, RotateCcw } from 'lucide-svelte';
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

	let stream: MediaStream | null = null;
	let videoEl = $state<HTMLVideoElement | undefined>(undefined);
	let canvasEl = $state<HTMLCanvasElement | undefined>(undefined);

	let result = '';
	let error = $state('');
	let loading = $state(false);
	let sheetOpen = $state(false);
	let cameraActive = $state(false);

	let parsedNutrition = $state<{
		calories?: string;
		fat?: string;
		carbs?: string;
		protein?: string;
	}>({});

	let sheetOpen = $state(false);
	let cameraPermissionGranted = $state(false);

	async function requestCameraAccess() {
		try {
			stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: 'environment' }
			});

			if (!videoEl) return;
			videoEl.srcObject = stream;
			videoEl
				.play()
				.then(() => {
					cameraPermissionGranted = true;
				})
				.catch((err) => {
					error = 'Failed to play video: ' + err.message;
					console.error(err);
				});
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
	}

	function toggleCamera() {
		if (!stream) return;

		stream.getTracks().forEach((track) => track.stop());
		const currentFacingMode = stream.getVideoTracks()[0].getSettings().facingMode;
		const newFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';

		navigator.mediaDevices
			.getUserMedia({
				video: { facingMode: newFacingMode }
			})
			.then((newStream) => {
				stream = newStream;
				if (!videoEl) return;
				videoEl.srcObject = newStream;
				videoEl.play();
			})
			.catch((err) => {
				error = 'Failed to switch camera: ' + err.message;
				console.error(err);
			});
	}

	function extractValue(label: string, text: string): string | undefined {
		const regex = new RegExp(`${label}:[\\s\\S]*?:Per\\s+100g:\\s*(\\d+(\\.\\d+)?)`, 'i');
		const match = regex.exec(text);
		return match?.[1];
	}

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

				let macros_data = {
					calories: parsedNutrition.calories,
					fat: parsedNutrition.fat,
					carbs: parsedNutrition.carbs,
					protein: parsedNutrition.protein,
					rawData: 'macros_data'
				};

				const response = await fetch('/api/macros', {
					method: 'POST',
					body: JSON.stringify({ macros_data })
				});

				const apiData = await response.json();
				console.log(apiData);
			} catch (err) {
				error = err instanceof Error ? err.message : 'An unknown error occurred';
				if (err instanceof Error) error = err.message;
			} finally {
				loading = false;
			}
		}, 'image/jpeg');
	}

	function resetScan() {
		result = '';
		error = '';
		parsedNutrition = {};
		sheetOpen = false;
	}

	$effect(() => {
		if (parsedNutrition.calories) {
			sheetOpen = true;
		}
	});
</script>

<svelte:window on:beforeunload={() => stream?.getTracks().forEach((t) => t.stop())} />

<div class="container space-y-6 py-6">
	<Card.Root class="bg-card shadow-lg">
		<Card.Header class="bg-muted/30">
			<Card.Title class="flex items-center gap-2 text-xl text-primary">
				<Scan class="h-6 w-6" />
				Nutrition Label Scanner
			</Card.Title>
			<Card.Description class="text-muted-foreground">
				Point your camera at a nutrition label to extract nutritional information
			</Card.Description>
		</Card.Header>

		<Card.Content class="space-y-6 p-6">
			{#if !cameraPermissionGranted}
				<div class="flex flex-col items-center gap-4 rounded-lg bg-muted/20 py-16">
					<Camera class="h-16 w-16 text-primary opacity-80" />
					<div class="space-y-2 text-center">
						<h3 class="font-medium">Camera Access Required</h3>
						<p class="max-w-md text-sm text-muted-foreground">
							Allow camera access to scan nutrition labels
						</p>
					</div>
					<Button
						class="bg-primary hover:bg-primary/90"
						disabled={loading}
						onclick={requestCameraAccess}
					>
						Enable Camera
					</Button>
				</div>
			{:else}
				<div
					class="relative aspect-video overflow-hidden rounded-lg border-2 border-muted bg-black"
				>
					{#if loading}
						<div
							class="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm"
						>
							<div class="flex flex-col items-center gap-2">
								<div
									class="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"
								></div>
								<p class="font-medium text-primary">Processing label...</p>
							</div>
						</div>
					{/if}

					<video
						bind:this={videoEl}
						class="h-full w-full object-cover"
						autoplay
						muted
						playsinline
						style="display: block;"
					></video>
					<canvas bind:this={canvasEl} class="hidden"></canvas>

					<div class="pointer-events-none absolute inset-0">
						<div
							class="flex h-full w-full items-center justify-center border-4 border-dashed border-primary/30"
						>
							<div class="rounded bg-black/30 px-2 py-1 text-xs text-primary/50">
								Center the nutrition label
							</div>
						</div>
					</div>
				</div>

				<div class="flex items-center justify-center gap-4">
					<Button
						variant="outline"
						onclick={toggleCamera}
						disabled={loading}
						class="border-primary/30 text-primary"
					>
						<RotateCcw class="mr-2 h-4 w-4" />
						Switch Camera
					</Button>

					<Button
						size="lg"
						onclick={captureAndSendOCR}
						disabled={loading}
						class="bg-primary hover:bg-primary/90"
					>
						<Camera class="mr-2 h-5 w-5" />
						{loading ? 'Processing...' : 'Capture Label'}
					</Button>
				</div>

				{#if error}
					<div
						class="flex items-center gap-2 rounded-lg bg-destructive/10 p-4 text-sm text-destructive"
					>
						<AlertCircle class="h-5 w-5" />
						<span>{error}</span>
					</div>
				{/if}
			{/if}
		</Card.Content>
	</Card.Root>
</div>

<Sheet.Root bind:open={sheetOpen}>
	<Sheet.Content
		side="bottom"
		class="h-[85vh] rounded-t-xl border-t-2 border-primary/30 bg-card shadow-lg sm:h-[75vh]"
	>
		<div class="mx-auto w-full max-w-2xl p-4">
			<Sheet.Header class="text-left">
				<div class="flex items-center justify-between">
					<Sheet.Title class="flex items-center gap-2 text-xl text-primary">
						<Package class="h-5 w-5" />
						Scanned Nutrition Info
					</Sheet.Title>
					<div class="flex gap-2">
						<Button variant="outline" size="sm" onclick={resetScan}>
							<RotateCcw class="mr-1 h-4 w-4" />
							Scan Again
						</Button>
						<Button variant="ghost" size="icon" onclick={() => (sheetOpen = false)}>
							<X class="h-5 w-5" />
						</Button>
					</div>
				</div>
			</Sheet.Header>

			<div class="mt-6 space-y-6">
				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<h3 class="text-lg font-semibold">Nutritional Information</h3>
						<Badge variant="outline" class="border-primary/30 bg-primary/10 text-primary"
							>Per 100g</Badge
						>
					</div>
					<Separator class="bg-muted/60" />
					<div class="mt-4 grid grid-cols-2 gap-4">
						<div
							class="flex flex-col items-center justify-center rounded-lg bg-primary/10 p-6 transition-all hover:bg-primary/15"
						>
							<span class="text-4xl font-bold text-primary">{parsedNutrition.calories || '0'}</span>
							<span class="text-xs font-medium text-primary/70">CALORIES</span>
						</div>
						<div
							class="flex flex-col items-center justify-center rounded-lg bg-primary/10 p-6 transition-all hover:bg-primary/15"
						>
							<span class="text-4xl font-bold text-primary">{parsedNutrition.protein || '0'}g</span>
							<span class="text-xs font-medium text-primary/70">PROTEIN</span>
						</div>
						<div
							class="flex flex-col items-center justify-center rounded-lg bg-primary/10 p-6 transition-all hover:bg-primary/15"
						>
							<span class="text-4xl font-bold text-primary">{parsedNutrition.carbs || '0'}g</span>
							<span class="text-xs font-medium text-primary/70">CARBS</span>
						</div>
						<div
							class="flex flex-col items-center justify-center rounded-lg bg-primary/10 p-6 transition-all hover:bg-primary/15"
						>
							<span class="text-4xl font-bold text-primary">{parsedNutrition.fat || '0'}g</span>
							<span class="text-xs font-medium text-primary/70">FAT</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	</Sheet.Content>
</Sheet.Root>
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