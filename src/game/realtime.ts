import mqtt, { MqttClient } from 'mqtt';
import { OnlineRoom, RoomPlayer } from './rooms';
import { Action } from '../types';
import { applyAction, createInitialState } from './rules';

export type RealtimeMessage =
  | { type: 'P2P_JOIN'; playerId: string; playerName?: string; playerAvatar?: string }
  | { type: 'P2P_UPDATE'; room: OnlineRoom; playerIndex?: number }
  | { type: 'P2P_ACTION'; action: Action; playerId: string }
  | { type: 'P2P_START'; fillWithAi: boolean; playerId: string; room?: OnlineRoom }
  | { type: 'P2P_LEAVE'; playerId: string }
  | { type: 'P2P_DISBANDED' }
  | { type: 'P2P_RESET'; playerId: string };

// Domestic China-optimized WSS broker endpoints with global fallback
const BROKER_URLS = [
  'wss://broker-cn.emqx.io:8084/mqtt', // Dedicated China node (ultra fast in Mainland China)
  'wss://broker.emqx.io:8084/mqtt',    // Global fallback node
];

class RealtimeSyncManager {
  private client: MqttClient | null = null;
  private currentBrokerIndex = 0;
  private currentRoomId: string | null = null;
  private isHost: boolean = false;
  private myPlayerId: string = '';
  private broadcastChannel: BroadcastChannel | null = null;
  private updateListeners = new Set<(room: OnlineRoom) => void>();
  private disbandListeners = new Set<() => void>();
  private activeRoomState: OnlineRoom | null = null;
  private connectingPromise: Promise<MqttClient> | null = null;

  private getStateTopic(roomId: string): string {
    return `quoridor/v4/room/${roomId.toLowerCase()}/state`;
  }

  private getEventsTopic(roomId: string): string {
    return `quoridor/v4/room/${roomId.toLowerCase()}/events`;
  }

  public subscribeRoomUpdates(
    onUpdate: (room: OnlineRoom) => void,
    onDisband?: () => void
  ): () => void {
    this.updateListeners.add(onUpdate);
    if (onDisband) {
      this.disbandListeners.add(onDisband);
    }
    if (this.activeRoomState) {
      onUpdate(this.activeRoomState);
    }
    return () => {
      this.updateListeners.delete(onUpdate);
      if (onDisband) {
        this.disbandListeners.delete(onDisband);
      }
    };
  }

  // Connect to MQTT Broker with automatic China/Global failover
  private connectBroker(): Promise<MqttClient> {
    if (this.client && this.client.connected) {
      return Promise.resolve(this.client);
    }
    if (this.connectingPromise) {
      return this.connectingPromise;
    }

    if (this.client) {
      try {
        this.client.end(true);
      } catch {}
      this.client = null;
    }

    const clientId = `quoridor_${Math.random().toString(36).substring(2, 9)}`;
    const url = BROKER_URLS[this.currentBrokerIndex] || BROKER_URLS[0];

    this.connectingPromise = new Promise<MqttClient>((resolve) => {
      let isResolved = false;
      const client = mqtt.connect(url, {
        clientId,
        clean: true,
        connectTimeout: 4000,
        keepalive: 30,
        reconnectPeriod: 2000,
      });

      const timer = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          this.connectingPromise = null;
          this.currentBrokerIndex = (this.currentBrokerIndex + 1) % BROKER_URLS.length;
          resolve(client);
        }
      }, 4000);

      client.on('connect', () => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timer);
          this.client = client;
          this.connectingPromise = null;
          resolve(client);
        }
      });

      client.on('error', (err) => {
        console.warn('[Realtime] MQTT broker error:', err.message);
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timer);
          this.connectingPromise = null;
          this.currentBrokerIndex = (this.currentBrokerIndex + 1) % BROKER_URLS.length;
          resolve(client);
        }
      });

      this.client = client;
    });

    return this.connectingPromise;
  }

  // Initialize Host
  public async initHost(
    room: OnlineRoom,
    onUpdate?: (room: OnlineRoom) => void,
    onDisband?: () => void
  ): Promise<boolean> {
    this.isHost = true;
    this.currentRoomId = room.id.toLowerCase();
    this.myPlayerId = room.hostId;
    this.activeRoomState = room;

    if (onUpdate) this.updateListeners.add(onUpdate);
    if (onDisband) this.disbandListeners.add(onDisband);

    this.setupBroadcastChannel(room.id);
    this.saveLocalRoom(room);

    try {
      const client = await this.connectBroker();
      const stateTopic = this.getStateTopic(room.id);
      const eventsTopic = this.getEventsTopic(room.id);

      client.subscribe([stateTopic, eventsTopic], { qos: 1 }, () => {
        client.publish(stateTopic, JSON.stringify(room), { retain: true, qos: 1 });
      });

      client.on('message', (topic: string, message: Buffer) => {
        try {
          const payload = message.toString();
          if (!payload) return;

          if (topic === eventsTopic) {
            const event = JSON.parse(payload) as RealtimeMessage;
            this.handleHostIncomingEvent(event);
          }
        } catch (e) {
          console.warn('[Realtime] Host parse error', e);
        }
      });

      return true;
    } catch (err) {
      console.warn('[Realtime] Failed to init host on broker', err);
      return false;
    }
  }

  // Initialize Guest
  public async initGuest(
    roomId: string,
    playerId: string,
    playerName: string,
    playerAvatar: string,
    onUpdate?: (room: OnlineRoom) => void,
    onDisband?: () => void
  ): Promise<{ room: OnlineRoom | null; playerIndex: number; error?: string }> {
    this.isHost = false;
    this.currentRoomId = roomId.toLowerCase();
    this.myPlayerId = playerId;

    if (onUpdate) this.updateListeners.add(onUpdate);
    if (onDisband) this.disbandListeners.add(onDisband);

    this.setupBroadcastChannel(roomId);

    const normId = roomId.toLowerCase();
    const stateTopic = this.getStateTopic(normId);
    const eventsTopic = this.getEventsTopic(normId);

    return new Promise(async (resolve) => {
      let resolved = false;

      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          const localRoom = this.getLocalRoom(normId);
          if (localRoom) {
            resolve({
              room: localRoom,
              playerIndex: localRoom.players.findIndex((p) => p.id === playerId),
            });
          } else {
            resolve({
              room: null,
              playerIndex: -1,
              error: '未找到该房间，请确认房间号是否正确或房主是否在线',
            });
          }
        }
      }, 3500);

      try {
        const client = await this.connectBroker();

        client.subscribe([stateTopic, eventsTopic], { qos: 1 });

        // Send JOIN event
        client.publish(
          eventsTopic,
          JSON.stringify({
            type: 'P2P_JOIN',
            playerId,
            playerName,
            playerAvatar,
          }),
          { qos: 1 }
        );

        client.on('message', (topic: string, message: Buffer) => {
          try {
            const raw = message.toString();
            if (!raw) return;

            if (topic === stateTopic) {
              const room = JSON.parse(raw) as OnlineRoom;
              this.activeRoomState = room;
              this.saveLocalRoom(room);

              let pIndex = room.players.findIndex((p) => p.id === playerId);
              if (pIndex < 0 && room.players.length < room.playerCount) {
                client.publish(
                  eventsTopic,
                  JSON.stringify({
                    type: 'P2P_JOIN',
                    playerId,
                    playerName,
                    playerAvatar,
                  }),
                  { qos: 1 }
                );
              }

              if (!resolved) {
                resolved = true;
                clearTimeout(timer);
                resolve({
                  room,
                  playerIndex: pIndex >= 0 ? pIndex : room.players.length,
                });
              }

              this.notifyUpdate(room);
            } else if (topic === eventsTopic) {
              const event = JSON.parse(raw) as RealtimeMessage;
              if (event.type === 'P2P_DISBANDED') {
                this.notifyDisband();
              } else if (event.type === 'P2P_START' && event.room) {
                this.activeRoomState = event.room;
                this.notifyUpdate(event.room);
              }
            }
          } catch (e) {
            console.warn('[Realtime] Guest message error', e);
          }
        });
      } catch {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve({ room: null, playerIndex: -1, error: '网络连接异常，请重试' });
        }
      }
    });
  }

  private notifyUpdate(room: OnlineRoom) {
    this.updateListeners.forEach((fn) => {
      try {
        fn(room);
      } catch {}
    });
  }

  private notifyDisband() {
    this.disbandListeners.forEach((fn) => {
      try {
        fn();
      } catch {}
    });
  }

  // Host handles guest events (JOIN, ACTION, START, LEAVE)
  private handleHostIncomingEvent(event: RealtimeMessage) {
    if (!this.isHost || !this.currentRoomId) return;
    const room = this.activeRoomState || this.getLocalRoom(this.currentRoomId);
    if (!room) return;

    if (event.type === 'P2P_JOIN') {
      let playerIndex = room.players.findIndex((p) => p.id === event.playerId);

      if (playerIndex < 0) {
        if (room.players.length >= room.playerCount) {
          return;
        }

        const newPlayer: RoomPlayer = {
          id: event.playerId,
          name: event.playerName || `玩家 ${room.players.length + 1}`,
          avatar: event.playerAvatar || '🐶',
          playerIndex: room.players.length,
          isHost: false,
          connected: true,
        };
        room.players.push(newPlayer);
      } else {
        room.players[playerIndex].connected = true;
      }

      this.activeRoomState = room;
      this.broadcastRoom(room);
    } else if (event.type === 'P2P_ACTION') {
      try {
        const nextState = applyAction(room.state, event.action);
        room.state = nextState;
        if (nextState.winnerId.length > 0) {
          room.status = 'finished';
        }
        this.activeRoomState = room;
        this.broadcastRoom(room);
      } catch (err) {
        console.warn('[Realtime] Failed to apply action', err);
      }
    } else if (event.type === 'P2P_LEAVE') {
      const idx = room.players.findIndex((p) => p.id === event.playerId);
      if (idx >= 0) {
        room.players[idx].connected = false;
        this.activeRoomState = room;
        this.broadcastRoom(room);
      }
    } else if (event.type === 'P2P_RESET') {
      room.state = createInitialState(room.playerCount);
      room.status = 'playing';
      this.activeRoomState = room;
      this.broadcastRoom(room);
    }
  }

  // Broadcast Room to all players via MQTT (retain: true) + BroadcastChannel + Local callback
  public broadcastRoom(room: OnlineRoom) {
    this.activeRoomState = room;
    this.saveLocalRoom(room);

    // 1. Local listeners
    this.notifyUpdate(room);

    // 2. BroadcastChannel for same-browser tabs
    try {
      this.broadcastChannel?.postMessage({
        type: 'P2P_UPDATE',
        room,
      });
    } catch {}

    // 3. MQTT Broker for real-time multi-device sync
    if (this.client && this.client.connected && this.currentRoomId) {
      const stateTopic = this.getStateTopic(this.currentRoomId);
      const eventsTopic = this.getEventsTopic(this.currentRoomId);
      const json = JSON.stringify(room);

      this.client.publish(stateTopic, json, { retain: true, qos: 1 });

      if (room.status === 'playing') {
        this.client.publish(
          eventsTopic,
          JSON.stringify({
            type: 'P2P_START',
            fillWithAi: false,
            playerId: this.myPlayerId,
            room,
          }),
          { qos: 1 }
        );
      }
    }
  }

  // Host starts the game
  public startGame(fillWithAi: boolean): boolean {
    if (!this.isHost || !this.currentRoomId) return false;
    const room = this.activeRoomState || this.getLocalRoom(this.currentRoomId);
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
    this.broadcastRoom(room);
    return true;
  }

  // Send action (by active player, host or guest)
  public sendAction(action: Action, playerId: string): boolean {
    if (this.isHost && this.currentRoomId) {
      const room = this.activeRoomState || this.getLocalRoom(this.currentRoomId);
      if (room) {
        const nextState = applyAction(room.state, action);
        room.state = nextState;
        if (nextState.winnerId.length > 0) {
          room.status = 'finished';
        }
        this.broadcastRoom(room);
        return true;
      }
    } else if (this.client && this.client.connected && this.currentRoomId) {
      const eventsTopic = this.getEventsTopic(this.currentRoomId);
      this.client.publish(
        eventsTopic,
        JSON.stringify({
          type: 'P2P_ACTION',
          action,
          playerId,
        }),
        { qos: 1 }
      );
      return true;
    }
    return false;
  }

  // Reset game
  public resetGame(playerId: string): boolean {
    if (this.isHost && this.currentRoomId) {
      const room = this.activeRoomState || this.getLocalRoom(this.currentRoomId);
      if (room) {
        room.state = createInitialState(room.playerCount);
        room.status = 'playing';
        this.broadcastRoom(room);
        return true;
      }
    } else if (this.client && this.client.connected && this.currentRoomId) {
      const eventsTopic = this.getEventsTopic(this.currentRoomId);
      this.client.publish(
        eventsTopic,
        JSON.stringify({
          type: 'P2P_RESET',
          playerId,
        }),
        { qos: 1 }
      );
      return true;
    }
    return false;
  }

  // Leave room
  public leaveRoom(playerId: string) {
    if (this.isHost && this.currentRoomId) {
      if (this.client && this.client.connected) {
        const stateTopic = this.getStateTopic(this.currentRoomId);
        const eventsTopic = this.getEventsTopic(this.currentRoomId);
        try {
          this.client.publish(stateTopic, '', { retain: true, qos: 1 });
          this.client.publish(eventsTopic, JSON.stringify({ type: 'P2P_DISBANDED' }), { qos: 1 });
        } catch {}
      }

      try {
        this.broadcastChannel?.postMessage({ type: 'P2P_DISBANDED' });
      } catch {}

      try {
        localStorage.removeItem('quoridor_room_' + this.currentRoomId.toLowerCase());
      } catch {}
    } else if (this.client && this.client.connected && this.currentRoomId) {
      try {
        const eventsTopic = this.getEventsTopic(this.currentRoomId);
        this.client.publish(
          eventsTopic,
          JSON.stringify({ type: 'P2P_LEAVE', playerId }),
          { qos: 1 }
        );
      } catch {}
    }

    this.cleanup();
  }

  private setupBroadcastChannel(roomId: string) {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.broadcastChannel = new BroadcastChannel('quoridor_bc_' + roomId.toLowerCase());
        this.broadcastChannel.onmessage = (event) => {
          const msg = event.data as RealtimeMessage;
          if (msg.type === 'P2P_UPDATE') {
            this.activeRoomState = msg.room;
            this.notifyUpdate(msg.room);
          } else if (msg.type === 'P2P_DISBANDED') {
            this.notifyDisband();
          }
        };
      } catch (e) {
        console.warn('BroadcastChannel error', e);
      }
    }
  }

  public getLocalRoom(roomId: string): OnlineRoom | null {
    if (this.activeRoomState && this.activeRoomState.id.toLowerCase() === roomId.toLowerCase()) {
      return this.activeRoomState;
    }
    try {
      const raw = localStorage.getItem('quoridor_room_' + roomId.toLowerCase());
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  }

  public saveLocalRoom(room: OnlineRoom) {
    this.activeRoomState = room;
    try {
      localStorage.setItem('quoridor_room_' + room.id.toLowerCase(), JSON.stringify(room));
    } catch {}
  }

  public cleanup() {
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.close();
      } catch {}
      this.broadcastChannel = null;
    }

    if (this.client) {
      try {
        this.client.end(true);
      } catch {}
      this.client = null;
    }

    this.isHost = false;
    this.currentRoomId = null;
    this.activeRoomState = null;
    this.updateListeners.clear();
    this.disbandListeners.clear();
  }
}

export const realtimeManager = new RealtimeSyncManager();
