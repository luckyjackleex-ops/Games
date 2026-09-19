import { Direction, Position, Wall, Action, GameState, PlayerConfig, MoveRecord } from '../types';

export const INITIAL_WALLS_COUNT = {
  2: 10,
  3: 7,
  4: 5,
} as const;

export const PLAYER_CONFIGS: Record<number, Omit<PlayerConfig, 'isAi'>[]> = {
  2: [
    {
      id: 0,
      name: '小猫 (红)',
      color: '#ef4444',
      accentColor: '#dc2626',
      bgHighlight: 'rgba(239, 68, 68, 0.15)',
      startPos: { x: 4, y: 8 },
      targetLine: { axis: 'y', value: 0, label: '顶部底线 (第 1 行)' },
    },
    {
      id: 1,
      name: '小狗 (蓝)',
      color: '#3b82f6',
      accentColor: '#2563eb',
      bgHighlight: 'rgba(59, 130, 246, 0.15)',
      startPos: { x: 4, y: 0 },
      targetLine: { axis: 'y', value: 8, label: '底部底线 (第 9 行)' },
    },
  ],
  3: [
    {
      id: 0,
      name: '小猫 (红)',
      color: '#ef4444',
      accentColor: '#dc2626',
      bgHighlight: 'rgba(239, 68, 68, 0.15)',
      startPos: { x: 4, y: 8 },
      targetLine: { axis: 'y', value: 0, label: '顶部底线 (第 9 行)' },
    },
    {
      id: 1,
      name: '小狗 (蓝)',
      color: '#3b82f6',
      accentColor: '#2563eb',
      bgHighlight: 'rgba(59, 130, 246, 0.15)',
      startPos: { x: 8, y: 4 },
      targetLine: { axis: 'x', value: 0, label: '左侧底线 (A 列)' },
    },
    {
      id: 2,
      name: '小马 (绿)',
      color: '#22c55e',
      accentColor: '#16a34a',
      bgHighlight: 'rgba(34, 197, 94, 0.15)',
      startPos: { x: 4, y: 0 },
      targetLine: { axis: 'y', value: 8, label: '底部底线 (第 1 行)' },
    },
  ],
  4: [
    {
      id: 0,
      name: '小猫 (红)',
      color: '#ef4444',
      accentColor: '#dc2626',
      bgHighlight: 'rgba(239, 68, 68, 0.15)',
      startPos: { x: 4, y: 8 },
      targetLine: { axis: 'y', value: 0, label: '顶部底线 (第 9 行)' },
    },
    {
      id: 1,
      name: '小狗 (蓝)',
      color: '#3b82f6',
      accentColor: '#2563eb',
      bgHighlight: 'rgba(59, 130, 246, 0.15)',
      startPos: { x: 8, y: 4 },
      targetLine: { axis: 'x', value: 0, label: '左侧底线 (A 列)' },
    },
    {
      id: 2,
      name: '小马 (绿)',
      color: '#22c55e',
      accentColor: '#16a34a',
      bgHighlight: 'rgba(34, 197, 94, 0.15)',
      startPos: { x: 4, y: 0 },
      targetLine: { axis: 'y', value: 8, label: '底部底线 (第 1 行)' },
    },
    {
      id: 3,
      name: '小牛 (橙)',
      color: '#f97316',
      accentColor: '#ea580c',
      bgHighlight: 'rgba(249, 115, 22, 0.15)',
      startPos: { x: 0, y: 4 },
      targetLine: { axis: 'x', value: 8, label: '右侧底线 (I 列)' },
    },
  ],
};

export function getInitialPositions(playerCount: 2 | 3 | 4): Position[] {
  if (playerCount === 2) {
    return [{ x: 4, y: 8 }, { x: 4, y: 0 }];
  }
  if (playerCount === 3) {
    return [{ x: 4, y: 8 }, { x: 8, y: 4 }, { x: 4, y: 0 }];
  }
  return [{ x: 4, y: 8 }, { x: 8, y: 4 }, { x: 4, y: 0 }, { x: 0, y: 4 }];
}

export function isGoalReached(playerId: number, playerCount: number, x: number, y: number): boolean {
  if (playerCount === 2) {
    return playerId === 0 ? y === 0 : y === 8;
  }
  if (playerCount === 3) {
    if (playerId === 0) return y === 0;
    if (playerId === 1) return x === 0;
    return y === 8;
  }
  // 4 players
  if (playerId === 0) return y === 0;
  if (playerId === 1) return x === 0;
  if (playerId === 2) return y === 8;
  if (playerId === 3) return x === 8;
  return false;
}

export function getOrthogonalNeighbors(x: number, y: number): Position[] {
  const list: Position[] = [];
  if (x > 0) list.push({ x: x - 1, y });
  if (x < 8) list.push({ x: x + 1, y });
  if (y > 0) list.push({ x, y: y - 1 });
  if (y < 8) list.push({ x, y: y + 1 });
  return list;
}

/**
 * Checks whether movement between (fromX, fromY) and (toX, toY) is blocked by any wall.
 */
export function isWallBlocking(
  walls: Wall[],
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
): boolean {
  for (const wall of walls) {
    // Horizontal wall (d === 0) blocks vertical movements
    if (wall.d === 0 && fromX === toX) {
      if (
        (wall.x === fromX || wall.x === fromX - 1) &&
        ((fromY === wall.y && toY === wall.y + 1) || (fromY === wall.y + 1 && toY === wall.y))
      ) {
        return true;
      }
    }

    // Vertical wall (d === 1) blocks horizontal movements
    if (wall.d === 1 && fromY === toY) {
      if (
        (wall.y === fromY || wall.y === fromY - 1) &&
        ((fromX === wall.x && toX === wall.x + 1) || (fromX === wall.x + 1 && toX === wall.x))
      ) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Get all valid pawn movements for a player according to official Quoridor rules.
 */
export function getValidPawnMoves(state: GameState, playerId: number): Position[] {
  const currentPos = state.playerPos[playerId];
  if (!currentPos) return [];

  const moves: Position[] = [];
  const neighbors = getOrthogonalNeighbors(currentPos.x, currentPos.y);

  for (const n of neighbors) {
    if (isWallBlocking(state.walls, currentPos.x, currentPos.y, n.x, n.y)) {
      continue;
    }

    // Check if neighbor square is occupied by any player pawn
    const opponentIdx = state.playerPos.findIndex((p, idx) => idx !== playerId && p.x === n.x && p.y === n.y);

    if (opponentIdx === -1) {
      // Free square
      moves.push(n);
    } else {
      // Opponent is on square `n` -> attempt Jump
      const dx = n.x - currentPos.x;
      const dy = n.y - currentPos.y;
      const straightJumpX = n.x + dx;
      const straightJumpY = n.y + dy;

      const isStraightBlockedByWall =
        straightJumpX < 0 ||
        straightJumpX > 8 ||
        straightJumpY < 0 ||
        straightJumpY > 8 ||
        isWallBlocking(state.walls, n.x, n.y, straightJumpX, straightJumpY);

      const isStraightOccupied =
        !isStraightBlockedByWall &&
        state.playerPos.some((p) => p.x === straightJumpX && p.y === straightJumpY);

      if (!isStraightBlockedByWall && !isStraightOccupied) {
        // Can jump straight over
        moves.push({ x: straightJumpX, y: straightJumpY });
      } else {
        // Straight jump is blocked by a wall, board edge, or another pawn.
        // Diagonal jump is allowed to the sides of the opponent pawn!
        const opponentNeighbors = getOrthogonalNeighbors(n.x, n.y);
        for (const on of opponentNeighbors) {
          // Cannot jump back to starting position
          if (on.x === currentPos.x && on.y === currentPos.y) continue;
          // Cannot jump in straight direction since that was blocked
          if (on.x === straightJumpX && on.y === straightJumpY) continue;

          // Check if wall blocks movement from opponent square `n` to `on`
          if (isWallBlocking(state.walls, n.x, n.y, on.x, on.y)) continue;

          // Cannot jump to a square occupied by another player
          if (state.playerPos.some((p) => p.x === on.x && p.y === on.y)) continue;

          moves.push(on);
        }
      }
    }
  }

  // Deduplicate moves
  const uniqueMoves: Position[] = [];
  for (const m of moves) {
    if (!uniqueMoves.some((u) => u.x === m.x && u.y === m.y)) {
      uniqueMoves.push(m);
    }
  }

  return uniqueMoves;
}

/**
 * Checks geometric wall intersection or overlap without testing BFS path.
 */
export function isWallSlotGeometricallyValid(walls: Wall[], x: number, y: number, d: Direction): boolean {
  if (x < 0 || x > 7 || y < 0 || y > 7) return false;

  for (const w of walls) {
    // Cross intersection test: a horizontal and vertical wall cannot share the exact center (x, y)
    if (w.x === x && w.y === y && w.d !== d) {
      return false;
    }

    // Overlap test for horizontal walls
    if (d === 0 && w.d === 0 && w.y === y) {
      if (w.x === x || w.x === x - 1 || w.x === x + 1) {
        return false;
      }
    }

    // Overlap test for vertical walls
    if (d === 1 && w.d === 1 && w.x === x) {
      if (w.y === y || w.y === y - 1 || w.y === y + 1) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Runs BFS to check if a specific player has at least one valid path to their goal line.
 * Also returns the shortest path length, or Infinity if unreachable.
 */
export function getShortestPath(
  walls: Wall[],
  playerId: number,
  playerCount: number,
  startPos: Position
): { hasPath: boolean; distance: number; path: Position[] } {
  const queue: { pos: Position; dist: number; path: Position[] }[] = [
    { pos: startPos, dist: 0, path: [startPos] },
  ];
  const visited = Array.from({ length: 9 }, () => new Array(9).fill(false));
  visited[startPos.x][startPos.y] = true;

  while (queue.length > 0) {
    const { pos, dist, path } = queue.shift()!;

    if (isGoalReached(playerId, playerCount, pos.x, pos.y)) {
      return { hasPath: true, distance: dist, path };
    }

    const neighbors = getOrthogonalNeighbors(pos.x, pos.y);
    for (const next of neighbors) {
      if (!visited[next.x][next.y] && !isWallBlocking(walls, pos.x, pos.y, next.x, next.y)) {
        visited[next.x][next.y] = true;
        queue.push({
          pos: next,
          dist: dist + 1,
          path: [...path, next],
        });
      }
    }
  }

  return { hasPath: false, distance: Infinity, path: [] };
}

/**
 * Validates whether a wall can be placed:
 * 1. Player has remaining walls
 * 2. Geometrically valid (no overlap, no cross)
 * 3. Fair-Play Rule: Every active player still has a valid path to their goal
 */
export function canPlaceWall(
  state: GameState,
  x: number,
  y: number,
  d: Direction,
  playerId: number = state.waitFor
): { valid: boolean; reason?: string } {
  if (state.leftWalls[playerId] <= 0) {
    return { valid: false, reason: '你已经没有剩余墙壁了' };
  }

  if (!isWallSlotGeometricallyValid(state.walls, x, y, d)) {
    return { valid: false, reason: '墙壁不能重叠或十字交叉' };
  }

  // Speculatively add the wall and verify BFS paths for all active players
  const testWalls: Wall[] = [...state.walls, { x, y, d, p: playerId }];

  for (let p = 0; p < state.playerCount; p++) {
    // If player already won, skip
    if (state.winnerId.includes(p)) continue;

    const { hasPath } = getShortestPath(testWalls, p, state.playerCount, state.playerPos[p]);
    if (!hasPath) {
      const pName = PLAYER_CONFIGS[state.playerCount][p].name;
      return { valid: false, reason: `该墙壁会彻底封死 ${pName} 的获胜通路！` };
    }
  }

  return { valid: true };
}

/**
 * Get all valid wall placements for the current state.
 */
export function getAllValidWallPlacements(state: GameState, playerId: number = state.waitFor): { x: number; y: number; d: Direction }[] {
  if (state.leftWalls[playerId] <= 0) return [];
  const results: { x: number; y: number; d: Direction }[] = [];

  for (let x = 0; x < 8; x++) {
    for (let y = 0; y < 8; y++) {
      for (const d of [0, 1] as Direction[]) {
        if (canPlaceWall(state, x, y, d, playerId).valid) {
          results.push({ x, y, d });
        }
      }
    }
  }

  return results;
}

/**
 * Coordinate notation: converts x to A-I, y to 1-9.
 */
export function formatCoordinate(pos: Position): string {
  const col = String.fromCharCode(65 + pos.x);
  const row = (pos.y + 1).toString();
  return `${col}${row}`;
}

export function formatActionNotation(action: Action): string {
  if (action.type === 'MOVE') {
    return `Move -> ${formatCoordinate({ x: action.x, y: action.y })}`;
  }
  const grooveCol = String.fromCharCode(97 + action.x);
  const grooveRow = (action.y + 1).toString();
  return action.d === 0 ? `H-Wall(${grooveCol}${grooveRow})` : `V-Wall(${grooveCol}${grooveRow})`;
}

/**
 * Initialize a fresh game state.
 */
export function createInitialState(playerCount: 2 | 3 | 4, firstId: number = 0): GameState {
  const initialPositions = getInitialPositions(playerCount);
  const initialWallCount = INITIAL_WALLS_COUNT[playerCount];

  return {
    playerCount,
    playerPos: initialPositions,
    walls: [],
    leftWalls: new Array(playerCount).fill(initialWallCount),
    waitFor: firstId,
    firstId,
    round: 1,
    winnerId: [],
    winnerRound: [],
    isOver: false,
    history: [],
    recordList: [],
  };
}

/**
 * Immutable transition applying an action to the game state.
 */
export function applyAction(state: GameState, action: Action): GameState {
  if (state.isOver) return state;

  const currentP = state.waitFor;
  const newPositions = state.playerPos.map((p) => ({ ...p }));
  const newWalls = [...state.walls];
  const newLeftWalls = [...state.leftWalls];
  const newWinnerId = [...state.winnerId];
  const newWinnerRound = [...state.winnerRound];

  if (action.type === 'MOVE') {
    newPositions[currentP] = { x: action.x, y: action.y };
    if (
      !newWinnerId.includes(currentP) &&
      isGoalReached(currentP, state.playerCount, action.x, action.y)
    ) {
      newWinnerId.push(currentP);
      newWinnerRound.push(state.round);
    }
  } else {
    newWalls.push({ x: action.x, y: action.y, d: action.d, p: currentP });
    newLeftWalls[currentP] = Math.max(0, newLeftWalls[currentP] - 1);
  }

  // Determine next player
  let nextPlayer = currentP;
  let nextRound = state.round;
  let isGameOver = false;

  if (newWinnerId.length > 0) {
    // In standard Mensa 2-player rules, game immediately ends on first winner reaching goal line!
    // In multi-player, check if all except 1 have finished or first finisher wins.
    isGameOver = true;
  } else {
    // Advance to next active player
    for (let step = 0; step < state.playerCount; step++) {
      nextPlayer = (nextPlayer + 1) % state.playerCount;
      if (nextPlayer === state.firstId) {
        nextRound += 1;
      }
      if (!newWinnerId.includes(nextPlayer)) {
        break;
      }
    }
  }

  const notation = formatActionNotation(action);
  const record: MoveRecord = {
    round: state.round,
    playerId: currentP,
    action,
    notation,
    timestamp: Date.now(),
  };

  const snapshotState: Omit<GameState, 'history'> = {
    playerCount: state.playerCount,
    playerPos: state.playerPos,
    walls: state.walls,
    leftWalls: state.leftWalls,
    waitFor: state.waitFor,
    firstId: state.firstId,
    round: state.round,
    winnerId: state.winnerId,
    winnerRound: state.winnerRound,
    isOver: state.isOver,
    recordList: state.recordList,
  };

  return {
    playerCount: state.playerCount,
    playerPos: newPositions,
    walls: newWalls,
    leftWalls: newLeftWalls,
    waitFor: nextPlayer,
    firstId: state.firstId,
    round: nextRound,
    winnerId: newWinnerId,
    winnerRound: newWinnerRound,
    isOver: isGameOver,
    history: [...state.history, { state: snapshotState, action, notation }],
    recordList: [...state.recordList, record],
  };
}
