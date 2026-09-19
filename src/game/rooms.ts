import { GameState, Action } from '../types';
import { createInitialState } from './rules';

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

const STORAGE_RECENT_KEY = 'quoridor_recent_rooms_v2';
const STORAGE_PLAYER_ID = 'quoridor_tab_player_id_v2';

// Stable unique ID per browser tab (using sessionStorage so multiple tabs get different players)
export function getMyPlayerId(): string {
  try {
    let id = sessionStorage.getItem(STORAGE_PLAYER_ID);
    if (!id) {
      id = 'user_' + Math.random().toString(36).substring(2, 9);
      sessionStorage.setItem(STORAGE_PLAYER_ID, id);
    }
    return id;
  } catch {
    return 'user_' + Math.random().toString(36).substring(2, 9);
  }
}

// 1. Create a new room on the server
export async function createOnlineRoom(
  playerCount: 2 | 3 | 4 = 2,
  hostName = '小猫 (房主)',
  hostAvatar = '🐱'
): Promise<OnlineRoom> {
  const playerId = getMyPlayerId();

  try {
    const res = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerCount,
        hostName,
        hostAvatar,
        playerId,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      addRecentRoom(data.room.id, hostName, playerCount);
      return data.room;
    }
  } catch (err) {
    console.warn('Server createRoom failed, fallback to local', err);
  }

  // Fallback to local offline state if server is not reachable
  const fallbackRoom: OnlineRoom = {
    id: 'local_' + Math.random().toString(36).substring(2, 6),
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
    state: createInitialState(playerCount),
    status: 'waiting',
  };
  addRecentRoom(fallbackRoom.id, hostName, playerCount);
  return fallbackRoom;
}

// 2. Fetch room details from server
export async function getOnlineRoom(roomId: string): Promise<OnlineRoom | null> {
  const normId = roomId.trim().toLowerCase();
  try {
    const res = await fetch(`/api/rooms/${encodeURIComponent(normId)}`);
    if (res.ok) {
      const data = await res.json();
      return data.room;
    }
  } catch (err) {
    console.warn('Failed to fetch room from server', err);
  }
  return null;
}

// 3. Join an existing room
export async function joinOnlineRoom(
  roomId: string,
  playerName?: string,
  playerAvatar?: string
): Promise<{ room: OnlineRoom | null; error?: string; playerIndex: number }> {
  const normId = roomId.trim().toLowerCase();
  const playerId = getMyPlayerId();

  try {
    const res = await fetch(`/api/rooms/${encodeURIComponent(normId)}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerId,
        playerName,
        playerAvatar,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { room: null, error: data.error || '无法加入房间', playerIndex: -1 };
    }

    addRecentRoom(data.room.id, data.room.players[0]?.name || '房主', data.room.playerCount);
    return { room: data.room, playerIndex: data.playerIndex };
  } catch (err) {
    console.error('joinOnlineRoom network error:', err);
    return { room: null, error: '网络连接异常，请重试', playerIndex: -1 };
  }
}

// 4. Host starts the game from waiting lobby
export async function startOnlineRoom(roomId: string, fillWithAi = false): Promise<OnlineRoom | null> {
  const normId = roomId.trim().toLowerCase();
  const playerId = getMyPlayerId();

  try {
    const res = await fetch(`/api/rooms/${encodeURIComponent(normId)}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fillWithAi, playerId }),
    });

    if (res.ok) {
      const data = await res.json();
      return data.room;
    }
  } catch (err) {
    console.warn('startOnlineRoom failed', err);
  }
  return null;
}

// 5. Player leaves room
export async function leaveOnlineRoom(roomId: string): Promise<{ disbanded: boolean }> {
  const normId = roomId.trim().toLowerCase();
  const playerId = getMyPlayerId();

  try {
    const res = await fetch(`/api/rooms/${encodeURIComponent(normId)}/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId }),
    });

    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('leaveOnlineRoom failed', err);
  }
  return { disbanded: true };
}

// 6. Apply an action to the room state
export async function applyOnlineRoomAction(roomId: string, action: Action): Promise<OnlineRoom | null> {
  const normId = roomId.trim().toLowerCase();
  const playerId = getMyPlayerId();

  try {
    const res = await fetch(`/api/rooms/${encodeURIComponent(normId)}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, playerId }),
    });

    if (res.ok) {
      const data = await res.json();
      return data.room;
    }
  } catch (err) {
    console.warn('applyOnlineRoomAction failed', err);
  }
  return null;
}

// 7. Reset room game
export async function resetOnlineRoom(roomId: string): Promise<OnlineRoom | null> {
  const normId = roomId.trim().toLowerCase();
  const playerId = getMyPlayerId();

  try {
    const res = await fetch(`/api/rooms/${encodeURIComponent(normId)}/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId }),
    });

    if (res.ok) {
      const data = await res.json();
      return data.room;
    }
  } catch (err) {
    console.warn('resetOnlineRoom failed', err);
  }
  return null;
}

// 8. Subscribe to room updates (SSE with polling backup)
export function subscribeToRoom(
  roomId: string,
  onUpdate: (room: OnlineRoom) => void,
  onDisbanded?: () => void
): () => void {
  const normId = roomId.trim().toLowerCase();
  let eventSource: EventSource | null = null;
  let pollingTimer: number | null = null;
  let isClosed = false;

  // Function to poll the server for room updates
  const pollServer = async () => {
    if (isClosed) return;
    try {
      const room = await getOnlineRoom(normId);
      if (room && !isClosed) {
        onUpdate(room);
      } else if (!room && !isClosed) {
        onDisbanded?.();
      }
    } catch {
      // ignore transient poll error
    }
  };

  // Setup Server-Sent Events (SSE)
  if (typeof EventSource !== 'undefined') {
    try {
      eventSource = new EventSource(`/api/rooms/${encodeURIComponent(normId)}/events`);
      eventSource.onmessage = (event) => {
        if (isClosed) return;
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'ROOM_UPDATE' && data.room) {
            onUpdate(data.room);
          } else if (data.type === 'ROOM_DISBANDED') {
            onDisbanded?.();
          }
        } catch {
          // ignore parse error
        }
      };
      eventSource.onerror = () => {
        // SSE temporary reconnecting or error; polling will cover updates
      };
    } catch (e) {
      console.warn('EventSource initialization failed, using polling fallback', e);
    }
  }

  // Backup polling every 1200ms
  pollingTimer = window.setInterval(pollServer, 1200);

  // Return unsubscribe callback
  return () => {
    isClosed = true;
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    if (pollingTimer) {
      clearInterval(pollingTimer);
      pollingTimer = null;
    }
  };
}

// 9. Recent Rooms management
export function getRecentRooms(): RecentRoomItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_RECENT_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }
  return [];
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
    localStorage.setItem(STORAGE_RECENT_KEY, JSON.stringify(recents.slice(0, 6)));
  } catch {
    // ignore
  }
}

export function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  return '昨天';
}
