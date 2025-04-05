import { json } from '@sveltejs/kit';
import prisma from '$lib/prisma';
import type { RequestHandler } from './$types';
import { auth } from '$lib/auth';

export const POST: RequestHandler = async ({ request, params }) => {
	try {
		const session = await auth.api.getSession({
			headers: request.headers
		});

		if (!session) {
			return json({ message: 'Unauthorized' }, { status: 401 });
		}

		const roomId = params.roomId;

		// Check if the user is the room creator
		const room = await prisma.room.findUnique({
			where: {
				id: roomId,
				status: 'STARTING'
			}
		});

		if (!room) {
			return json({ message: 'Room not found' }, { status: 404 });
		}

		if (room.creatorId !== session.user.id) {
			return json({ message: 'Only the room creator can start the competition' }, { status: 403 });
		}

		// Update room status to indicate competition has started
		await prisma.room.update({
			where: {
				id: roomId
			},
			data: {
				status: 'ACTIVE'
			}
		});

		return json({ message: 'Competition started successfully' });
	} catch (error) {
		console.error('Error starting competition:', error);
		return json({ message: 'Failed to start competition' }, { status: 500 });
	}
};
