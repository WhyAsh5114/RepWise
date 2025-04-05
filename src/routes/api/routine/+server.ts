import { auth } from '$lib/auth';
import prisma from '$lib/prisma';

export async function POST({ request }: { request: Request }) {
	const session = await auth.api.getSession({
		headers: request.headers
	});

	if (!session) {
		return new Response('Unauthorized', {
			status: 403
		});
	}

	const { routine } = await request.json();

	try {
		await prisma.routines.create({
			data: {
				userId: session.user.id,
				reps: routine.reps,
				sets: routine.sets,
				load: routine.load,
				tips: routine.tips,
				rest: routine.rest,
				exerciseName: routine.exerciseName
			}
		});

		return new Response('Routine created', {
			status: 200
		});
	} catch (error) {
		return new Response(`$Error occured: ${error}`, { status: 500 });
	}
}
