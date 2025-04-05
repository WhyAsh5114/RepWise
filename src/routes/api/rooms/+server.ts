import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

type Room = {
  id: string;
  users: number[];
};

const rooms = new Map<string, Room>();

export const POST: RequestHandler = async ({ request }) => {
  const roomId = Math.random().toString(36).substring(7);
  rooms.set(roomId, { id: roomId, users: [] });
  return json({ roomId });
};

export const GET: RequestHandler = async () => {
  return json(Array.from(rooms.values()));
};
