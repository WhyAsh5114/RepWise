import { auth } from '$lib/auth';
import prisma from '$lib/prisma';

export async function POST({ request }) {
	const { macros_data } = await request.json();

	const session = await auth.api.getSession({
		headers: request.headers
	});

	if (!session) {
		return new Response('Not logged in', { status: 401 });
	}

	try {
		await prisma.macros.create({
			data: {
				fat: macros_data.fat,
				userId: session.user.id,
				carbs: macros_data.carbs,
				rawData: macros_data.rawData,
				protein: macros_data.proteins,
				calories: macros_data.calories
			}
		});

		return new Response('Macro created', { status: 200 });
	} catch (e) {
		console.error(e);
		return new Response('Error creating macro', { status: 500 });
	}
}
