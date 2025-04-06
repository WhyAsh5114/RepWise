import { auth } from '$lib/auth';
import prisma from '$lib/prisma';
import { json } from '@sveltejs/kit';

export async function GET({ request }) {
	const session = await auth.api.getSession({
		headers: request.headers
	});

	if (!session) {
		return new Response('Not logged in', { status: 401 });
	}

	try {
		const result = await prisma.macros.findMany({});

		if (!result) {
			return new Response('No macros found', { status: 404 });
		}
		return json(result);
	} catch (e) {
		console.error(e);
		return new Response('Error fetching macros data', { status: 500 });
	}
}

export async function POST({ request }) {
	const session = await auth.api.getSession({
		headers: request.headers
	});

	if (!session) {
		return new Response('Not logged in', { status: 401 });
	}

	const { macros_data } = await request.json();

	try {
		await prisma.macros.create({
			data: {
				calories: macros_data.calories,
				protein: macros_data.protein,
				carbs: macros_data.carbs,
				fat: macros_data.fat,
				userId: session.user.id,
				rawData: macros_data.rawData
			}
		});

		return new Response('Macros created', { status: 201 });
	} catch (e) {
		console.error(e);
		return new Response('Error creating macros data', { status: 500 });
	}
}
