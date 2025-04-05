import * as mindee from 'mindee';

export async function POST({ request }) {
	try {
		const formData = await request.formData();
		const fileData = formData.get('file');

		if (!fileData) {
			return new Response(JSON.stringify({ error: 'No file uploaded' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const arrayBuffer = await fileData.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);
		const fileName = fileData.name || 'uploaded-file.ext';

		const mindeeClient = new mindee.Client({ apiKey: '8f7f47f3bb1c85c56aff54a7393dbb9a' });

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
		return new Response(
			JSON.stringify({ success: false, error: err.message || 'Internal error' }),
			{ status: 500, headers: { 'Content-Type': 'application/json' } }
		);
	}
}
