// import { GoogleGenAI } from '@google/genai';
// import { GEMINI_API_KEY } from '$env/static/private';
// import { createWorkoutPlanFunctionDeclaration } from '$lib/toolspecs/fitness-planner';

export async function POST({ request }) {
	// const userData = await request.json();

	// const config = {
	// 	tools: [
	// 		{
	// 			functionDeclarations: [createWorkoutPlanFunctionDeclaration]
	// 		}
	// 	]
	// };

	// const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

	// const contents = [
	// 	{
	// 		role: 'user',
	// 		parts: [
	// 			{
	// 				text: `Create a workout routine that fits my profile:

	// 				I'm a ${userData.fitness_level || 'intermediate'} level fitness enthusiast, ${userData.age || 35} years old,
	// 				${userData.height || 175}cm tall, weighing ${userData.weight || 75}kg.
	// 				I can commit to working out ${userData.days_per_week || 4} days per week.
	// 				${userData.injuries?.length ? `I have the following injuries to consider: ${userData.injuries.join(', ')}.` : ''}
	// 				My main goals are ${userData.goals?.join(', ') || 'overall fitness and weight loss'}.

	// 				Please create a complete, structured workout plan for me.`
	// 			}
	// 		]
	// 	}
	// ];

	// const response = await ai.models.generateContent({
	// 	model: 'gemini-2.5-pro-exp-03-25',
	// 	contents: contents,
	// 	config: config
	// });

	// const workoutPlan = response.functionCalls?.at(0)?.args;

	// return new Response(
	// 	JSON.stringify({
	// 		workoutPlan,
	// 		fullResponse: response
	// 	}),
	// 	{
	// 		status: 200,
	// 		headers: {
	// 			'Content-Type': 'application/json'
	// 		}
	// 	}
	// );

	const sample_data = {
		workoutPlan: {
			days_per_week: 4,
			fitness_level: 'intermediate',
			general_guidelines:
				"**Warm-up:** Begin each workout with 5-10 minutes of light cardio (like jogging, cycling, or jumping jacks) followed by dynamic stretching (e.g., arm circles, leg swings, torso twists).\n**Cool-down:** Finish each session with 5-10 minutes of static stretching, holding each stretch for 20-30 seconds. Focus on the muscles worked during that session.\n**Progressive Overload:** Aim to gradually increase the challenge over time. This could mean increasing the weight, doing more reps/sets, or reducing rest time slightly.\n**Form:** Prioritize correct form over lifting heavy weight. Watch videos or consult reliable resources if unsure about proper technique.\n**Nutrition & Hydration:** Support your training with a balanced diet geared towards your weight loss goal (calorie deficit) and ensure adequate protein intake. Stay well-hydrated throughout the day.\n**Rest:** Listen to your body. Rest days are important for recovery and muscle growth. Ensure you're getting enough sleep.",
			weekly_schedule: [
				{
					focus: 'Upper Body Strength',
					cooldown: '5-10 minutes of static stretching (chest, back, shoulders, arms).',
					exercises: [
						{
							tips: 'Keep elbows slightly tucked, lower bar to mid-chest.',
							load: 'Moderate-Heavy',
							sets: 3,
							reps: '8-12',
							name: 'Barbell Bench Press',
							rest: '60-90 seconds'
						},
						{
							name: 'Bent-Over Rows',
							reps: '8-12',
							rest: '60-90 seconds',
							load: 'Moderate',
							tips: 'Maintain a flat back, pull towards your lower chest/upper abs.',
							sets: 3
						},
						{
							name: 'Overhead Press (Barbell or Dumbbell)',
							rest: '60-90 seconds',
							sets: 3,
							reps: '8-12',
							load: 'Moderate',
							tips: 'Engage core, press vertically, avoid excessive back arch.'
						},
						{
							load: 'Moderate',
							reps: '10-15',
							tips: 'Lead with the elbows, squeeze shoulder blades down and back.',
							name: 'Lat Pulldowns',
							rest: '60 seconds',
							sets: 3
						},
						{
							load: 'Moderate',
							name: 'Dumbbell Bicep Curls',
							reps: '10-15',
							rest: '60 seconds',
							sets: 3
						},
						{
							name: 'Triceps Pushdowns (Cable or Band)',
							load: 'Moderate',
							rest: '60 seconds',
							reps: '10-15',
							sets: 3
						}
					],
					day: 'Monday'
				},
				{
					exercises: [
						{
							rest: '90 seconds',
							sets: 3,
							reps: '8-12',
							load: 'Moderate-Heavy',
							name: 'Barbell Back Squats',
							tips: 'Keep chest up, back straight, push knees out, squat to parallel or below.'
						},
						{
							name: 'Romanian Deadlifts',
							load: 'Moderate',
							rest: '90 seconds',
							sets: 3,
							reps: '10-12',
							tips: 'Focus on hinging at hips, slight knee bend, feel stretch in hamstrings.'
						},
						{
							reps: '10-12 per leg',
							load: 'Moderate (dumbbells optional)',
							tips: 'Take controlled steps, keep front knee behind toes.',
							name: 'Walking Lunges',
							rest: '60-90 seconds',
							sets: 3
						},
						{
							rest: '60 seconds',
							reps: '12-15',
							sets: 3,
							name: 'Leg Press',
							load: 'Moderate'
						},
						{
							reps: 'Hold 45-60 seconds',
							tips: 'Maintain straight line from head to heels, engage core.',
							load: 'Bodyweight',
							name: 'Plank',
							sets: 3,
							rest: '60 seconds'
						},
						{
							reps: '12-15',
							tips: 'Control the movement, avoid swinging.',
							name: 'Hanging Leg Raises (or Lying Leg Raises)',
							load: 'Bodyweight',
							sets: 3,
							rest: '60 seconds'
						}
					],
					day: 'Tuesday',
					focus: 'Lower Body & Core Strength',
					cooldown: '5-10 minutes of static stretching (quads, hamstrings, glutes, calves, core).'
				},
				{
					cooldown: '5-10 minutes of full-body static stretching.',
					exercises: [
						{
							tips: 'Hold dumbbell/kettlebell vertically against chest.',
							name: 'Goblet Squats',
							rest: '60 seconds',
							reps: '12-15',
							load: 'Moderate',
							sets: 3
						},
						{
							rest: '60 seconds',
							name: 'Push-ups',
							tips: 'Modify on knees if needed. Maintain straight body line.',
							reps: 'As Many Reps As Possible (AMRAP)',
							sets: 3,
							load: 'Bodyweight'
						},
						{
							reps: '10-12 per arm',
							load: 'Moderate',
							rest: '60 seconds',
							tips: 'Support non-working arm on bench or knee.',
							name: 'Dumbbell Rows (Alternating)',
							sets: 3
						},
						{
							load: 'Moderate',
							rest: '60-90 seconds',
							sets: 3,
							name: 'Kettlebell Swings (or Dumbbell Swings)',
							tips: 'Focus on hip hinge, power comes from glutes/hamstrings.',
							reps: '15-20'
						},
						{
							load: 'Heavy dumbbells',
							rest: '60 seconds',
							tips: 'Keep core tight, tall posture, controlled steps.',
							name: "Farmer's Walk",
							reps: 'Walk 30-40 meters',
							sets: 3
						}
					],
					focus: 'Full Body Conditioning',
					day: 'Thursday'
				},
				{
					cooldown: '5-10 minutes of light stretching (legs, core, back).',
					focus: 'Cardio & Core',
					exercises: [
						{
							reps: '30-40 minutes',
							load: 'Steady Pace (e.g., Run, Cycle, Elliptical)',
							rest: 'N/A',
							sets: 1,
							name: 'Moderate Intensity Cardio',
							tips: 'Aim for Zone 2-3 heart rate, where you can talk but not sing.'
						},
						{
							load: 'Bodyweight or light weight',
							rest: '45-60 seconds',
							sets: 3,
							reps: '15-20 per side',
							name: 'Russian Twists'
						},
						{
							sets: 3,
							load: 'Bodyweight',
							reps: '20-30 (alternating)',
							name: 'Bicycle Crunches',
							rest: '45-60 seconds'
						},
						{
							load: 'Bodyweight',
							reps: '12-15',
							rest: '45-60 seconds',
							tips: 'Lift arms, chest, and legs simultaneously, focusing on lower back.',
							sets: 3,
							name: 'Superman'
						}
					],
					day: 'Friday'
				}
			],
			plan_name: 'Intermediate Fitness & Weight Loss Plan'
		},
		fullResponse: {
			candidates: [
				{
					content: {
						parts: [
							{
								text: 'Okay, I can definitely create a structured workout plan for you based on your profile and goals. This plan balances strength training and cardio to improve overall fitness and aid in weight loss, suitable for an intermediate level.\n\nHere is a 4-day per week plan:\n\n'
							},
							{
								functionCall: {
									name: 'create_workout_plan',
									args: {
										days_per_week: 4,
										fitness_level: 'intermediate',
										general_guidelines:
											"**Warm-up:** Begin each workout with 5-10 minutes of light cardio (like jogging, cycling, or jumping jacks) followed by dynamic stretching (e.g., arm circles, leg swings, torso twists).\n**Cool-down:** Finish each session with 5-10 minutes of static stretching, holding each stretch for 20-30 seconds. Focus on the muscles worked during that session.\n**Progressive Overload:** Aim to gradually increase the challenge over time. This could mean increasing the weight, doing more reps/sets, or reducing rest time slightly.\n**Form:** Prioritize correct form over lifting heavy weight. Watch videos or consult reliable resources if unsure about proper technique.\n**Nutrition & Hydration:** Support your training with a balanced diet geared towards your weight loss goal (calorie deficit) and ensure adequate protein intake. Stay well-hydrated throughout the day.\n**Rest:** Listen to your body. Rest days are important for recovery and muscle growth. Ensure you're getting enough sleep.",
										weekly_schedule: [
											{
												focus: 'Upper Body Strength',
												cooldown:
													'5-10 minutes of static stretching (chest, back, shoulders, arms).',
												exercises: [
													{
														tips: 'Keep elbows slightly tucked, lower bar to mid-chest.',
														load: 'Moderate-Heavy',
														sets: 3,
														reps: '8-12',
														name: 'Barbell Bench Press',
														rest: '60-90 seconds'
													},
													{
														name: 'Bent-Over Rows',
														reps: '8-12',
														rest: '60-90 seconds',
														load: 'Moderate',
														tips: 'Maintain a flat back, pull towards your lower chest/upper abs.',
														sets: 3
													},
													{
														name: 'Overhead Press (Barbell or Dumbbell)',
														rest: '60-90 seconds',
														sets: 3,
														reps: '8-12',
														load: 'Moderate',
														tips: 'Engage core, press vertically, avoid excessive back arch.'
													},
													{
														load: 'Moderate',
														reps: '10-15',
														tips: 'Lead with the elbows, squeeze shoulder blades down and back.',
														name: 'Lat Pulldowns',
														rest: '60 seconds',
														sets: 3
													},
													{
														load: 'Moderate',
														name: 'Dumbbell Bicep Curls',
														reps: '10-15',
														rest: '60 seconds',
														sets: 3
													},
													{
														name: 'Triceps Pushdowns (Cable or Band)',
														load: 'Moderate',
														rest: '60 seconds',
														reps: '10-15',
														sets: 3
													}
												],
												day: 'Monday'
											},
											{
												exercises: [
													{
														rest: '90 seconds',
														sets: 3,
														reps: '8-12',
														load: 'Moderate-Heavy',
														name: 'Barbell Back Squats',
														tips: 'Keep chest up, back straight, push knees out, squat to parallel or below.'
													},
													{
														name: 'Romanian Deadlifts',
														load: 'Moderate',
														rest: '90 seconds',
														sets: 3,
														reps: '10-12',
														tips: 'Focus on hinging at hips, slight knee bend, feel stretch in hamstrings.'
													},
													{
														reps: '10-12 per leg',
														load: 'Moderate (dumbbells optional)',
														tips: 'Take controlled steps, keep front knee behind toes.',
														name: 'Walking Lunges',
														rest: '60-90 seconds',
														sets: 3
													},
													{
														rest: '60 seconds',
														reps: '12-15',
														sets: 3,
														name: 'Leg Press',
														load: 'Moderate'
													},
													{
														reps: 'Hold 45-60 seconds',
														tips: 'Maintain straight line from head to heels, engage core.',
														load: 'Bodyweight',
														name: 'Plank',
														sets: 3,
														rest: '60 seconds'
													},
													{
														reps: '12-15',
														tips: 'Control the movement, avoid swinging.',
														name: 'Hanging Leg Raises (or Lying Leg Raises)',
														load: 'Bodyweight',
														sets: 3,
														rest: '60 seconds'
													}
												],
												day: 'Tuesday',
												focus: 'Lower Body & Core Strength',
												cooldown:
													'5-10 minutes of static stretching (quads, hamstrings, glutes, calves, core).'
											},
											{
												cooldown: '5-10 minutes of full-body static stretching.',
												exercises: [
													{
														tips: 'Hold dumbbell/kettlebell vertically against chest.',
														name: 'Goblet Squats',
														rest: '60 seconds',
														reps: '12-15',
														load: 'Moderate',
														sets: 3
													},
													{
														rest: '60 seconds',
														name: 'Push-ups',
														tips: 'Modify on knees if needed. Maintain straight body line.',
														reps: 'As Many Reps As Possible (AMRAP)',
														sets: 3,
														load: 'Bodyweight'
													},
													{
														reps: '10-12 per arm',
														load: 'Moderate',
														rest: '60 seconds',
														tips: 'Support non-working arm on bench or knee.',
														name: 'Dumbbell Rows (Alternating)',
														sets: 3
													},
													{
														load: 'Moderate',
														rest: '60-90 seconds',
														sets: 3,
														name: 'Kettlebell Swings (or Dumbbell Swings)',
														tips: 'Focus on hip hinge, power comes from glutes/hamstrings.',
														reps: '15-20'
													},
													{
														load: 'Heavy dumbbells',
														rest: '60 seconds',
														tips: 'Keep core tight, tall posture, controlled steps.',
														name: "Farmer's Walk",
														reps: 'Walk 30-40 meters',
														sets: 3
													}
												],
												focus: 'Full Body Conditioning',
												day: 'Thursday'
											},
											{
												cooldown: '5-10 minutes of light stretching (legs, core, back).',
												focus: 'Cardio & Core',
												exercises: [
													{
														reps: '30-40 minutes',
														load: 'Steady Pace (e.g., Run, Cycle, Elliptical)',
														rest: 'N/A',
														sets: 1,
														name: 'Moderate Intensity Cardio',
														tips: 'Aim for Zone 2-3 heart rate, where you can talk but not sing.'
													},
													{
														load: 'Bodyweight or light weight',
														rest: '45-60 seconds',
														sets: 3,
														reps: '15-20 per side',
														name: 'Russian Twists'
													},
													{
														sets: 3,
														load: 'Bodyweight',
														reps: '20-30 (alternating)',
														name: 'Bicycle Crunches',
														rest: '45-60 seconds'
													},
													{
														load: 'Bodyweight',
														reps: '12-15',
														rest: '45-60 seconds',
														tips: 'Lift arms, chest, and legs simultaneously, focusing on lower back.',
														sets: 3,
														name: 'Superman'
													}
												],
												day: 'Friday'
											}
										],
										plan_name: 'Intermediate Fitness & Weight Loss Plan'
									}
								}
							}
						],
						role: 'model'
					},
					finishReason: 'STOP',
					index: 0
				}
			],
			modelVersion: 'gemini-2.5-pro-exp-03-25',
			usageMetadata: {
				promptTokenCount: 558,
				candidatesTokenCount: 3896,
				totalTokenCount: 4454,
				promptTokensDetails: [
					{
						modality: 'TEXT',
						tokenCount: 558
					}
				],
				thoughtsTokenCount: 2221
			}
		}
	};

	return new Response(
		JSON.stringify({
			sample_data
		}),
		{
			status: 200,
			headers: {
				'Content-Type': 'application/json'
			}
		}
	);
}
