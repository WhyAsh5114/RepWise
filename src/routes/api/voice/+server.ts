import { ELEVENLABS_API_KEY } from '$env/static/private';
import { error } from '@sveltejs/kit';
import { ElevenLabsClient } from 'elevenlabs';

export async function POST({ request }) {
	try {
		const { text } = await request.json();

		if (!text && typeof text !== 'string') {
			throw error(400, 'Text is required');
		}

		const client = new ElevenLabsClient({
			apiKey: ELEVENLABS_API_KEY
		});

		// Generate the complete audio without streaming
		const audioBuffer = await client.textToSpeech.convert('JBFqnCBsd6RMkjVDRZzb', {
			output_format: 'mp3_44100_128',
			text: text,
			model_id: 'eleven_multilingual_v2'
		});

		// Convert the Readable stream to a buffer
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const chunks: any[] = [];
		for await (const chunk of audioBuffer) {
			chunks.push(chunk);
		}
		const buffer = Buffer.concat(chunks);

		// Return the complete audio buffer
		return new Response(buffer, {
			headers: {
				'Content-Type': 'audio/mpeg',
				'Cache-Control': 'no-cache'
			},
			status: 200
		});
	} catch (err) {
		console.error('Error in voice API:', err);
		throw error(500, 'Server error when processing voice request');
	}
}
