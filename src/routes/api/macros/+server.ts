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
				calories: macros_data.calories,
				protein: macros_data.proteins,
				carbs: macros_data.carbs,
				fat: macros_data.fat,
				userId: session.user.id,
				rawData: macros_data.rawData
			}
		});
		return new Response('Macro created', { status: 200 });
	} catch (e) {
		console.error(e);
		return new Response('Error creating macro', { status: 500 });
	}
}
