import prisma from '$lib/prisma';
import { json } from '@sveltejs/kit';

// Store competition status
export async function POST({ request }) {
  try {
    const { roomId, isActive, startTime, duration } = await request.json();

    if (!roomId) {
      return json({ error: 'Room ID is required' }, { status: 400 });
    }

    // Calculate end time
    const endTime = new Date(new Date(startTime).getTime() + duration * 1000);

    // Update or create competition status
    const result = await prisma.competitionRoom.upsert({
      where: {
        id: roomId
      },
      update: {
        isActive,
        startTime: new Date(startTime),
        endTime: endTime
      },
      create: {
        id: roomId,
        isActive,
        startTime: new Date(startTime),
        endTime: endTime
      }
    });

    return json({ success: true, data: result });
  } catch (error) {
    console.error('Error updating competition status:', error);
    return json({ error: 'Failed to update competition status' }, { status: 500 });
  }
}
