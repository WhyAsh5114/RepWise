<script lang="ts">
	import { BarqodeStream, type BarcodeFormat, type DetectedBarcode } from 'barqode';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Table from '$lib/components/ui/table/index.js';

	let result = $state('');
	let error = $state('');

	let selectedConstraints = $state({ facingMode: 'environment' });

	let carbs = $state('');
	let proteins = $state('');
	let fat = $state('');
	let calories = $state('');

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
			(format: string) => barcodeFormats[format]
		) as BarcodeFormat[]
	);

	const defaultConstraintOptions: { label: string; constraints: MediaTrackConstraints }[] = [
		{ label: 'rear camera', constraints: { facingMode: 'environment' } },
		{ label: 'front camera', constraints: { facingMode: 'user' } }
	];

	let constraintOptions = $state(defaultConstraintOptions);

	async function onCameraOn() {
		try {
			const devices = await navigator.mediaDevices.enumerateDevices();
			const videoDevices = devices.filter(({ kind }) => kind === 'videoinput');

			constraintOptions = [
				...defaultConstraintOptions,
				...videoDevices.map(({ deviceId, label }) => ({
					label: `${label}`,
					constraints: { deviceId }
				}))
			];

			error = '';
		} catch (e) {
			console.error(e);
		}
	}

	function onError(err: { name: string; message: string }) {
		error = `[${err.name}]: `;

		if (err.name === 'NotAllowedError') {
			error += 'you need to grant camera access permission';
		} else if (err.name === 'NotFoundError') {
			error += 'no camera on this device';
		} else if (err.name === 'NotSupportedError') {
			error += 'secure context required (HTTPS, localhost)';
		} else if (err.name === 'NotReadableError') {
			error += 'is the camera already in use?';
		} else if (err.name === 'OverconstrainedError') {
			error += 'installed cameras are not suitable';
		} else if (err.name === 'StreamApiNotSupportedError') {
			error += 'Stream API is not supported in this browser';
		} else {
			error += err.message;
		}
	}

	async function onDetect(detectedCodes: DetectedBarcode[]) {
		result = detectedCodes[0].rawValue;
		if (result.length > 0) {
			const response = await fetch(`https://world.openfoodfacts.org/api/v3/product/${result}.json`);

			const data = await response.json();
			const product = data.product;
			const nutriments = product.nutriments;

			carbs = nutriments.carbohydrates;

			proteins = nutriments.proteins;

			fat = nutriments.fat;

			calories = nutriments.energy;

			console.log(carbs, proteins, fat, calories);

			const macros_data = {
				calories,
				proteins,
				carbs,
				fat,
				rawData: JSON.stringify(product)
			};

			const api_response = await fetch('/api/macros', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ macros_data })
			});
			const api_result = await api_response.text();
			console.log(api_result);
		}
	}

	function paintOutline(
		detectedCodes: {
			cornerPoints: { x: number; y: number }[];
			boundingBox: DOMRectReadOnly;
			rawValue: string;
			format: Exclude<BarcodeFormat, 'linear_codes' | 'matrix_codes'>;
		}[],
		ctx: CanvasRenderingContext2D
	) {
		for (const detectedCode of detectedCodes) {
			const [firstPoint, ...otherPoints] = detectedCode.cornerPoints;

			ctx.strokeStyle = 'red';
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

<div class="flex flex-col gap-4">
	<Label>Select Camera</Label>
	<Select.Root type="single" name="favoriteFruit">
		<Select.Trigger class="w-[180px]">
			{selectedConstraints.facingMode}
		</Select.Trigger>
		<Select.Content>
			<Select.Group>
				<Select.GroupHeading>Fruits</Select.GroupHeading>
				{#each constraintOptions as fruit (fruit.label)}
					<Select.Item value={fruit.label} label={fruit.label}>{fruit.label}</Select.Item>
				{/each}
			</Select.Group>
		</Select.Content>
	</Select.Root>
	{#if error}
		{error}
	{/if}

	<div style="width: 100%; aspect-ratio: 4/3;">
		<BarqodeStream
			constraints={selectedConstraints}
			track={paintOutline}
			formats={selectedBarcodeFormats}
			{onCameraOn}
			{onError}
			{onDetect}
		/>
	</div>
</div>

Last result: {result}
