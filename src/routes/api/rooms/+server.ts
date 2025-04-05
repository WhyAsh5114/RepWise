import { json } from '@sveltejs/kit';
import prisma from '$lib/prisma';
import type { RequestHandler } from './$types';
import { auth } from '$lib/auth';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const session = await auth.api.getSession({
			headers: request.headers
		});

		if (!session) {
			return json({ message: 'Unauthorized' }, { status: 401 });
		}

		const { name } = await request.json();

		const room = await prisma.room.create({
			data: {
				name: name || null,
				creatorId: session.user.id,
				participants: {
					create: {
						userId: session.user.id
					}
				}
			}
		});

		return json(room);
	} catch (error) {
		console.error('Error creating room:', error);
		return json({ message: 'Failed to create room' }, { status: 500 });
	}
};

export const GET: RequestHandler = async ({ request }) => {
	try {
		const session = await auth.api.getSession({
			headers: request.headers
		});

		if (!session) {
			return json({ message: 'Unauthorized' }, { status: 401 });
		}

		const rooms = await prisma.room.findMany({
			where: {
				participants: {
					some: {
						userId: session.user.id,
						isActive: true
					}
				},
				isActive: true
			},
			include: {
				creator: {
					select: {
						id: true,
						name: true,
						image: true
					}
				},
				_count: {
					select: {
						participants: true
					}
				}
			},
			orderBy: {
				createdAt: 'desc'
			}
		});

		return json({ rooms });
	} catch (error) {
		console.error('Error fetching rooms:', error);
		return json({ message: 'Failed to fetch rooms' }, { status: 500 });
	}
};
