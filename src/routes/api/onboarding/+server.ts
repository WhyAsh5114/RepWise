import { auth } from '$lib/auth';
import prisma from '$lib/prisma';
import { date } from 'zod';

export async function POST({ request }) {
	const { onboarding } = await request.json();

	const session = await auth.api.getSession({
		headers: request.headers
	});
	if (!session) {
		return new Response('Unauthorized', { status: 401 });
	}

	try {
		await prisma.onboarding.create({
			data: {
				age: onboarding.age,
				weight: onboarding.weight,
				height: onboarding.height,
				gender: onboarding.gender,
				injuries: onboarding.injuries,
				fitnessGoal: onboarding.fitnessGoal,
				daysPerWeek: onboarding.daysPerWeek,
				fitnessLevel: onboarding.fitnessLevel,
				availableEquipment: onboarding.availableEquipment,
				userId: session.user.id
			}
		});
		return new Response('Onboarding data saved successfully', { status: 200 });
	} catch (e) {
		return new Response('Error saving onboarding data', { status: 500 });
	}

	console.log(onboarding);
}
