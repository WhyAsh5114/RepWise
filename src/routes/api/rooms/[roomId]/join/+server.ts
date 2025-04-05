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
				id: roomId,
				status: 'STARTING'
			}
		});

		if (!room) {
			return json({ message: 'Room not found or inactive' }, { status: 404 });
		}

		// Check if user is already a participant
		const existingParticipant = await prisma.roomParticipant.findUnique({
			where: {
				roomId_userId: {
					roomId,
					userId: session.user.id
				}
			}
		});

		if (existingParticipant) {
			if (existingParticipant.isActive) {
				return json({ message: 'You are already in this room' });
			} else {
				// Reactivate if previously inactive
				await prisma.roomParticipant.update({
					where: {
						id: existingParticipant.id
					},
					data: {
						isActive: true
					}
				});

				return json({ message: 'Rejoined room successfully' });
			}
		}

		// Create new participant
		await prisma.roomParticipant.create({
			data: {
				roomId,
				userId: session.user.id
			}
		});

		return json({ message: 'Joined room successfully' });
	} catch (error) {
		console.error('Error joining room:', error);
		return json({ message: 'Failed to join room' }, { status: 500 });
	}
};
