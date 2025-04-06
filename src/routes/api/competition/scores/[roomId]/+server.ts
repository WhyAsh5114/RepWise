import prisma from '$lib/prisma';
import { json } from '@sveltejs/kit';

export async function GET({ params }) {
  try {
    const { roomId } = params;
    
    if (!roomId) {
      return json({ error: 'Room ID is required' }, { status: 400 });
    }

    const scores = await prisma.competitionScore.findMany({
      where: {
        roomId,
      },
      orderBy: {
        score: 'desc',
      },
    });

    return json({ scores });
  } catch (error) {
    console.error('Error fetching competition scores:', error);
    return json({ error: 'Failed to fetch scores' }, { status: 500 });
  }
}
