import { GEMINI_API_KEY } from '$env/static/private';
import { createWorkoutPlanFunctionDeclaration } from '$lib/toolspecs/fitness-planner';
import { GoogleGenAI } from '@google/genai';

export async function POST({ request }) {
	const userData = await request.json();
	
	const config = {
		tools: [
			{
				functionDeclarations: [createWorkoutPlanFunctionDeclaration]
			}
		]
	};

	// Configure the client
	const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

	// Define a simple user prompt
	const contents = [
		{
			role: 'user',
			parts: [
				{ 
					text: `Create a workout routine that fits my profile:
					
					I'm a ${userData.fitness_level || 'intermediate'} level fitness enthusiast, ${userData.age || 35} years old, 
					${userData.height || 175}cm tall, weighing ${userData.weight || 75}kg. 
					I can commit to working out ${userData.days_per_week || 4} days per week.
					${userData.injuries?.length ? `I have the following injuries to consider: ${userData.injuries.join(', ')}.` : ''}
					My main goals are ${userData.goals?.join(', ') || 'overall fitness and weight loss'}.
					
					Please create a complete, structured workout plan for me.`
				}
			]
		}
	];

	// Send request with function declarations
	const response = await ai.models.generateContent({
		model: 'gemini-2.0-flash',
		contents: contents,
		config: config
	});

	// Get the structured workout plan from the function call
	const workoutPlan = response.functionCalls?.at(0)?.args;

	return new Response(JSON.stringify({ 
		workoutPlan,
		fullResponse: response
	}), {
		status: 200,
		headers: {
			'Content-Type': 'application/json'
		}
	});
}
