<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Sheet from '$lib/components/ui/sheet';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { Camera, Scan, X, AlertCircle, Package, RotateCcw } from 'lucide-svelte';

	let stream: MediaStream | null = null;
	let videoEl = $state<HTMLVideoElement | undefined>(undefined);
	let canvasEl = $state<HTMLCanvasElement | undefined>(undefined);

	let result = '';
	let error = $state('');
	let loading = $state(false);

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
		if (!videoEl || !canvasEl) return;

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
			} catch (err) {
				error = err instanceof Error ? err.message : 'An unknown error occurred';
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
