import { auth } from '$lib/auth';
import prisma from '$lib/prisma';

export async function POST({ request }) {
	const body = (await request.json()) as {
		heartRate: number;
		timestamp: EpochTimeStamp;
		userId: string;
	};

	const session = await auth.api.getSession({
		headers: request.headers
	});

	if (!session) {
		return new Response('Unauthorized', { status: 401 });
	}

	await prisma.heartRate.create({
		data: {
			userId: session?.user.id,
			heartRate: body.heartRate,
			timestamp: new Date(body.timestamp)
		}
	});

	return new Response('Data added successfully', { status: 200 });
}
