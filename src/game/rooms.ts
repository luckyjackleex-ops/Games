import { GameState, Action } from '../types';
import { createInitialState, applyAction } from './rules';

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

export interface RecentRoomItem {
  id: string;
  hostName: string;
  playerCount: 2 | 3 | 4;
  visitedAt: number;
}

const STORAGE_ROOMS_KEY = 'quoridor_rooms_v1';
const STORAGE_RECENT_KEY = 'quoridor_recent_rooms_v1';
const STORAGE_PLAYER_ID = 'quoridor_my_player_id';

// Stable unique ID for this browser tab/session
export function getMyPlayerId(): string {
  let id = localStorage.getItem(STORAGE_PLAYER_ID);
  if (!id) {
    id = 'user_' + Math.random().toString(36).substring(2, 9);
    localStorage.setItem(STORAGE_PLAYER_ID, id);
  }
  return id;
}

// Generate friendly 4-character room code like "7ofz", "tr77"
export function generateRoomId(): string {
  const chars = '23456789abcdefghjkmnpqrstuvwxyz';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Load all saved rooms from localStorage
function getAllRooms(): Record<string, OnlineRoom> {
  try {
    const raw = localStorage.getItem(STORAGE_ROOMS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// Save rooms map
function saveAllRooms(rooms: Record<string, OnlineRoom>) {
  try {
    localStorage.setItem(STORAGE_ROOMS_KEY, JSON.stringify(rooms));
  } catch (err) {
    console.warn('Failed to save rooms to storage', err);
  }
}

// Broadcast an event across tabs
function broadcastRoomUpdate(roomId: string, room: OnlineRoom) {
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(`quoridor_room_${roomId}`);
      channel.postMessage({ type: 'ROOM_UPDATE', room });
      channel.close();
    }
  } catch {
    // fallback to storage event
  }
}

// Create a new room
export function createOnlineRoom(
  playerCount: 2 | 3 | 4 = 2,
  hostName = '小猫 (房主)',
  hostAvatar = '🐱'
): OnlineRoom {
  const id = generateRoomId();
  const hostId = getMyPlayerId();
  const initialState = createInitialState(playerCount);

  const newRoom: OnlineRoom = {
    id,
    createdAt: Date.now(),
    hostId,
    playerCount,
    players: [
      {
        id: hostId,
        name: hostName,
        avatar: hostAvatar,
        playerIndex: 0,
        isHost: true,
        connected: true,
      },
    ],
    state: initialState,
    status: 'waiting', // Wait in lobby for friends to enter room ID
  };

  const rooms = getAllRooms();
  rooms[id] = newRoom;
  saveAllRooms(rooms);
  addRecentRoom(id, hostName, playerCount);
  broadcastRoomUpdate(id, newRoom);

  return newRoom;
}

// Get room by ID
export function getOnlineRoom(roomId: string): OnlineRoom | null {
  const normId = roomId.trim().toLowerCase();
  const rooms = getAllRooms();
  if (rooms[normId]) {
    return rooms[normId];
  }

  // If user searched for default sample room "tr77", bootstrap it
  if (normId === 'tr77') {
    const sampleRoom: OnlineRoom = {
      id: 'tr77',
      createdAt: Date.now() - 60000,
      hostId: 'sample_host',
      playerCount: 4,
      players: [
        { id: 'sample_host', name: '小猫 (房主)', avatar: '🐱', playerIndex: 0, isHost: true, connected: true },
        { id: 'p2', name: '小狗', avatar: '🐶', playerIndex: 1, isHost: false, connected: true },
        { id: 'p3', name: '小马', avatar: '🐴', playerIndex: 2, isHost: false, connected: true },
        { id: 'p4', name: '小牛', avatar: '🐮', playerIndex: 3, isHost: false, connected: true },
      ],
      state: createInitialState(4),
      status: 'playing',
    };
    rooms['tr77'] = sampleRoom;
    saveAllRooms(rooms);
    return sampleRoom;
  }

  return null;
}

const DEFAULT_SLOT_AVATARS = ['🐱', '🐶', '🐴', '🐮'];
const DEFAULT_SLOT_NAMES = ['小猫', '小狗', '小马', '小牛'];

// Join an existing room
export function joinOnlineRoom(
  roomId: string,
  playerName?: string,
  playerAvatar?: string
): { room: OnlineRoom | null; error?: string; playerIndex: number } {
  const normId = roomId.trim().toLowerCase();
  const room = getOnlineRoom(normId);

  if (!room) {
    return { room: null, error: '房间不存在或已解散', playerIndex: -1 };
  }

  const myId = getMyPlayerId();
  const existingPlayer = room.players.find((p) => p.id === myId);

  if (existingPlayer) {
    addRecentRoom(room.id, room.players[0]?.name || '小猫 (房主)', room.playerCount);
    return { room, playerIndex: existingPlayer.playerIndex };
  }

  // Assign next available player slot
  if (room.players.length >= room.playerCount) {
    // As spectator or fallback
    addRecentRoom(room.id, room.players[0]?.name || '小猫 (房主)', room.playerCount);
    return { room, playerIndex: 0 };
  }

  const nextIdx = room.players.length;
  const newPlayer: RoomPlayer = {
    id: myId,
    name: playerName || DEFAULT_SLOT_NAMES[nextIdx] || `玩家${nextIdx + 1}`,
    avatar: playerAvatar || DEFAULT_SLOT_AVATARS[nextIdx] || '🐶',
    playerIndex: nextIdx,
    isHost: false,
    connected: true,
  };

  room.players.push(newPlayer);
  const rooms = getAllRooms();
  rooms[normId] = room;
  saveAllRooms(rooms);
  addRecentRoom(room.id, room.players[0]?.name || '小猫 (房主)', room.playerCount);
  broadcastRoomUpdate(room.id, room);

  return { room, playerIndex: nextIdx };
}

// Host starts the game from waiting lobby
export function startOnlineRoom(roomId: string, fillWithAi = false): OnlineRoom | null {
  const normId = roomId.trim().toLowerCase();
  const rooms = getAllRooms();
  const room = rooms[normId];
  if (!room) return null;

  if (fillWithAi) {
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
  rooms[normId] = room;
  saveAllRooms(rooms);
  broadcastRoomUpdate(room.id, room);

  return room;
}

// Player leaves room
export function leaveOnlineRoom(roomId: string): { disbanded: boolean } {
  const normId = roomId.trim().toLowerCase();
  const rooms = getAllRooms();
  const room = rooms[normId];
  if (!room) return { disbanded: true };

  const myId = getMyPlayerId();
  if (room.hostId === myId) {
    delete rooms[normId];
    saveAllRooms(rooms);
    broadcastRoomUpdate(normId, { ...room, status: 'finished', players: [] });
    return { disbanded: true };
  } else {
    room.players = room.players.filter((p) => p.id !== myId);
    room.players.forEach((p, idx) => {
      p.playerIndex = idx;
    });
    rooms[normId] = room;
    saveAllRooms(rooms);
    broadcastRoomUpdate(room.id, room);
    return { disbanded: false };
  }
}

// Apply an action to the room state
export function applyOnlineRoomAction(roomId: string, action: Action): OnlineRoom | null {
  const normId = roomId.trim().toLowerCase();
  const room = getOnlineRoom(normId);
  if (!room) return null;

  const nextState = applyAction(room.state, action);
  room.state = nextState;
  if (nextState.isOver) {
    room.status = 'finished';
  }

  const rooms = getAllRooms();
  rooms[normId] = room;
  saveAllRooms(rooms);
  broadcastRoomUpdate(room.id, room);

  return room;
}

// Reset room game
export function resetOnlineRoom(roomId: string): OnlineRoom | null {
  const normId = roomId.trim().toLowerCase();
  const room = getOnlineRoom(normId);
  if (!room) return null;

  room.state = createInitialState(room.playerCount);
  room.status = 'playing';

  const rooms = getAllRooms();
  rooms[normId] = room;
  saveAllRooms(rooms);
  broadcastRoomUpdate(room.id, room);

  return room;
}

// Subscribe to room updates (for multi-tab / real-time sync)
export function subscribeToRoom(roomId: string, onUpdate: (room: OnlineRoom) => void): () => void {
  const normId = roomId.trim().toLowerCase();

  let channel: BroadcastChannel | null = null;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(`quoridor_room_${normId}`);
      channel.onmessage = (event) => {
        if (event.data?.type === 'ROOM_UPDATE' && event.data.room?.id === normId) {
          onUpdate(event.data.room);
        }
      };
    }
  } catch {
    // fallback to storage event
  }

  const storageHandler = (e: StorageEvent) => {
    if (e.key === STORAGE_ROOMS_KEY && e.newValue) {
      try {
        const rooms = JSON.parse(e.newValue);
        if (rooms[normId]) {
          onUpdate(rooms[normId]);
        }
      } catch {
        // ignore parse error
      }
    }
  };

  window.addEventListener('storage', storageHandler);

  return () => {
    if (channel) {
      channel.close();
    }
    window.removeEventListener('storage', storageHandler);
  };
}

// Recent Rooms management
export function getRecentRooms(): RecentRoomItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_RECENT_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }

  // Default initial sample matching screenshot
  return [
    {
      id: 'tr77',
      hostName: '房主',
      playerCount: 4,
      visitedAt: Date.now() - 30000,
    },
  ];
}

export function addRecentRoom(id: string, hostName: string, playerCount: 2 | 3 | 4) {
  try {
    const recents = getRecentRooms().filter((r) => r.id !== id);
    recents.unshift({
      id,
      hostName,
      playerCount,
      visitedAt: Date.now(),
    });
    // Keep at most 6 recent rooms
    localStorage.setItem(STORAGE_RECENT_KEY, JSON.stringify(recents.slice(0, 6)));
  } catch {
    // ignore
  }
}

// Format relative time (刚刚, X分钟前, 昨天等)
export function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  return '昨天';
}
