import type { DataConnection } from 'peerjs';
import PeerPkg from 'peerjs';
import { OnlineRoom, RoomPlayer } from './rooms';
import { Action } from '../types';
import { applyAction, createInitialState } from './rules';

// Resolve PeerJS constructor reliably in all bundling / ESM contexts
const Peer = (PeerPkg as any).default?.Peer || (PeerPkg as any).Peer || (PeerPkg as any).default || PeerPkg;

export type P2PMessage =
  | { type: 'P2P_JOIN'; playerId: string; playerName?: string; playerAvatar?: string }
  | { type: 'P2P_UPDATE'; room: OnlineRoom; playerIndex?: number }
  | { type: 'P2P_ACTION'; action: Action; playerId: string }
  | { type: 'P2P_START'; fillWithAi: boolean; playerId: string }
  | { type: 'P2P_LEAVE'; playerId: string }
  | { type: 'P2P_DISBANDED' }
  | { type: 'P2P_RESET'; playerId: string };

const PEER_PREFIX = 'quoridor_net_v3_';

class P2PManager {
  private peer: any = null;
  private isHost: boolean = false;
  private currentRoomId: string | null = null;
  private connections: Map<string, DataConnection> = new Map(); // For host: playerId -> conn
  private hostConnection: DataConnection | null = null; // For guest: conn to host
  private broadcastChannel: BroadcastChannel | null = null;
  private onUpdateCallback: ((room: OnlineRoom) => void) | null = null;
  private onDisbandCallback: (() => void) | null = null;

  // Initialize as Host for a room
  public initHost(
    room: OnlineRoom,
    onUpdate: (room: OnlineRoom) => void,
    onDisband?: () => void
  ): Promise<boolean> {
    this.cleanup();
    this.isHost = true;
    this.currentRoomId = room.id;
    this.onUpdateCallback = onUpdate;
    this.onDisbandCallback = onDisband || null;

    // Setup local BroadcastChannel
    this.setupBroadcastChannel(room.id);

    return new Promise((resolve) => {
      try {
        const peerId = PEER_PREFIX + room.id.toLowerCase();
        this.peer = new Peer(peerId, {
          debug: 0,
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:global.stun.twilio.com:3478' },
            ],
          },
        });

        this.peer.on('open', () => {
          console.log('[P2P] Host peer opened with ID:', peerId);
          resolve(true);
        });

        this.peer.on('connection', (conn: DataConnection) => {
          console.log('[P2P] Incoming guest connection');
          conn.on('data', (data: any) => {
            this.handleHostReceivedData(data as P2PMessage, conn);
          });
          conn.on('close', () => {
            // Find player who disconnected
            for (const [pId, c] of this.connections.entries()) {
              if (c === conn) {
                this.connections.delete(pId);
                break;
              }
            }
          });
        });

        this.peer.on('error', (err: any) => {
          console.warn('[P2P] Host peer notice:', err?.type || err);
          // If ID is already taken, this peer already exists, resolve anyway
          resolve(true);
        });
      } catch (err) {
        console.warn('[P2P] Could not start WebRTC peer', err);
        resolve(false);
      }
    });
  }

  // Initialize as Guest connecting to Host
  public initGuest(
    roomId: string,
    playerId: string,
    playerName: string,
    playerAvatar: string,
    onUpdate: (room: OnlineRoom) => void,
    onDisband?: () => void
  ): Promise<{ room: OnlineRoom | null; playerIndex: number; error?: string }> {
    this.cleanup();
    this.isHost = false;
    this.currentRoomId = roomId;
    this.onUpdateCallback = onUpdate;
    this.onDisbandCallback = onDisband || null;

    this.setupBroadcastChannel(roomId);

    return new Promise((resolve) => {
      let resolved = false;
      const targetHostPeerId = PEER_PREFIX + roomId.toLowerCase();

      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve({
            room: null,
            playerIndex: -1,
            error: '连接房主超时，请确认房主已开启房间且网络通畅',
          });
        }
      }, 7000);

      try {
        this.peer = new Peer({
          debug: 0,
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:global.stun.twilio.com:3478' },
            ],
          },
        });

        this.peer.on('open', () => {
          const conn = this.peer.connect(targetHostPeerId, { reliable: true });
          this.hostConnection = conn;

          conn.on('open', () => {
            console.log('[P2P] Connected to host, sending JOIN request');
            const joinMsg: P2PMessage = {
              type: 'P2P_JOIN',
              playerId,
              playerName,
              playerAvatar,
            };
            conn.send(joinMsg);
          });

          conn.on('data', (data: any) => {
            const msg = data as P2PMessage;
            if (msg.type === 'P2P_UPDATE') {
              if (!resolved) {
                resolved = true;
                clearTimeout(timer);
                resolve({
                  room: msg.room,
                  playerIndex: msg.playerIndex !== undefined ? msg.playerIndex : -1,
                });
              }
              this.onUpdateCallback?.(msg.room);
            } else if (msg.type === 'P2P_DISBANDED') {
              this.onDisbandCallback?.();
            }
          });

          conn.on('error', (err: any) => {
            console.warn('[P2P] Guest conn error:', err);
            if (!resolved) {
              resolved = true;
              clearTimeout(timer);
              resolve({ room: null, playerIndex: -1, error: '无法连接到该房间的房主' });
            }
          });
        });

        this.peer.on('error', (err: any) => {
          console.warn('[P2P] Guest peer error:', err);
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            resolve({ room: null, playerIndex: -1, error: '网络连接异常，请重试' });
          }
        });
      } catch (err) {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve({ room: null, playerIndex: -1, error: 'P2P 初始化失败' });
        }
      }
    });
  }

  // Setup BroadcastChannel for instant same-browser sync
  private setupBroadcastChannel(roomId: string) {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.broadcastChannel = new BroadcastChannel('quoridor_bc_' + roomId.toLowerCase());
        this.broadcastChannel.onmessage = (event) => {
          const msg = event.data as P2PMessage;
          if (msg.type === 'P2P_UPDATE') {
            this.onUpdateCallback?.(msg.room);
          } else if (msg.type === 'P2P_DISBANDED') {
            this.onDisbandCallback?.();
          }
        };
      } catch (e) {
        console.warn('BroadcastChannel error', e);
      }
    }
  }

  // Host handles data incoming from guests
  private handleHostReceivedData(msg: P2PMessage, conn: DataConnection) {
    if (!this.isHost || !this.currentRoomId) return;

    // Load current room from localStorage
    const room = this.getLocalRoom(this.currentRoomId);
    if (!room) return;

    if (msg.type === 'P2P_JOIN') {
      this.connections.set(msg.playerId, conn);

      // Check if player already exists
      let playerIndex = room.players.findIndex((p) => p.id === msg.playerId);
      if (playerIndex < 0) {
        if (room.players.length >= room.playerCount) {
          // Room full
          conn.send({
            type: 'P2P_UPDATE',
            room,
            playerIndex: -1,
          });
          return;
        }

        const newPlayer: RoomPlayer = {
          id: msg.playerId,
          name: msg.playerName || `玩家 ${room.players.length + 1}`,
          avatar: msg.playerAvatar || '🐶',
          playerIndex: room.players.length,
          isHost: false,
          connected: true,
        };
        room.players.push(newPlayer);
        playerIndex = newPlayer.playerIndex;
      } else {
        room.players[playerIndex].connected = true;
      }

      this.saveAndBroadcastRoom(room, conn, playerIndex);
    } else if (msg.type === 'P2P_ACTION') {
      try {
        const nextState = applyAction(room.state, msg.action);
        room.state = nextState;
        if (nextState.winnerId !== null) {
          room.status = 'finished';
        }
        this.saveAndBroadcastRoom(room);
      } catch (err) {
        console.warn('[P2P] Failed to apply action', err);
      }
    } else if (msg.type === 'P2P_LEAVE') {
      const idx = room.players.findIndex((p) => p.id === msg.playerId);
      if (idx >= 0) {
        room.players[idx].connected = false;
      }
      this.saveAndBroadcastRoom(room);
    } else if (msg.type === 'P2P_RESET') {
      room.state = createInitialState(room.playerCount);
      room.status = 'playing';
      this.saveAndBroadcastRoom(room);
    }
  }

  // Send action as guest or apply as host
  public sendAction(action: Action, playerId: string): boolean {
    if (this.isHost && this.currentRoomId) {
      const room = this.getLocalRoom(this.currentRoomId);
      if (room) {
        const nextState = applyAction(room.state, action);
        room.state = nextState;
        if (nextState.winnerId !== null) {
          room.status = 'finished';
        }
        this.saveAndBroadcastRoom(room);
        return true;
      }
    } else if (this.hostConnection && this.hostConnection.open) {
      this.hostConnection.send({
        type: 'P2P_ACTION',
        action,
        playerId,
      });
      return true;
    }
    return false;
  }

  // Start game as host
  public startGame(fillWithAi: boolean): boolean {
    if (!this.isHost || !this.currentRoomId) return false;
    const room = this.getLocalRoom(this.currentRoomId);
    if (!room) return false;

    if (fillWithAi && room.players.length < room.playerCount) {
      const needed = room.playerCount - room.players.length;
      const defaultAvatars = ['🐶', '🐴', '🐮'];
      const defaultNames = ['电脑·小狗', '电脑·小马', '电脑·小牛'];

      for (let i = 0; i < needed; i++) {
        const pIdx = room.players.length;
        room.players.push({
          id: 'ai_' + Math.random().toString(36).substring(2, 7),
          name: defaultNames[i] || `电脑 ${pIdx + 1}`,
          avatar: defaultAvatars[i] || '🤖',
          playerIndex: pIdx,
          isHost: false,
          connected: true,
        });
      }
    }

    room.status = 'playing';
    this.saveAndBroadcastRoom(room);
    return true;
  }

  // Reset game as host or guest
  public resetGame(playerId: string): boolean {
    if (this.isHost && this.currentRoomId) {
      const room = this.getLocalRoom(this.currentRoomId);
      if (room) {
        room.state = createInitialState(room.playerCount);
        room.status = 'playing';
        this.saveAndBroadcastRoom(room);
        return true;
      }
    } else if (this.hostConnection && this.hostConnection.open) {
      this.hostConnection.send({
        type: 'P2P_RESET',
        playerId,
      });
      return true;
    }
    return false;
  }

  // Leave room
  public leaveRoom(playerId: string) {
    if (this.isHost) {
      // Disband room
      const disbandMsg: P2PMessage = { type: 'P2P_DISBANDED' };
      for (const conn of this.connections.values()) {
        try {
          conn.send(disbandMsg);
        } catch {}
      }
      try {
        this.broadcastChannel?.postMessage(disbandMsg);
      } catch {}
      if (this.currentRoomId) {
        localStorage.removeItem('quoridor_room_' + this.currentRoomId.toLowerCase());
      }
    } else if (this.hostConnection && this.hostConnection.open) {
      try {
        this.hostConnection.send({ type: 'P2P_LEAVE', playerId });
      } catch {}
    }
    this.cleanup();
  }

  // Host helper: save room and broadcast
  public saveAndBroadcastRoom(
    room: OnlineRoom,
    targetConn?: DataConnection,
    targetPlayerIndex?: number
  ) {
    try {
      localStorage.setItem('quoridor_room_' + room.id.toLowerCase(), JSON.stringify(room));
    } catch {}

    // 1. Notify host locally
    this.onUpdateCallback?.(room);

    // 2. Broadcast to BroadcastChannel (other tabs)
    try {
      this.broadcastChannel?.postMessage({
        type: 'P2P_UPDATE',
        room,
      });
    } catch {}

    // 3. Broadcast to WebRTC guest connections
    for (const [pId, conn] of this.connections.entries()) {
      try {
        if (conn.open) {
          const pIndex = room.players.find((p) => p.id === pId)?.playerIndex;
          conn.send({
            type: 'P2P_UPDATE',
            room,
            playerIndex: pIndex !== undefined ? pIndex : targetPlayerIndex,
          });
        }
      } catch {}
    }

    if (targetConn && targetConn.open) {
      try {
        targetConn.send({
          type: 'P2P_UPDATE',
          room,
          playerIndex: targetPlayerIndex,
        });
      } catch {}
    }
  }

  public getLocalRoom(roomId: string): OnlineRoom | null {
    try {
      const raw = localStorage.getItem('quoridor_room_' + roomId.toLowerCase());
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  }

  public cleanup() {
    if (this.hostConnection) {
      try {
        this.hostConnection.close();
      } catch {}
      this.hostConnection = null;
    }
    for (const conn of this.connections.values()) {
      try {
        conn.close();
      } catch {}
    }
    this.connections.clear();

    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.close();
      } catch {}
      this.broadcastChannel = null;
    }

    if (this.peer) {
      try {
        this.peer.destroy();
      } catch {}
      this.peer = null;
    }

    this.isHost = false;
    this.currentRoomId = null;
    this.onUpdateCallback = null;
    this.onDisbandCallback = null;
  }
}

export const p2pManager = new P2PManager();
