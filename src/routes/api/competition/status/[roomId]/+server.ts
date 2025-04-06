import prisma from '$lib/prisma';
import { json } from '@sveltejs/kit';

export async function GET({ params }) {
  try {
    const { roomId } = params;
    
    if (!roomId) {
      return json({ error: 'Room ID is required' }, { status: 400 });
    }

    // Get competition status from database
    const room = await prisma.competitionRoom.findUnique({
      where: {
        id: roomId
      }
    });

    if (!room) {
      return json({ isActive: false, timeRemaining: 0 });
    }

    // Calculate remaining time
    let timeRemaining = 0;
    if (room.isActive && room.endTime) {
      const now = new Date();
      timeRemaining = Math.max(0, Math.floor((room.endTime.getTime() - now.getTime()) / 1000));
      
      // If time has expired, update the room status
      if (timeRemaining === 0 && room.isActive) {
        await prisma.competitionRoom.update({
          where: { id: roomId },
          data: { isActive: false }
        });
      }
    }

    return json({ 
      isActive: room.isActive && timeRemaining > 0, 
      timeRemaining,
      startTime: room.startTime,
      endTime: room.endTime
    });
  } catch (error) {
    console.error('Error fetching competition status:', error);
    return json({ error: 'Failed to fetch competition status' }, { status: 500 });
  }
}
