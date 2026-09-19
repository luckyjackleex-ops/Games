export type Direction = 0 | 1; // 0: Horizontal (水平), 1: Vertical (竖直)

export interface Position {
  x: number; // 0 to 8 (column A to I)
  y: number; // 0 to 8 (row 1 to 9)
}

export interface Wall {
  x: number; // 0 to 7 (horizontal groove column)
  y: number; // 0 to 7 (horizontal groove row)
  d: Direction; // 0 = Horizontal, 1 = Vertical
  p: number; // Player ID who placed this wall (0..3)
}

export interface MoveAction {
  type: 'MOVE';
  x: number;
  y: number;
}

export interface WallAction {
  type: 'WALL';
  x: number;
  y: number;
  d: Direction;
}

export type Action = MoveAction | WallAction;

export interface PlayerConfig {
  id: number;
  name: string;
  color: string;
  accentColor: string;
  bgHighlight: string;
  startPos: Position;
  targetLine: {
    axis: 'x' | 'y';
    value: number;
    label: string;
  };
  isAi: boolean;
}

export type AiDifficulty = 'easy' | 'medium' | 'hard';

export interface MoveRecord {
  round: number;
  playerId: number;
  action: Action;
  notation: string;
  timestamp: number;
}

export interface GameState {
  playerCount: 2 | 3 | 4;
  playerPos: Position[];
  walls: Wall[];
  leftWalls: number[];
  waitFor: number; // Current active player ID
  firstId: number;
  round: number;
  winnerId: number[];
  winnerRound: number[];
  isOver: boolean;
  history: {
    state: Omit<GameState, 'history'>;
    action?: Action;
    notation?: string;
  }[];
  recordList: MoveRecord[];
}

export type GameMode = 'local' | 'ai' | 'pass_and_play' | 'online';
