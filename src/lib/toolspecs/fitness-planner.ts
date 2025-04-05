import { GoogleGenAI } from '@google/genai';
import { GEMINI_API_KEY } from '$env/static/private';
import type { UserData, ExerciseSet, WorkoutPlan, DailySchedule } from '$lib/workoutPlanTypes';

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const fitnessPlannerFunction = {
	name: 'generate_workout_plan',
	description: 'Generates a comprehensive workout plan for a user based on their fitness data.',
	parameters: {
		type: 'object' as const,
		properties: {
			userProfile: {
				type: 'object' as const,
				properties: {
					fitnessLevel: {
						type: 'string' as const,
						enum: ['beginner', 'intermediate', 'advanced'],
						description: "The user's current fitness level."
					},
					fitnessGoal: {
						type: 'string',
						description:
							"The user's primary fitness goal (e.g., weight loss, muscle gain, general fitness)."
					},
					age: {
						type: 'integer',
						description: "The user's age in years."
					},
					gender: {
						type: 'string',
						enum: ['male', 'female', 'other'],
						description: "The user's gender."
					},
					weight: {
						type: 'number',
						description: "The user's weight in kilograms."
					},
					height: {
						type: 'number',
						description: "The user's height in centimeters."
					},
					daysPerWeek: {
						type: 'integer',
						minimum: 1,
						maximum: 7,
						description: 'The number of days per week the user can dedicate to workouts.'
					},
					availableEquipment: {
						type: 'array',
						items: { type: 'string' },
						description: 'A list of equipment the user has access to.'
					},
					injuries: {
						type: 'string',
						description: 'Any current or past injuries the user has.'
					},
					workoutDuration: {
						type: 'integer',
						description: 'The preferred duration of each workout session in minutes.'
					},
					preferredExerciseTypes: {
						type: 'array',
						items: { type: 'string' },
						description: "The user's preferred types of exercise."
					}
				},
				required: [
					'fitnessLevel',
					'fitnessGoal',
					'age',
					'gender',
					'weight',
					'height',
					'daysPerWeek',
					'availableEquipment'
				]
			},
			summary: {
				type: 'string',
				description: 'A brief summary of the workout plan'
			},
			weeklySchedule: {
				type: 'array',
				items: {
					type: 'object',
					properties: {
						day: { type: 'string' },
						focus: { type: 'string' },
						warmup: { type: 'string' },
						mainSets: {
							type: 'array',
							items: {
								type: 'object',
								properties: {
									name: { type: 'string' },
									sets: { type: 'integer' },
									reps: { type: 'string' },
									rest: { type: 'string' }
								}
							}
						},
						cooldown: { type: 'string' }
					}
				},
				description: 'Daily workout schedule for each training day'
			},
			exercises: {
				type: 'array',
				items: {
					type: 'object',
					properties: {
						name: { type: 'string' }, // Ensure a 'name' field exists
						description: { type: 'string' },
						muscleGroups: {
							type: 'array',
							items: { type: 'string' }
						},
						difficulty: { type: 'string' },
						instructions: {
							type: 'array',
							items: { type: 'string' }
						},
						modifications: {
							type: 'object',
							properties: {
								easier: { type: 'string' },
								harder: { type: 'string' }
							}
						}
					},
					required: ['name', 'description', 'muscleGroups', 'difficulty']
				},
				description: 'Detailed information about each exercise in the plan'
			},
			nutritionTips: {
				type: 'array',
				items: { type: 'string' },
				description: 'Nutrition recommendations to complement the workout plan'
			},
			progressionPlan: {
				type: 'object',
				properties: {
					weeks1to4: { type: 'string' },
					weeks5to8: { type: 'string' },
					weeks9to12: { type: 'string' }
				},
				description: 'How to progress the workout plan over time'
			}
		},
		required: [
			'userProfile',
			'summary',
			'weeklySchedule',
			'exercises',
			'nutritionTips',
			'progressionPlan'
		]
	}
};

async function generateWorkoutPlanFromGemini(userData: UserData): Promise<WorkoutPlan> {
	try {
		const prompt = `Generate a personalized workout plan based on my fitness profile:
- Fitness Level: ${userData.fitnessLevel}
- Goal: ${userData.fitnessGoal}
- Age: ${userData.age}
- Gender: ${userData.gender}
- Weight: ${userData.weight} kg
- Height: ${userData.height} cm
- Available days per week: ${userData.daysPerWeek}
- Available equipment: ${userData.availableEquipment.join(', ')}
${userData.injuries ? `- Injuries: ${userData.injuries}` : ''}
${userData.workoutDuration ? `- Preferred workout duration: ${userData.workoutDuration} minutes` : ''}
${userData.preferredExerciseTypes ? `- Preferred exercise types: ${userData.preferredExerciseTypes.join(', ')}` : ''}

Please create a comprehensive workout plan with a weekly schedule, detailed exercise descriptions, proper progression, and nutrition tips.`;

		const result = await ai.models.generateContent({
			model: 'gemini-2.0-flash',
			contents: [{ role: 'user', parts: [{ text: prompt }] }],
			config: {
				tools: [
					{
						functionDeclarations: [fitnessPlannerFunction]
					}
				]
			}
		});

		if (!result.functionCalls || result.functionCalls.length === 0) {
			console.log('No function call found in the response.');
			console.log(result.text);
			throw new Error('No workout plan generated');
		}

		const functionCall = result.functionCalls[0]; // Assuming one function call
		console.log(`Function to call: ${functionCall.name}`);
		console.log(`Arguments: ${JSON.stringify(functionCall.args)}`);
		// In a real app, you would call your actual function here:
		// const result = await scheduleMeeting(functionCall.args);

		// validateWorkoutPlan(functionCall.args);

		// return workoutPlan;
	} catch (error) {
		console.error('Error generating workout plan:', error);
		throw new Error(
			`Failed to generate workout plan: ${error instanceof Error ? error.message : String(error)}`
		);
	}
}

function validateWorkoutPlan(plan: any): asserts plan is WorkoutPlan {
	if (
		!plan?.userProfile ||
		!plan?.summary ||
		!plan?.weeklySchedule ||
		!plan?.exercises ||
		!plan?.nutritionTips ||
		!plan?.progressionPlan
	) {
		throw new Error('Invalid workout plan structure: missing required properties');
	}

	if (
		!Array.isArray(plan.weeklySchedule) ||
		plan.weeklySchedule.length === 0 ||
		plan.weeklySchedule.length > 7
	) {
		throw new Error('Invalid weekly schedule: must have between 1-7 days');
	}

	const exercisesInSchedule = new Set<string>();
	plan.weeklySchedule.forEach((day: DailySchedule) => {
		day.mainSets.forEach((set: ExerciseSet) => {
			exercisesInSchedule.add(set.name);
		});
	});

	for (const exerciseName of exercisesInSchedule) {
		if (!plan.exercises[exerciseName]) {
			console.warn(
				`Warning: Exercise "${exerciseName}" used in schedule but not defined in exercises object`
			);
		}
	}

	return;
}

export { generateWorkoutPlanFromGemini, type WorkoutPlan, type UserData };
