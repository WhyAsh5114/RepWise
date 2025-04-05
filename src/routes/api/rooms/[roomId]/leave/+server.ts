import { json } from '@sveltejs/kit';
import prisma from '$lib/prisma';
import type { RequestHandler } from './$types';
import { auth } from '$lib/auth';

export const POST: RequestHandler = async ({ request, params }) => {
	try {
		const session = await auth.api.getSession({ headers: request.headers });

		if (!session) {
			return json({ message: 'Unauthorized' }, { status: 401 });
		}

		const roomId = params.roomId;

		const participant = await prisma.roomParticipant.findUnique({
			where: {
				roomId_userId: {
					roomId,
					userId: session.user.id
				}
			}
		});

		if (!participant) {
			return json({ message: 'You are not a participant in this room' }, { status: 404 });
		}

		// Check if user is the creator
		const room = await prisma.room.findUnique({
			where: {
				id: roomId
			}
		});

		if (room?.creatorId === session.user.id) {
			// If creator is leaving, mark the room as inactive
			await prisma.room.update({
				where: {
					id: roomId
				},
				data: {
					isActive: false
				}
			});

			// Mark all participants as inactive
			await prisma.roomParticipant.updateMany({
				where: {
					roomId
				},
				data: {
					isActive: false
				}
			});

			return json({ message: 'Room closed successfully' });
		} else {
			// Just mark this participant as inactive
			await prisma.roomParticipant.update({
				where: {
					id: participant.id
				},
				data: {
					isActive: false
				}
			});

			return json({ message: 'Left room successfully' });
		}
	} catch (error) {
		console.error('Error leaving room:', error);
		return json({ message: 'Failed to leave room' }, { status: 500 });
	}
};
