import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GameState, Action, Direction } from './src/types';
import { createInitialState, applyAction } from './src/game/rules';

export interface RoomPlayer {
  id: string;
  name: string;
  avatar: string;
  playerIndex: number;
  isHost: boolean;
  connected: boolean;
}

export interface OnlineRoom {
  id: string;
  createdAt: number;
  hostId: string;
  playerCount: 2 | 3 | 4;
  players: RoomPlayer[];
  state: GameState;
  status: 'waiting' | 'playing' | 'finished';
}

const PORT = 3000;
const app = express();
app.use(express.json());

// In-memory room store
const rooms = new Map<string, OnlineRoom>();
const roomSubscribers = new Map<string, Set<Response>>();

const DEFAULT_SLOT_AVATARS = ['🐱', '🐶', '🐴', '🐮'];
const DEFAULT_SLOT_NAMES = ['小猫', '小狗', '小马', '小牛'];

function generateRoomId(): string {
  const chars = '23456789abcdefghjkmnpqrstuvwxyz';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function broadcastRoomUpdate(roomId: string, room: OnlineRoom | null) {
  const subs = roomSubscribers.get(roomId);
  if (subs && subs.size > 0) {
    const payload = `data: ${JSON.stringify(room ? { type: 'ROOM_UPDATE', room } : { type: 'ROOM_DISBANDED' })}\n\n`;
    for (const clientRes of Array.from(subs)) {
      try {
        clientRes.write(payload);
      } catch {
        subs.delete(clientRes);
      }
    }
  }
}

// 1. Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', activeRooms: rooms.size });
});

// 2. Create room
app.post('/api/rooms', (req: Request, res: Response) => {
  const playerCount = (req.body.playerCount || 2) as 2 | 3 | 4;
  const hostName = req.body.hostName || '小猫 (房主)';
  const hostAvatar = req.body.hostAvatar || '🐱';
  const playerId = req.body.playerId || 'user_' + Math.random().toString(36).substring(2, 9);

  let roomId = generateRoomId();
  while (rooms.has(roomId)) {
    roomId = generateRoomId();
  }

  const initialState = createInitialState(playerCount);
  const newRoom: OnlineRoom = {
    id: roomId,
    createdAt: Date.now(),
    hostId: playerId,
    playerCount,
    players: [
      {
        id: playerId,
        name: hostName,
        avatar: hostAvatar,
        playerIndex: 0,
        isHost: true,
        connected: true,
      },
    ],
    state: initialState,
    status: 'waiting',
  };

  rooms.set(roomId, newRoom);
  broadcastRoomUpdate(roomId, newRoom);

  res.json({ room: newRoom, playerIndex: 0 });
});

// 3. Get room
app.get('/api/rooms/:id', (req: Request, res: Response) => {
  const roomId = req.params.id.trim().toLowerCase();
  const room = rooms.get(roomId);
  if (!room) {
    return res.status(404).json({ error: '房间不存在或已解散' });
  }
  res.json({ room });
});

// 4. Join room
app.post('/api/rooms/:id/join', (req: Request, res: Response) => {
  const roomId = req.params.id.trim().toLowerCase();
  const room = rooms.get(roomId);
  if (!room) {
    return res.status(404).json({ error: '未找到该房间，请确认房间号是否输入正确' });
  }

  const playerId = req.body.playerId || 'user_' + Math.random().toString(36).substring(2, 9);
  const existingPlayer = room.players.find((p) => p.id === playerId);

  if (existingPlayer) {
    return res.json({ room, playerIndex: existingPlayer.playerIndex });
  }

  if (room.players.length >= room.playerCount) {
    return res.status(400).json({ error: '该房间玩家人数已满，无法加入' });
  }

  const nextIdx = room.players.length;
  const newPlayer: RoomPlayer = {
    id: playerId,
    name: req.body.playerName || DEFAULT_SLOT_NAMES[nextIdx] || `玩家${nextIdx + 1}`,
    avatar: req.body.playerAvatar || DEFAULT_SLOT_AVATARS[nextIdx] || '🐶',
    playerIndex: nextIdx,
    isHost: false,
    connected: true,
  };

  room.players.push(newPlayer);

  // If room is now full (e.g. 2/2), auto mark ready
  broadcastRoomUpdate(roomId, room);

  res.json({ room, playerIndex: nextIdx });
});

// 5. Start game in room
app.post('/api/rooms/:id/start', (req: Request, res: Response) => {
  const roomId = req.params.id.trim().toLowerCase();
  const room = rooms.get(roomId);
  if (!room) {
    return res.status(404).json({ error: '房间不存在' });
  }

  if (req.body.fillWithAi) {
    while (room.players.length < room.playerCount) {
      const idx = room.players.length;
      room.players.push({
        id: `ai_${idx}_${Math.random().toString(36).substring(2, 7)}`,
        name: `${DEFAULT_SLOT_NAMES[idx] || '玩家'} (AI)`,
        avatar: DEFAULT_SLOT_AVATARS[idx] || '🤖',
        playerIndex: idx,
        isHost: false,
        connected: true,
      });
    }
  }

  room.status = 'playing';
  room.state = createInitialState(room.playerCount);
  broadcastRoomUpdate(roomId, room);

  res.json({ room });
});

// 6. Action in room (Move or Wall)
app.post('/api/rooms/:id/action', (req: Request, res: Response) => {
  const roomId = req.params.id.trim().toLowerCase();
  const room = rooms.get(roomId);
  if (!room) {
    return res.status(404).json({ error: '房间不存在' });
  }

  const action = req.body.action as Action;
  if (!action) {
    return res.status(400).json({ error: '缺少操作内容' });
  }

  const nextState = applyAction(room.state, action);
  room.state = nextState;
  if (nextState.isOver) {
    room.status = 'finished';
  }

  broadcastRoomUpdate(roomId, room);
  res.json({ room });
});

// 7. Reset game in room
app.post('/api/rooms/:id/reset', (req: Request, res: Response) => {
  const roomId = req.params.id.trim().toLowerCase();
  const room = rooms.get(roomId);
  if (!room) {
    return res.status(404).json({ error: '房间不存在' });
  }

  room.state = createInitialState(room.playerCount);
  room.status = 'playing';
  broadcastRoomUpdate(roomId, room);

  res.json({ room });
});

// 8. Leave or disband room
app.post('/api/rooms/:id/leave', (req: Request, res: Response) => {
  const roomId = req.params.id.trim().toLowerCase();
  const room = rooms.get(roomId);
  if (!room) {
    return res.json({ disbanded: true });
  }

  const playerId = req.body.playerId;
  if (room.hostId === playerId) {
    rooms.delete(roomId);
    broadcastRoomUpdate(roomId, null);
    return res.json({ disbanded: true });
  } else {
    room.players = room.players.filter((p) => p.id !== playerId);
    room.players.forEach((p, idx) => {
      p.playerIndex = idx;
    });
    broadcastRoomUpdate(roomId, room);
    return res.json({ disbanded: false, room });
  }
});

// 9. Real-time Server-Sent Events (SSE) stream
app.get('/api/rooms/:id/events', (req: Request, res: Response) => {
  const roomId = req.params.id.trim().toLowerCase();
  const room = rooms.get(roomId);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  if (!roomSubscribers.has(roomId)) {
    roomSubscribers.set(roomId, new Set());
  }
  const subs = roomSubscribers.get(roomId)!;
  subs.add(res);

  // Send current state immediately
  if (room) {
    res.write(`data: ${JSON.stringify({ type: 'ROOM_UPDATE', room })}\n\n`);
  } else {
    res.write(`data: ${JSON.stringify({ type: 'ROOM_DISBANDED' })}\n\n`);
  }

  // Heartbeat to keep connection alive
  const heartbeat = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(heartbeat);
      subs.delete(res);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    subs.delete(res);
  });
});

// Vite middleware for development and static fallback for production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Quoridor server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
