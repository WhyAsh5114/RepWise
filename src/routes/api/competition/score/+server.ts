import prisma from '$lib/prisma';
import { json } from '@sveltejs/kit';

export async function POST({ request }) {
  try {
    const { userId, roomId, score, reps } = await request.json();

    if (!userId || !roomId) {
      return json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await prisma.competitionScore.upsert({
      where: {
        userId_roomId: {
          userId,
          roomId,
        },
      },
      update: {
        score,
        reps,
      },
      create: {
        userId,
        roomId,
        score,
        reps,
      },
    });

    return json({ success: true, data: result });
  } catch (error) {
    console.error('Error updating competition score:', error);
    return json({ error: 'Failed to update score' }, { status: 500 });
  }
}
