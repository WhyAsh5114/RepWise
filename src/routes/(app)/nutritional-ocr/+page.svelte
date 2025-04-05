<script lang="ts">
	import { onMount } from 'svelte';

	let videoEl: HTMLVideoElement;
	let canvasEl: HTMLCanvasElement;
	let stream: MediaStream | null = null;

	let result = '';
	let error = '';
	let loading = false;

	let parsedNutrition: {
		calories?: string;
		fat?: string;
		carbs?: string;
		protein?: string;
	} = {};

	// Ask for camera access on load
	onMount(async () => {
		try {
			stream = await navigator.mediaDevices.getUserMedia({ video: true });
			videoEl.srcObject = stream;
			await videoEl.play();
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
				error = err.message;
			} finally {
				loading = false;
			}
		}, 'image/jpeg');
	}
</script>

<svelte:window on:beforeunload={() => stream?.getTracks().forEach((t) => t.stop())} />

<div>
	<h2>Scan Nutrition Label</h2>

	<video bind:this={videoEl} autoplay muted playsinline></video>
	<canvas bind:this={canvasEl} style="display: none;"></canvas>

	<button on:click={captureAndSendOCR} disabled={loading || !stream}>
		{loading ? 'Processing...' : 'Start Processing'}
	</button>

	{#if error}
		<p style="color: red;">Error: {error}</p>
	{/if}

	{#if parsedNutrition.calories}
		<h3>Extracted Nutrition Info</h3>
		<ul>
			<li><strong>Calories:</strong> {parsedNutrition.calories} / 100g</li>
			<li><strong>Fats:</strong> {parsedNutrition.fat}g / 100g</li>
			<li><strong>Carbohydrates:</strong> {parsedNutrition.carbs}g / 100g</li>
			<li><strong>Protein:</strong> {parsedNutrition.protein}g / 100g</li>
		</ul>
	{/if}
</div>
