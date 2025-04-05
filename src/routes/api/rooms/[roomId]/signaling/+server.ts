import { json } from '@sveltejs/kit';
import prisma from '$lib/prisma';
import type { RequestHandler } from './$types';
import { auth } from '$lib/auth';

// In-memory store for pending messages
// In a production app, you'd use Redis or another solution
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const messageQueues: Record<string, any[]> = {};

export const GET: RequestHandler = async ({ request, params }) => {
	try {
		const session = await auth.api.getSession({
			headers: request.headers
		});

		if (!session) {
			return json({ message: 'Unauthorized' }, { status: 401 });
		}

		const roomId = params.roomId;
		const userId = session.user.id;

		// Check if user is a participant
		const participant = await prisma.roomParticipant.findUnique({
			where: {
				roomId_userId: {
					roomId,
					userId
				}
			}
		});

		if (!participant) {
			return json({ message: 'You are not a participant in this room' }, { status: 404 });
		}

		// Set up SSE response
		const headers = new Headers({
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive'
		});

		const stream = new ReadableStream({
			start(controller) {
				// Initialize message queue for this user
				if (!messageQueues[userId]) {
					messageQueues[userId] = [];
				}

				const intervalId = setInterval(() => {
					if (messageQueues[userId] && messageQueues[userId].length > 0) {
						const message = messageQueues[userId].shift();
						const data = `data: ${JSON.stringify(message)}\n\n`;
						controller.enqueue(new TextEncoder().encode(data));
					}
				}, 100);

				// Clean up when connection closes
				request.signal.addEventListener('abort', () => {
					clearInterval(intervalId);
				});
			}
		});

		return new Response(stream, { headers });
	} catch (error) {
		console.error('Error in signaling:', error);
		return json({ message: 'Failed to establish signaling' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request, params }) => {
	try {
		const session = await auth.api.getSession({
			headers: request.headers
		});

		if (!session) {
			return json({ message: 'Unauthorized' }, { status: 401 });
		}

		const roomId = params.roomId;
		const userId = session.user.id;

		// Check if user is a participant
		const participant = await prisma.roomParticipant.findUnique({
			where: {
				roomId_userId: {
					roomId,
					userId
				}
			}
		});

		if (!participant) {
			return json({ message: 'You are not a participant in this room' }, { status: 404 });
		}

		const message = await request.json();

		// Validate message
		if (!message.to || !message.type) {
			return json({ message: 'Invalid signaling message' }, { status: 400 });
		}

		// Add sender info
		message.from = userId;

		// Queue message for recipient
		if (!messageQueues[message.to]) {
			messageQueues[message.to] = [];
		}
		messageQueues[message.to].push(message);

		return json({ success: true });
	} catch (error) {
		console.error('Error in signaling:', error);
		return json({ message: 'Failed to send signaling message' }, { status: 500 });
	}
};
