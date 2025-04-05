import { Type } from '@google/genai';

// Define a function that the model can call to output a structured workout plan
export const createWorkoutPlanFunctionDeclaration = {
	name: 'create_workout_plan',
	description: 'Outputs a structured workout routine with specific days, exercises, and details.',
	parameters: {
		type: Type.OBJECT,
		properties: {
			plan_name: {
				type: Type.STRING,
				description: 'Name of the workout plan'
			},
			fitness_level: {
				type: Type.STRING,
				enum: ['beginner', 'intermediate', 'advanced'],
				description: 'Fitness level this plan is designed for'
			},
			days_per_week: {
				type: Type.INTEGER,
				description: 'Number of training days in this plan'
			},
			weekly_schedule: {
				type: Type.ARRAY,
				description: 'Detailed breakdown of each training day in the week',
				items: {
					type: Type.OBJECT,
					properties: {
						day: {
							type: Type.STRING,
							description: 'Day of the week (e.g., Monday, Tuesday)'
						},
						focus: {
							type: Type.STRING,
							description: 'Main focus of this workout day (e.g., "Upper Body", "Lower Body", "Cardio")'
						},
						exercises: {
							type: Type.ARRAY,
							description: 'List of exercises for this workout day',
							items: {
								type: Type.OBJECT,
								properties: {
									name: {
										type: Type.STRING,
										description: 'Name of the exercise'
									},
									sets: {
										type: Type.INTEGER,
										description: 'Number of sets to perform'
									},
									reps: {
										type: Type.STRING,
										description: 'Number of repetitions per set (can be a range like "8-12")'
									},
									load: {
										type: Type.STRING,
										description: 'Recommended load/weight guidance (e.g., "moderate", "70% 1RM")'
									},
									rest: {
										type: Type.STRING,
										description: 'Rest period between sets (e.g., "60-90 seconds")'
									},
									tips: {
										type: Type.STRING,
										description: 'Form tips or other advice for this exercise'
									}
								},
								required: ['name', 'sets', 'reps']
							}
						},
						cooldown: {
							type: Type.STRING,
							description: 'Recommended cooldown activities'
						}
					},
					required: ['day', 'focus', 'exercises']
				}
			},
			general_guidelines: {
				type: Type.STRING,
				description: 'Overall guidance and recommendations for following this plan'
			}
		},
		required: ['plan_name', 'fitness_level', 'days_per_week', 'weekly_schedule']
	}
};
