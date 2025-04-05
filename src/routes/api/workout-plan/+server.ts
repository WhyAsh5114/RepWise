import { auth } from '$lib/auth';
import { json } from '@sveltejs/kit';
import { generateWorkoutPlanFromGemini } from '$lib/toolspecs/fitness-planner';

export async function POST({ request }) {
	try {
		const session = await auth.api.getSession({
			headers: request.headers
		});

		if (!session) {
			return new Response('Unauthorized', { status: 401 });
		}

		const userData = await request.json();

		const requiredFields = [
			'fitnessLevel',
			'fitnessGoal',
			'age',
			'gender',
			'weight',
			'height',
			'daysPerWeek',
			'availableEquipment'
		];

		const missingFields = requiredFields.filter((field) => !(field in userData));
		if (missingFields.length > 0) {
			return json(
				{
					error: `Missing required fields: ${missingFields.join(', ')}`
				},
				{ status: 400 }
			);
		}

		const workoutPlan = await generateWorkoutPlanFromGemini(userData);

		return json({
			success: true,
			plan: workoutPlan
		});
	} catch (error) {
		console.error('Error generating workout plan:', error);
		return json(
			{
				error: error instanceof Error ? error.message : 'Failed to generate workout plan'
			},
			{ status: 500 }
		);
	}
}
