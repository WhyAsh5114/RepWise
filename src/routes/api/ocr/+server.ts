import * as mindee from 'mindee';
import { OCR_API_KEY } from '$env/static/private';

export async function POST({ request }) {
	try {
		const formData = await request.formData();
		const fileData = formData.get('file');

		if (!fileData || !(fileData instanceof Blob)) {
			return new Response(JSON.stringify({ error: 'No file uploaded or invalid file type' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const arrayBuffer = await fileData.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);
		const fileName = fileData.name || 'uploaded-file.ext';

		const mindeeClient = new mindee.Client({ apiKey: OCR_API_KEY });

		const inputSource = mindeeClient.docFromBuffer(buffer, fileName);
		const apiResponse = await mindeeClient.enqueueAndParse(
			mindee.product.NutritionFactsLabelV1,
			inputSource
		);

		return new Response(
			JSON.stringify({ success: true, result: apiResponse.document?.toString() }),
			{ headers: { 'Content-Type': 'application/json' } }
		);
	} catch (err) {
		console.error('Nutrition OCR Error:', err);
		const errorMessage = err instanceof Error ? err.message : 'Internal error';
		return new Response(JSON.stringify({ success: false, error: errorMessage }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}
