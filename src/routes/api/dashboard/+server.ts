import { auth } from '$lib/auth';
import prisma from '$lib/prisma';
import { json } from '@sveltejs/kit';

export async function GET({ request }) {
	const session = await auth.api.getSession({
		headers: request.headers
	});

	if (!session) {
		return new Response('Unauthorized', { status: 401 });
	}

	try {
		const onboardingData = await prisma.onboarding.findFirst({
			where: {
				userId: session.user.id
			},
			select: {
				age: true,
				weight: true,
				height: true,
				gender: true,
				injuries: true,
				fitnessGoal: true,
				daysPerWeek: true,
				fitnessLevel: true,
				availableEquipment: true
			}
		});

		return json(onboardingData);
	} catch (error) {
		return new Response('Error fetching dashboard data', { status: 500 });
	}
}
