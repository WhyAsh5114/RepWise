import { auth } from '$lib/auth';
import prisma from '$lib/prisma';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, params }) => {
	try {
		const session = await auth.api.getSession({
			headers: request.headers
		});

		if (!session) {
			return json({ message: 'Unauthorized' }, { status: 401 });
		}

		const roomId = params.roomId;

		const room = await prisma.room.findUnique({
			where: {
				id: roomId
			}
		});

		if (!room) {
			return json({ message: 'Room not found' }, { status: 404 });
		}

		// Only room creator can start the room
		if (room.creatorId !== session.user.id) {
			return json({ message: 'Only room creator can start the room' }, { status: 403 });
		}

		await prisma.room.update({
			where: {
				id: roomId
			},
			data: {
				isActive: true
			}
		});

		return json({ message: 'Room started successfully' });
	} catch (error) {
		console.error('Error starting room:', error);
		return json({ message: 'Failed to start room' }, { status: 500 });
	}
};
