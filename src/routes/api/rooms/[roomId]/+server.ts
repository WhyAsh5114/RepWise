import { json } from '@sveltejs/kit';
import prisma from '$lib/prisma';
import type { RequestHandler } from './$types';
import { auth } from '$lib/auth';

export const GET: RequestHandler = async ({ request, params }) => {
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
				id: roomId,
				isActive: true
			},
			include: {
				creator: {
					select: {
						id: true,
						name: true,
						image: true
					}
				}
			}
		});

		if (!room) {
			return json({ message: 'Room not found' }, { status: 404 });
		}

		const participants = await prisma.roomParticipant.findMany({
			where: {
				roomId
			},
			include: {
				user: {
					select: {
						id: true,
						name: true,
						image: true
					}
				}
			},
			orderBy: {
				joinedAt: 'asc'
			}
		});

		return json({ room, participants });
	} catch (error) {
		console.error('Error fetching room details:', error);
		return json({ message: 'Failed to fetch room details' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ request, params }) => {
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

		if (room.creatorId !== session.user.id) {
			return json({ message: 'Only the room creator can delete this room' }, { status: 403 });
		}

		await prisma.room.update({
			where: {
				id: roomId
			},
			data: {
				isActive: false
			}
		});

		return json({ message: 'Room successfully deleted' });
	} catch (error) {
		console.error('Error deleting room:', error);
		return json({ message: 'Failed to delete room' }, { status: 500 });
	}
};
