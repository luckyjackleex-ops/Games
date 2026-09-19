import { GameState, Action, AiDifficulty, Position } from '../types';
import {
  getValidPawnMoves,
  canPlaceWall,
  getShortestPath,
  isWallSlotGeometricallyValid,
  isGoalReached,
} from './rules';

interface CandidateAction {
  action: Action;
  score: number;
  oppDelay: number;
  selfDelay: number;
}

/**
 * High-performance, professionally calibrated AI Engine for Quoridor:
 * - Easy (简单): Natural and active forward movement along path; easy to beat without AI feeling "frozen" or broken.
 * - Medium (中等): Sharpened competitive play; strict BFS racing, active strategic wall intercepting.
 * - Master (大师): Grandmaster-level exhaustion of all board grooves, corridor trapping, anti-leapfrog, 2-ply minimax lookahead.
 */
export function calculateAiMove(
  state: GameState,
  aiPlayerId: number,
  difficulty: AiDifficulty = 'medium'
): Action | null {
  if (state.isOver) return null;

  const validMoves = getValidPawnMoves(state, aiPlayerId);
  const wallsLeft = state.leftWalls[aiPlayerId] ?? 0;
  if (validMoves.length === 0 && wallsLeft <= 0) return null;

  // 1. Current shortest path for AI
  const myCurrentPath = getShortestPath(
    state.walls,
    aiPlayerId,
    state.playerCount,
    state.playerPos[aiPlayerId]
  );
  const myDist = myCurrentPath.distance;

  // 2. Opponents shortest paths and threat levels
  const opponentInfos: {
    id: number;
    dist: number;
    path: Position[];
    threat: number;
    wallsLeft: number;
  }[] = [];

  for (let p = 0; p < state.playerCount; p++) {
    if (p === aiPlayerId || state.winnerId.includes(p)) continue;
    const oppPath = getShortestPath(
      state.walls,
      p,
      state.playerCount,
      state.playerPos[p]
    );

    let threat = Math.max(0, 10 - oppPath.distance) * 20;
    if (oppPath.distance <= 1) threat += 3000;
    else if (oppPath.distance <= 2) threat += 1200;
    else if (oppPath.distance <= 3) threat += 500;
    else if (oppPath.distance <= 4) threat += 200;

    opponentInfos.push({
      id: p,
      dist: oppPath.distance,
      path: oppPath.path,
      threat,
      wallsLeft: state.leftWalls[p] ?? 0,
    });
  }

  opponentInfos.sort((a, b) => b.threat - a.threat);
  const primaryOpponent = opponentInfos[0];

  // =========================================================================
  // TIER 1: EASY (简单)
  // "AI 积极前行走子，自然对局，不卡死不动，但绝不恶意卡墙，玩家轻松取胜"
  // =========================================================================
  if (difficulty === 'easy') {
    if (validMoves.length > 0) {
      // Direct goal reach check: if AI happens to step on goal, let it finish
      for (const m of validMoves) {
        if (isGoalReached(aiPlayerId, state.playerCount, m.x, m.y)) {
          return { type: 'MOVE', x: m.x, y: m.y };
        }
      }

      // Rank moves by distance to goal
      const movesWithDist = validMoves.map((m) => {
        const p = getShortestPath(state.walls, aiPlayerId, state.playerCount, m);
        const isForward = p.distance < myDist;
        const isLateral = p.distance === myDist;
        return { move: m, dist: p.distance, isForward, isLateral };
      });

      // Avoid jumping over player to sprint
      const nonJumpMoves = movesWithDist.filter((item) => {
        const dx = Math.abs(item.move.x - state.playerPos[aiPlayerId].x);
        const dy = Math.abs(item.move.y - state.playerPos[aiPlayerId].y);
        return dx <= 1 && dy <= 1;
      });

      const pool = nonJumpMoves.length > 0 ? nonJumpMoves : movesWithDist;
      const forwardMoves = pool.filter((m) => m.isForward);
      const lateralMoves = pool.filter((m) => m.isLateral);

      // 85% of the time, moves steadily FORWARD! (Visibly walks towards goal, no fake freeze!)
      // 15% lateral curiosity
      if (forwardMoves.length > 0 && Math.random() < 0.85) {
        // Pick best forward move
        forwardMoves.sort((a, b) => a.dist - b.dist);
        return { type: 'MOVE', x: forwardMoves[0].move.x, y: forwardMoves[0].move.y };
      } else if (lateralMoves.length > 0) {
        return { type: 'MOVE', x: lateralMoves[0].move.x, y: lateralMoves[0].move.y };
      } else if (forwardMoves.length > 0) {
        return { type: 'MOVE', x: forwardMoves[0].move.x, y: forwardMoves[0].move.y };
      } else {
        return { type: 'MOVE', x: pool[0].move.x, y: pool[0].move.y };
      }
    }
  }

  // --- IMMEDIATE WIN CHECK for Medium & Master ---
  for (const m of validMoves) {
    if (isGoalReached(aiPlayerId, state.playerCount, m.x, m.y)) {
      return { type: 'MOVE', x: m.x, y: m.y };
    }
  }

  // =========================================================================
  // TIER 2: MEDIUM (中等) - 强化提升版
  // "紧咬最短路线冲刺，积极战术拦截放墙，让玩家感受到切实吃力"
  // =========================================================================
  if (difficulty === 'medium') {
    // 1. Tactical Wall Evaluation
    // If opponent is threatening (dist <= 5) OR opponent is ahead or tied in race
    if (wallsLeft > 0 && primaryOpponent && (primaryOpponent.dist <= 5 || primaryOpponent.dist <= myDist)) {
      const candidateWalls = generateTacticalCandidateWalls(state, primaryOpponent.path);
      let bestWall: { x: number; y: number; d: 0 | 1; score: number } | null = null;

      for (const w of candidateWalls) {
        if (!isWallSlotGeometricallyValid(state.walls, w.x, w.y, w.d)) continue;
        const check = canPlaceWall(state, w.x, w.y, w.d, aiPlayerId);
        if (!check.valid) continue;

        const simWalls = [...state.walls, { x: w.x, y: w.y, d: w.d, p: aiPlayerId }];
        const newOppPath = getShortestPath(simWalls, primaryOpponent.id, state.playerCount, state.playerPos[primaryOpponent.id]);
        const oppDelay = newOppPath.distance - primaryOpponent.dist;

        // Ensure AI itself is not delayed heavily
        const newMyPath = getShortestPath(simWalls, aiPlayerId, state.playerCount, state.playerPos[aiPlayerId]);
        const selfDelay = newMyPath.distance - myDist;

        if (oppDelay >= 2 && selfDelay <= 1) {
          const score = oppDelay * 25 - selfDelay * 30 + (primaryOpponent.dist <= 3 ? 200 : 0);
          if (!bestWall || score > bestWall.score) {
            bestWall = { x: w.x, y: w.y, d: w.d, score };
          }
        }
      }

      // Drop wall if effective
      if (bestWall) {
        if (primaryOpponent.dist <= 3 || bestWall.score >= 50 || myDist >= primaryOpponent.dist) {
          return { type: 'WALL', x: bestWall.x, y: bestWall.y, d: bestWall.d };
        }
      }
    }

    // 2. Focused Pawn Sprint along shortest BFS path with Jump Advantage
    const rankedMoves = validMoves.map((m) => {
      const path = getShortestPath(state.walls, aiPlayerId, state.playerCount, m);
      const stepDelta = myDist - path.distance; // Positive if advancing
      let score = stepDelta * 25;

      // Prefer following optimal BFS path
      if (myCurrentPath.path.length > 1) {
        const nextOptimal = myCurrentPath.path[1];
        if (m.x === nextOptimal.x && m.y === nextOptimal.y) {
          score += 20;
        }
      }

      // Jump over opponent bonus
      const isJump =
        Math.abs(m.x - state.playerPos[aiPlayerId].x) > 1 ||
        Math.abs(m.y - state.playerPos[aiPlayerId].y) > 1;
      if (isJump && stepDelta > 0) {
        score += 30; // Jump ahead!
      }

      return { move: m, score };
    });

    rankedMoves.sort((a, b) => b.score - a.score);
    return { type: 'MOVE', x: rankedMoves[0].move.x, y: rankedMoves[0].move.y };
  }

  // =========================================================================
  // TIER 3: MASTER (大师) - 顶级国手策略强化版
  // "全盘128槽位深度检索，迷宫回廊封锁，防借步跳跃，对抗式Minimax推演，极难通过"
  // =========================================================================
  const evaluatedActions: CandidateAction[] = [];

  // A. Evaluate Pawn Moves with Strict Leapfrog Denial
  for (const move of validMoves) {
    const newPath = getShortestPath(state.walls, aiPlayerId, state.playerCount, move);
    const stepDelta = myDist - newPath.distance;
    let score = stepDelta * 28;

    // Follow BFS trajectory
    if (myCurrentPath.path.length > 1) {
      const nextOptimal = myCurrentPath.path[1];
      if (move.x === nextOptimal.x && move.y === nextOptimal.y) {
        score += 22;
      }
    }

    // Jump forward bonus
    const isJump =
      Math.abs(move.x - state.playerPos[aiPlayerId].x) > 1 ||
      Math.abs(move.y - state.playerPos[aiPlayerId].y) > 1;
    if (isJump && stepDelta > 0) {
      score += 45;
    }

    // ANTI-LEAPFROG TEST:
    // If AI moves here, does it allow the opponent to jump over AI towards opponent's goal?
    if (primaryOpponent) {
      const simPos = [...state.playerPos];
      simPos[aiPlayerId] = move;
      const simState: GameState = { ...state, playerPos: simPos, waitFor: primaryOpponent.id };
      const oppMovesAfter = getValidPawnMoves(simState, primaryOpponent.id);

      for (const om of oppMovesAfter) {
        const isOppJump =
          Math.abs(om.x - state.playerPos[primaryOpponent.id].x) > 1 ||
          Math.abs(om.y - state.playerPos[primaryOpponent.id].y) > 1;
        if (isOppJump) {
          const oppPathAfter = getShortestPath(state.walls, primaryOpponent.id, state.playerCount, om);
          if (oppPathAfter.distance < primaryOpponent.dist) {
            // Fatal mistake: Gives opponent a leapfrog forward!
            score -= 800;
            break;
          }
        }
      }
    }

    evaluatedActions.push({
      action: { type: 'MOVE', x: move.x, y: move.y },
      score,
      oppDelay: 0,
      selfDelay: 0,
    });
  }

  // B. Exhaustive Search Across All 128 Board Slots for Global Optimal Walls
  if (wallsLeft > 0 && primaryOpponent) {
    const allSlots = generateMasterWallSlots(state, primaryOpponent.path);

    for (const slot of allSlots) {
      if (!isWallSlotGeometricallyValid(state.walls, slot.x, slot.y, slot.d)) continue;
      const check = canPlaceWall(state, slot.x, slot.y, slot.d, aiPlayerId);
      if (!check.valid) continue;

      const simWalls = [...state.walls, { x: slot.x, y: slot.y, d: slot.d, p: aiPlayerId }];

      // Self delay
      const newMyPath = getShortestPath(simWalls, aiPlayerId, state.playerCount, state.playerPos[aiPlayerId]);
      const selfDelay = newMyPath.distance - myDist;

      // Master AI refuses self-harm
      if (selfDelay >= 2) continue;

      // Delay inflicted on opponents
      let totalOppDelayScore = 0;
      let primaryOppDelay = 0;

      for (const opp of opponentInfos) {
        const newOppPath = getShortestPath(simWalls, opp.id, state.playerCount, state.playerPos[opp.id]);
        const delay = newOppPath.distance - opp.dist;
        if (opp.id === primaryOpponent.id) {
          primaryOppDelay = delay;
        }

        if (delay > 0) {
          const weight = opp.threat > 300 ? 3.5 : 1.8;
          totalOppDelayScore += delay * 32 * weight;

          // Catastrophic detour multipliers
          if (delay >= 2) totalOppDelayScore += 80;
          if (delay >= 4) totalOppDelayScore += 280;
          if (delay >= 6) totalOppDelayScore += 700;
          if (delay >= 8) totalOppDelayScore += 1500;
        } else if (delay < 0) {
          totalOppDelayScore -= 400; // Accidentally opened a shortcut!
        }
      }

      if (primaryOppDelay <= 0 && totalOppDelayScore <= 0) continue;

      let wallScore = totalOppDelayScore - selfDelay * 55;

      // Emergency Lockdown: Opponent is within 2 or 3 steps of victory
      if (primaryOpponent.dist <= 2 && primaryOppDelay >= 1) {
        wallScore += 2500 * primaryOppDelay;
      } else if (primaryOpponent.dist <= 3 && primaryOppDelay >= 1) {
        wallScore += 900 * primaryOppDelay;
      }

      // Opponent zero walls exploitation:
      if (primaryOpponent.wallsLeft === 0 && primaryOppDelay >= 1) {
        wallScore += 160 * primaryOppDelay;
      }

      // Wall economy: If AI is already ahead by 3+ steps and safe, conserve walls
      if (myDist + 3 <= primaryOpponent.dist && primaryOppDelay <= 1) {
        wallScore -= 50;
      }

      evaluatedActions.push({
        action: { type: 'WALL', x: slot.x, y: slot.y, d: slot.d },
        score: wallScore,
        oppDelay: primaryOppDelay,
        selfDelay,
      });
    }
  }

  evaluatedActions.sort((a, b) => b.score - a.score);

  if (evaluatedActions.length === 0) {
    if (validMoves.length > 0) {
      return { type: 'MOVE', x: validMoves[0].x, y: validMoves[0].y };
    }
    return null;
  }

  // --- MASTER 2-PLY MINIMAX LOOKAHEAD ---
  // Evaluate top 8 candidates by simulating opponent's strongest counterplay
  const topCandidates = evaluatedActions.slice(0, 8);
  let bestMasterAction = topCandidates[0].action;
  let bestMasterScore = -Infinity;

  for (const candidate of topCandidates) {
    let worstOpponentResponseAdvantage = Infinity;

    if (candidate.action.type === 'MOVE') {
      const simPos = [...state.playerPos];
      simPos[aiPlayerId] = { x: candidate.action.x, y: candidate.action.y };
      const simState: GameState = { ...state, playerPos: simPos, waitFor: primaryOpponent.id };

      // Opponent pawn moves
      const oppMoves = getValidPawnMoves(simState, primaryOpponent.id);
      let oppBestDist = Infinity;
      let oppCanInstantWin = false;

      for (const om of oppMoves) {
        if (isGoalReached(primaryOpponent.id, state.playerCount, om.x, om.y)) {
          oppCanInstantWin = true;
          break;
        }
        const p = getShortestPath(state.walls, primaryOpponent.id, state.playerCount, om);
        if (p.distance < oppBestDist) oppBestDist = p.distance;
      }

      if (oppCanInstantWin) {
        continue; // Immediately eliminate this suicide move!
      }

      const myNewDist = getShortestPath(state.walls, aiPlayerId, state.playerCount, simPos[aiPlayerId]).distance;
      worstOpponentResponseAdvantage = (oppBestDist - myNewDist) * 30 + candidate.score;
    } else {
      const simWalls = [
        ...state.walls,
        {
          x: candidate.action.x,
          y: candidate.action.y,
          d: candidate.action.d,
          p: aiPlayerId,
        },
      ];

      const oppNewPath = getShortestPath(simWalls, primaryOpponent.id, state.playerCount, state.playerPos[primaryOpponent.id]);
      if (oppNewPath.distance <= 1) {
        worstOpponentResponseAdvantage = -5000; // Opponent still 1 step from victory
      } else {
        const myNewDist = getShortestPath(simWalls, aiPlayerId, state.playerCount, state.playerPos[aiPlayerId]).distance;
        worstOpponentResponseAdvantage = (oppNewPath.distance - myNewDist) * 30 + candidate.score;
      }
    }

    if (worstOpponentResponseAdvantage > bestMasterScore) {
      bestMasterScore = worstOpponentResponseAdvantage;
      bestMasterAction = candidate.action;
    }
  }

  return bestMasterAction;
}

/**
 * Tactical candidate walls for Medium AI
 */
function generateTacticalCandidateWalls(
  state: GameState,
  path: Position[]
): { x: number; y: number; d: 0 | 1 }[] {
  const cands: { x: number; y: number; d: 0 | 1 }[] = [];
  const checkSteps = Math.min(3, path.length - 1);

  for (let i = 0; i < checkSteps; i++) {
    const from = path[i];
    const to = path[i + 1];

    if (from.x === to.x) {
      const minY = Math.min(from.y, to.y);
      cands.push({ x: from.x, y: minY, d: 0 });
      cands.push({ x: from.x - 1, y: minY, d: 0 });
    } else if (from.y === to.y) {
      const minX = Math.min(from.x, to.x);
      cands.push({ x: minX, y: from.y, d: 1 });
      cands.push({ x: minX, y: from.y - 1, d: 1 });
    }
  }

  return cands.filter((c) => c.x >= 0 && c.x <= 7 && c.y >= 0 && c.y <= 7);
}

/**
 * Master slot generator:
 * Exhaustively checks path cuts, corridor extensions, board edge seals,
 * plus all other geometrically valid grooves on the 8x8 grid.
 */
function generateMasterWallSlots(
  state: GameState,
  opponentPath: Position[]
): { x: number; y: number; d: 0 | 1 }[] {
  const cands: { x: number; y: number; d: 0 | 1 }[] = [];
  const seen = new Set<string>();

  const add = (x: number, y: number, d: 0 | 1) => {
    if (x >= 0 && x <= 7 && y >= 0 && y <= 7) {
      const key = `${x},${y},${d}`;
      if (!seen.has(key)) {
        seen.add(key);
        cands.push({ x, y, d });
      }
    }
  };

  // 1. Direct path cuts for first 4 steps
  const checkSteps = Math.min(4, opponentPath.length - 1);
  for (let i = 0; i < checkSteps; i++) {
    const from = opponentPath[i];
    const to = opponentPath[i + 1];
    if (from.x === to.x) {
      const minY = Math.min(from.y, to.y);
      add(from.x, minY, 0);
      add(from.x - 1, minY, 0);
      add(from.x, minY, 1);
      add(from.x - 1, minY, 1);
    } else if (from.y === to.y) {
      const minX = Math.min(from.x, to.x);
      add(minX, from.y, 1);
      add(minX, from.y - 1, 1);
      add(minX, from.y, 0);
      add(minX, from.y - 1, 0);
    }
  }

  // 2. Existing wall extensions (T/L corridors)
  for (const w of state.walls) {
    if (w.d === 0) {
      add(w.x - 1, w.y, 0);
      add(w.x + 2, w.y, 0);
      add(w.x, w.y - 1, 1);
      add(w.x + 1, w.y - 1, 1);
      add(w.x, w.y + 1, 1);
      add(w.x + 1, w.y + 1, 1);
    } else {
      add(w.x, w.y - 1, 1);
      add(w.x, w.y + 2, 1);
      add(w.x - 1, w.y, 0);
      add(w.x - 1, w.y + 1, 0);
      add(w.x + 1, w.y, 0);
      add(w.x + 1, w.y + 1, 0);
    }
  }

  // 3. Board Edge Seals (Cols 0, 1, 6, 7)
  for (let y = 0; y <= 7; y++) {
    add(0, y, 1);
    add(1, y, 1);
    add(6, y, 1);
    add(7, y, 1);
  }

  // 4. Also scan all remaining slots on the 8x8 board
  for (let x = 0; x <= 7; x++) {
    for (let y = 0; y <= 7; y++) {
      add(x, y, 0);
      add(x, y, 1);
    }
  }

  return cands;
}
