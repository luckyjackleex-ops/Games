import { GameState, Action } from '../types';
import { createInitialState } from './rules';
import { p2pManager } from './p2p';

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

// Clean 4-character room codes (e.g. "8m2x", excluding confusing chars like 0, 1, l, o)
export function generateCleanRoomId(): string {
  const chars = '23456789abcdefghjkmnpqrstuvwxyz';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

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

// Fast fetch with timeout to detect server availability without hanging
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 2500): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return response;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

// 1. Create a new room (Server-first with P2P/Netlify-ready fallback)
export async function createOnlineRoom(
  playerCount: 2 | 3 | 4 = 2,
  hostName = '小猫 (房主)',
  hostAvatar = '🐱'
): Promise<OnlineRoom> {
  const playerId = getMyPlayerId();

  // Try Server API first
  try {
    const res = await fetchWithTimeout('/api/rooms', {
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
      if (data && data.room) {
        addRecentRoom(data.room.id, hostName, playerCount);
        return data.room;
      }
    }
  } catch {
    // Server not available (e.g. static hosting on Netlify)
  }

  // Netlify / Static / Offline P2P Mode
  const roomId = generateCleanRoomId();
  const fallbackRoom: OnlineRoom = {
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
    state: createInitialState(playerCount),
    status: 'waiting',
  };

  // Save in local storage and start P2P Host
  try {
    localStorage.setItem('quoridor_room_' + roomId.toLowerCase(), JSON.stringify(fallbackRoom));
  } catch {}

  addRecentRoom(fallbackRoom.id, hostName, playerCount);
  return fallbackRoom;
}

// 2. Fetch room details (Server-first with P2P/Netlify storage fallback)
export async function getOnlineRoom(roomId: string): Promise<OnlineRoom | null> {
  const normId = roomId.trim().toLowerCase();

  try {
    const res = await fetchWithTimeout(`/api/rooms/${encodeURIComponent(normId)}`, {}, 1800);
    if (res.ok) {
      const data = await res.json();
      if (data && data.room) {
        return data.room;
      }
    }
  } catch {
    // Server not available or 404
  }

  // Fallback to P2P local storage
  return p2pManager.getLocalRoom(normId);
}

// 3. Join an existing room (Server-first with WebRTC P2P fallback)
export async function joinOnlineRoom(
  roomId: string,
  playerName?: string,
  playerAvatar?: string
): Promise<{ room: OnlineRoom | null; error?: string; playerIndex: number }> {
  const normId = roomId.trim().toLowerCase();
  const playerId = getMyPlayerId();

  // Try Server API first
  try {
    const res = await fetchWithTimeout(
      `/api/rooms/${encodeURIComponent(normId)}/join`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId,
          playerName,
          playerAvatar,
        }),
      },
      2500
    );

    if (res.ok) {
      const data = await res.json();
      if (data && data.room) {
        addRecentRoom(data.room.id, data.room.players[0]?.name || '房主', data.room.playerCount);
        return { room: data.room, playerIndex: data.playerIndex };
      }
    } else {
      const data = await res.json().catch(() => ({}));
      if (data && data.error) {
        return { room: null, error: data.error, playerIndex: -1 };
      }
    }
  } catch {
    // Server not responding or static Netlify deployment
  }

  // Check if current user is the host re-entering their own room
  const localRoom = p2pManager.getLocalRoom(normId);
  if (localRoom) {
    const pIdx = localRoom.players.findIndex((p) => p.id === playerId);
    if (pIdx >= 0) {
      addRecentRoom(localRoom.id, localRoom.players[0]?.name || '房主', localRoom.playerCount);
      return { room: localRoom, playerIndex: pIdx };
    }
  }

  // Fallback to WebRTC P2P connection to the host
  const result = await p2pManager.initGuest(
    normId,
    playerId,
    playerName || '小狗',
    playerAvatar || '🐶',
    () => {},
    () => {}
  );

  if (result.room) {
    addRecentRoom(result.room.id, result.room.players[0]?.name || '房主', result.room.playerCount);
  }

  return result;
}

// 4. Host starts the game from waiting lobby
export async function startOnlineRoom(roomId: string, fillWithAi = false): Promise<OnlineRoom | null> {
  const normId = roomId.trim().toLowerCase();
  const playerId = getMyPlayerId();

  try {
    const res = await fetchWithTimeout(`/api/rooms/${encodeURIComponent(normId)}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fillWithAi, playerId }),
    }, 2000);

    if (res.ok) {
      const data = await res.json();
      return data.room;
    }
  } catch {
    // Server unavailable
  }

  // P2P / Netlify fallback
  p2pManager.startGame(fillWithAi);
  return p2pManager.getLocalRoom(normId);
}

// 5. Player leaves room
export async function leaveOnlineRoom(roomId: string): Promise<{ disbanded: boolean }> {
  const normId = roomId.trim().toLowerCase();
  const playerId = getMyPlayerId();

  try {
    const res = await fetchWithTimeout(`/api/rooms/${encodeURIComponent(normId)}/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId }),
    }, 1500);

    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Server unavailable
  }

  // P2P / Netlify fallback
  p2pManager.leaveRoom(playerId);
  return { disbanded: true };
}

// 6. Apply an action to the room state
export async function applyOnlineRoomAction(roomId: string, action: Action): Promise<OnlineRoom | null> {
  const normId = roomId.trim().toLowerCase();
  const playerId = getMyPlayerId();

  try {
    const res = await fetchWithTimeout(`/api/rooms/${encodeURIComponent(normId)}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, playerId }),
    }, 2000);

    if (res.ok) {
      const data = await res.json();
      return data.room;
    }
  } catch {
    // Server unavailable
  }

  // P2P / Netlify fallback
  p2pManager.sendAction(action, playerId);
  return p2pManager.getLocalRoom(normId);
}

// 7. Reset room game
export async function resetOnlineRoom(roomId: string): Promise<OnlineRoom | null> {
  const normId = roomId.trim().toLowerCase();
  const playerId = getMyPlayerId();

  try {
    const res = await fetchWithTimeout(`/api/rooms/${encodeURIComponent(normId)}/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId }),
    }, 2000);

    if (res.ok) {
      const data = await res.json();
      return data.room;
    }
  } catch {
    // Server unavailable
  }

  // P2P / Netlify fallback
  p2pManager.resetGame(playerId);
  return p2pManager.getLocalRoom(normId);
}

// 8. Subscribe to room updates (Hybrid: Server SSE + P2P WebRTC + BroadcastChannel)
export function subscribeToRoom(
  roomId: string,
  onUpdate: (room: OnlineRoom) => void,
  onDisbanded?: () => void
): () => void {
  const normId = roomId.trim().toLowerCase();
  const playerId = getMyPlayerId();
  let eventSource: EventSource | null = null;
  let pollingTimer: number | null = null;
  let isClosed = false;

  // Initialize P2P Host if current user is the host
  const localRoom = p2pManager.getLocalRoom(normId);
  if (localRoom && localRoom.hostId === playerId) {
    p2pManager.initHost(localRoom, onUpdate, onDisbanded);
  }

  // Polling function for Server mode (SAFE: never disbands on null or 404)
  const pollServer = async () => {
    if (isClosed) return;
    try {
      const room = await getOnlineRoom(normId);
      if (room && !isClosed) {
        onUpdate(room);
      }
      // CRITICAL FIX: Never call onDisbanded here on null!
      // A static Netlify host or transient network drop should NEVER kick player out to home!
    } catch {
      // ignore transient poll error
    }
  };

  // Setup Server-Sent Events (SSE) if supported and on server
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
        // SSE temporary reconnecting or static deployment; P2P and polling cover updates
      };
    } catch {
      // ignore
    }
  }

  // Polling timer every 1500ms
  pollingTimer = window.setInterval(pollServer, 1500);

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
    p2pManager.cleanup();
  };
}

// 9. Recent Rooms management
export function getRecentRooms(): RecentRoomItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_RECENT_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return [];
}

export function addRecentRoom(id: string, hostName: string, playerCount: 2 | 3 | 4) {
  try {
    const recents = getRecentRooms().filter((r) => r.id.toLowerCase() !== id.toLowerCase());
    recents.unshift({
      id: id.toLowerCase(),
      hostName,
      playerCount,
      visitedAt: Date.now(),
    });
    localStorage.setItem(STORAGE_RECENT_KEY, JSON.stringify(recents.slice(0, 5)));
  } catch {}
}

export function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return '刚刚';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}分钟前`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}小时前`;
  return `${Math.floor(diffSec / 86400)}天前`;
}
