<script lang="ts">
	import { toast } from 'svelte-sonner';
	import * as Card from '$lib/components/ui/card';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import * as Sheet from '$lib/components/ui/sheet';
	import * as Table from '$lib/components/ui/table';
	import { Button } from '$lib/components/ui/button';
	import * as Select from '$lib/components/ui/select';
	import { Separator } from '$lib/components/ui/separator';
	import { Camera, Scan, ShoppingBag, Package, X } from 'lucide-svelte';
	import { BarqodeStream, type BarcodeFormat, type DetectedBarcode } from 'barqode';

	let error = $state('');
	let result = $state('');
	let isLoading = $state(false);
	let isScanning = $state(false);
	let scannedProduct = $state<any>(null);
	let selectedCamera = $state<string>('rear');
	let selectedConstraints = $state<MediaTrackConstraints>({ facingMode: 'environment' });

	let barcodeFormats: {
		[key in BarcodeFormat]: boolean;
	} = $state({
		aztec: true,
		code_128: true,
		code_39: true,
		code_93: true,
		codabar: true,
		databar: true,
		databar_expanded: true,
		databar_limited: true,
		data_matrix: true,
		dx_film_edge: true,
		ean_13: true,
		ean_8: true,
		itf: true,
		maxi_code: true,
		micro_qr_code: true,
		pdf417: true,
		qr_code: true,
		rm_qr_code: true,
		upc_a: true,
		upc_e: true,
		linear_codes: true,
		matrix_codes: true,
		unknown: true
	});

	let selectedBarcodeFormats: BarcodeFormat[] = $derived(
		Object.keys(barcodeFormats).filter(
			(format: string) => barcodeFormats[format as keyof typeof barcodeFormats]
		) as BarcodeFormat[]
	);

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
	let sheetOpen = $state(false);

	async function requestCameraPermission() {
		try {
			isLoading = true;
			const stream = await navigator.mediaDevices.getUserMedia({ video: true });
			stream.getTracks().forEach((track) => track.stop());
			await setupCameras();
			isScanning = true;
		} catch (err) {
			toast.error('Camera permission denied');
			error = 'Please grant camera access to scan barcodes';
		} finally {
			isLoading = false;
		}
	}

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
			toast.error('Failed to enumerate cameras');
		}
	}

	function handleCameraChange(value: string) {
		const camera = availableCameras.find((c) => c.id === value);
		if (camera) {
			selectedCamera = value;
			selectedConstraints = camera.constraints;
		}
	}

	async function onDetect(detectedCodes: DetectedBarcode[]) {
		if (!detectedCodes.length) return;

		try {
			isLoading = true;
			result = detectedCodes[0].rawValue;
			const response = await fetch(`https://world.openfoodfacts.org/api/v3/product/${result}.json`);
			const data = await response.json();

			if (!data.product) {
				toast.error('Product not found');
				return;
			}

			const { nutriments } = data.product;
			scannedProduct = {
				...data.product,
				nutrients: {
					fat: nutriments.fat || 0,
					calories: nutriments.energy || 0,
					proteins: nutriments.proteins || 0,
					carbs: nutriments.carbohydrates || 0
				}
			};

			await saveToDatabase(scannedProduct);
			sheetOpen = true;
			toast.success('Product scanned and saved!');
		} catch (err) {
			toast.error('Failed to process barcode');
		} finally {
			isLoading = false;
		}
	}

	async function saveToDatabase(product: any) {
		try {
			const response = await fetch('/api/macros', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					macros_data: {
						...product.nutrients,
						rawData: JSON.stringify(product)
					}
				})
			});

			if (!response.ok) throw new Error('Failed to save');
		} catch (err) {
			throw new Error('Failed to save to database');
		}
	}

	function paintOutline(
		detectedCodes: {
			rawValue: string;
			boundingBox: DOMRectReadOnly;
			cornerPoints: { x: number; y: number }[];
			format: Exclude<BarcodeFormat, 'linear_codes' | 'matrix_codes'>;
		}[],
		ctx: CanvasRenderingContext2D
	) {
		for (const detectedCode of detectedCodes) {
			const [firstPoint, ...otherPoints] = detectedCode.cornerPoints;

			ctx.strokeStyle = '#10b981'; // emerald-500
			ctx.lineWidth = 3;
			ctx.beginPath();
			ctx.moveTo(firstPoint.x, firstPoint.y);

			for (const { x, y } of otherPoints) {
				ctx.lineTo(x, y);
			}

			ctx.lineTo(firstPoint.x, firstPoint.y);
			ctx.closePath();
			ctx.stroke();
		}
	}
</script>

<Card.Root class="mx-auto w-full max-w-4xl">
	<Card.Header>
		<div class="flex items-center justify-between">
			<div>
				<Card.Title class="flex items-center gap-2">
					<Scan class="h-5 w-5" />
					Barcode Scanner
				</Card.Title>
				<Card.Description>Scan product barcodes to track your nutrition</Card.Description>
			</div>
			{#if scannedProduct}
				<Badge variant="outline" class="flex items-center gap-1">
					<Package class="h-3 w-3" />
					Product Found
				</Badge>
			{/if}
		</div>
	</Card.Header>

	<Card.Content class="space-y-6">
		{#if !isScanning}
			<div class="flex flex-col items-center gap-4 rounded-lg bg-muted/20 py-16">
				<Camera class="h-16 w-16 text-muted-foreground" />
				<div class="space-y-2 text-center">
					<h3 class="font-medium">Camera Access Required</h3>
					<p class="max-w-md text-sm text-muted-foreground">
						Allow camera access to scan product barcodes and automatically track nutritional data
					</p>
				</div>
				<Button disabled={isLoading} onclick={requestCameraPermission}>
					{#if isLoading}
						<span class="animate-pulse">Requesting Camera...</span>
					{:else}
						Enable Camera
					{/if}
				</Button>
			</div>
		{:else}
			<div class="space-y-4">
				<div class="flex items-end gap-4">
					<div class="flex-1 space-y-2">
						<Label>Select Camera</Label>
						<Select.Root type="single" value={selectedCamera} onValueChange={handleCameraChange}>
							<Select.Trigger class="w-full">
								<span
									>{availableCameras.find((c) => c.id === selectedCamera)?.label ??
										'Select a camera'}</span
								>
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
				</div>

				<div class="relative aspect-video overflow-hidden rounded-lg border bg-background">
					{#if isLoading}
						<div class="absolute inset-0 z-10 flex items-center justify-center bg-background/80">
							<div class="flex flex-col items-center gap-2">
								<div
									class="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"
								></div>
								<p class="text-sm text-muted-foreground">Processing...</p>
							</div>
						</div>
					{/if}
					<BarqodeStream
						{onDetect}
						track={paintOutline}
						onCameraOn={setupCameras}
						constraints={selectedConstraints}
						formats={selectedBarcodeFormats}
					/>
					<div
						class="absolute bottom-4 left-4 right-4 rounded-md bg-background/80 p-2 text-center text-xs backdrop-blur-sm"
					>
						Center the barcode in frame to scan
					</div>
				</div>
			</div>
		{/if}

		{#if error}
			<div class="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
				{error}
			</div>
		{/if}
	</Card.Content>
</Card.Root>

<Sheet.Root bind:open={sheetOpen}>
	<Sheet.Content side="bottom" class="h-[85vh] sm:h-[75vh]">
		<div class="mx-auto w-full max-w-2xl">
			<Sheet.Header class="text-left">
				<div class="flex items-center justify-between">
					<Sheet.Title class="flex items-center gap-2">
						<ShoppingBag class="h-5 w-5" />
						Scanned Product
					</Sheet.Title>
				</div>
				{#if scannedProduct?.product_name}
					<Sheet.Description>
						{scannedProduct.product_name}
					</Sheet.Description>
				{/if}
			</Sheet.Header>

			<div class="mt-6 space-y-6">
				{#if scannedProduct}
					<div class="space-y-2">
						<div class="flex items-center justify-between">
							<h3 class="text-lg font-semibold">Nutritional Information</h3>
							<Badge variant="outline">Saved to Tracker</Badge>
						</div>
						<Separator />
						<div class="mt-4 grid grid-cols-2 gap-4">
							<div class="flex flex-col items-center justify-center rounded-lg bg-muted/40 p-4">
								<span class="text-3xl font-bold">{scannedProduct.nutrients.calories}</span>
								<span class="text-xs text-muted-foreground">CALORIES</span>
							</div>
							<div class="flex flex-col items-center justify-center rounded-lg bg-muted/40 p-4">
								<span class="text-3xl font-bold">{scannedProduct.nutrients.proteins}g</span>
								<span class="text-xs text-muted-foreground">PROTEIN</span>
							</div>
							<div class="flex flex-col items-center justify-center rounded-lg bg-muted/40 p-4">
								<span class="text-3xl font-bold">{scannedProduct.nutrients.carbs}g</span>
								<span class="text-xs text-muted-foreground">CARBS</span>
							</div>
							<div class="flex flex-col items-center justify-center rounded-lg bg-muted/40 p-4">
								<span class="text-3xl font-bold">{scannedProduct.nutrients.fat}g</span>
								<span class="text-xs text-muted-foreground">FAT</span>
							</div>
						</div>
					</div>

					{#if scannedProduct.nutrient_levels}
						<div class="mt-6 space-y-2">
							<h3 class="text-lg font-semibold">Nutrition Details</h3>
							<Separator />
							<Table.Root>
								<Table.Header>
									<Table.Row>
										<Table.Head>Nutrient</Table.Head>
										<Table.Head class="text-right">Amount</Table.Head>
									</Table.Row>
								</Table.Header>
								<Table.Body>
									<Table.Row>
										<Table.Cell>Calories</Table.Cell>
										<Table.Cell class="text-right"
											>{scannedProduct.nutrients.calories} kcal</Table.Cell
										>
									</Table.Row>
									<Table.Row>
										<Table.Cell>Proteins</Table.Cell>
										<Table.Cell class="text-right">{scannedProduct.nutrients.proteins}g</Table.Cell>
									</Table.Row>
									<Table.Row>
										<Table.Cell>Carbohydrates</Table.Cell>
										<Table.Cell class="text-right">{scannedProduct.nutrients.carbs}g</Table.Cell>
									</Table.Row>
									<Table.Row>
										<Table.Cell>Fat</Table.Cell>
										<Table.Cell class="text-right">{scannedProduct.nutrients.fat}g</Table.Cell>
									</Table.Row>
								</Table.Body>
							</Table.Root>
						</div>
					{/if}
				{/if}
			</div>
		</div>
	</Sheet.Content>
</Sheet.Root>
