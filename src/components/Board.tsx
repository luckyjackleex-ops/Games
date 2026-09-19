import React, { useState, useMemo } from 'react';
import { GameState, Position, Direction, Wall, Action } from '../types';
import {
  PLAYER_CONFIGS,
  getValidPawnMoves,
  canPlaceWall,
  getShortestPath,
  isWallSlotGeometricallyValid,
} from '../game/rules';

interface BoardProps {
  state: GameState;
  actionMode: 'move' | 'hWall' | 'vWall';
  onMovePawn: (pos: Position) => void;
  onPlaceWall: (wall: { x: number; y: number; d: Direction }) => void;
  showPaths: boolean;
  boardRotation: number;
  isAiThinking: boolean;
  selectedWallSlot: { x: number; y: number; d: Direction } | null;
  onSelectWallSlot: (slot: { x: number; y: number; d: Direction } | null) => void;
  lastAction?: Action | null;
}

export const Board: React.FC<BoardProps> = ({
  state,
  actionMode,
  onMovePawn,
  onPlaceWall,
  showPaths,
  boardRotation,
  isAiThinking,
  selectedWallSlot,
  onSelectWallSlot,
  lastAction,
}) => {
  const [hoverSlot, setHoverSlot] = useState<{ x: number; y: number; d: Direction } | null>(null);

  const activePlayer = state.waitFor;
  const config = PLAYER_CONFIGS[state.playerCount];

  // Calculate valid pawn moves for the active player
  const validMoves = useMemo(() => {
    if (state.isOver || isAiThinking) return [];
    return getValidPawnMoves(state, activePlayer);
  }, [state, activePlayer, isAiThinking]);

  // Compute shortest paths for visualization
  const playerPaths = useMemo(() => {
    if (!showPaths) return [];
    return state.playerPos.map((pos, pIdx) => {
      const sp = getShortestPath(state.walls, pIdx, state.playerCount, pos);
      return {
        playerId: pIdx,
        path: sp.path,
        distance: sp.distance,
        color: config[pIdx]?.color || '#888',
      };
    });
  }, [state, showPaths, config]);

  // Active wall preview (either selected on mobile tap or hovered on desktop)
  const activeWallCandidate = selectedWallSlot || hoverSlot;
  const wallCandidateValidity = useMemo(() => {
    if (!activeWallCandidate) return null;
    return canPlaceWall(state, activeWallCandidate.x, activeWallCandidate.y, activeWallCandidate.d, activePlayer);
  }, [state, activeWallCandidate, activePlayer]);

  // Cell size and groove geometry
  const CELL_SIZE = 42;
  const GAP_SIZE = 10;
  const OFFSET = 26; // margin for A-I and 1-9 labels

  const getCellCoord = (gridX: number, gridY: number) => {
    const x = OFFSET + gridX * (CELL_SIZE + GAP_SIZE);
    const y = OFFSET + gridY * (CELL_SIZE + GAP_SIZE);
    return { x, y };
  };

  const getWallCoord = (gx: number, gy: number, d: Direction) => {
    const cell00 = getCellCoord(gx, gy);
    if (d === 0) {
      // Horizontal wall: spans two cells horizontally across the groove
      const x = cell00.x;
      const y = cell00.y + CELL_SIZE;
      const width = CELL_SIZE * 2 + GAP_SIZE;
      const height = GAP_SIZE;
      return { x, y, width, height };
    } else {
      // Vertical wall: spans two cells vertically across the groove
      const x = cell00.x + CELL_SIZE;
      const y = cell00.y;
      const width = GAP_SIZE;
      const height = CELL_SIZE * 2 + GAP_SIZE;
      return { x, y, width, height };
    }
  };

  const centerCoord = OFFSET + (9 * CELL_SIZE + 8 * GAP_SIZE) / 2;

  return (
    <div className="relative w-full max-w-[460px] aspect-square select-none mx-auto touch-manipulation">
      <svg
        id="quoridor-board-svg"
        viewBox="0 0 510 510"
        className="w-full h-full rounded-2xl bg-[#ebe8e1] p-1.5 shadow-sm border border-stone-300"
      >
        <defs>
          {/* Subtle clean shadows */}
          <filter id="tile-shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="1" floodColor="#78716c" floodOpacity="0.12" />
          </filter>

          <filter id="pawn-shadow-light" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#292524" floodOpacity="0.3" />
          </filter>

          <filter id="wall-shadow-light" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="1.8" floodColor="#44403c" floodOpacity="0.28" />
          </filter>

          {/* Player Pawn Clean Gradients */}
          <radialGradient id="pawn-red-light" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#f87171" />
            <stop offset="70%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#b91c1c" />
          </radialGradient>
          <radialGradient id="pawn-blue-light" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="70%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </radialGradient>
          <radialGradient id="pawn-green-light" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#4ade80" />
            <stop offset="70%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#047857" />
          </radialGradient>
          <radialGradient id="pawn-orange-light" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#fb923c" />
            <stop offset="70%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#c2410c" />
          </radialGradient>

          {/* Wall Warm Wood Tone */}
          <linearGradient id="wood-wall-light" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d97706" />
            <stop offset="60%" stopColor="#b45309" />
            <stop offset="100%" stopColor="#78350f" />
          </linearGradient>
        </defs>

        {/* Board Background Plate */}
        <rect x="6" y="6" width="498" height="498" rx="16" fill="#f0ece4" stroke="#dedad2" strokeWidth="1.5" />

        {/* Rotatable Board Area */}
        <g transform={`rotate(${boardRotation} ${centerCoord} ${centerCoord})`}>
          {/* Goal Line Accent Strips */}
          {/* Player 0: Goal at Top (y=0) */}
          <rect
            x={OFFSET}
            y={OFFSET - 7}
            width={9 * CELL_SIZE + 8 * GAP_SIZE}
            height="4"
            rx="2"
            fill={config[0]?.color || '#ef4444'}
            opacity="0.9"
          />
          {/* Player 1 or 2: Goal at Bottom (y=8) */}
          <rect
            x={OFFSET}
            y={OFFSET + 9 * CELL_SIZE + 8 * GAP_SIZE + 3}
            width={9 * CELL_SIZE + 8 * GAP_SIZE}
            height="4"
            rx="2"
            fill={state.playerCount === 2 ? config[1]?.color : config[2]?.color || '#3b82f6'}
            opacity="0.9"
          />
          {/* If 3 or 4 players: Goal at Left (x=0) */}
          {state.playerCount >= 3 && (
            <rect
              x={OFFSET - 7}
              y={OFFSET}
              width="4"
              height={9 * CELL_SIZE + 8 * GAP_SIZE}
              rx="2"
              fill={config[1]?.color || '#10b981'}
              opacity="0.9"
            />
          )}
          {/* If 4 players: Goal at Right (x=8) */}
          {state.playerCount === 4 && (
            <rect
              x={OFFSET + 9 * CELL_SIZE + 8 * GAP_SIZE + 3}
              y={OFFSET}
              width="4"
              height={9 * CELL_SIZE + 8 * GAP_SIZE}
              rx="2"
              fill={config[3]?.color || '#f97316'}
              opacity="0.9"
            />
          )}

          {/* Coordinate Labels: Columns A-I at bottom and Rows 9-1 along the left */}
          {Array.from({ length: 9 }).map((_, i) => {
            const letter = String.fromCharCode(65 + i);
            const num = (9 - i).toString();
            const cx = OFFSET + i * (CELL_SIZE + GAP_SIZE) + CELL_SIZE / 2;
            const cy = OFFSET + i * (CELL_SIZE + GAP_SIZE) + CELL_SIZE / 2;
            const bottomY = OFFSET + 9 * (CELL_SIZE + GAP_SIZE) - GAP_SIZE + 17;
            return (
              <React.Fragment key={`label-${i}`}>
                {/* Column letter A-I along the bottom */}
                <text
                  x={cx}
                  y={bottomY}
                  textAnchor="middle"
                  fill="#64748b"
                  fontSize="12"
                  fontWeight="600"
                  fontFamily="sans-serif"
                >
                  {letter}
                </text>
                {/* Row number 9-1 along the left (9 at top, 1 at bottom) */}
                <text
                  x={OFFSET - 12}
                  y={cy + 4.5}
                  textAnchor="middle"
                  fill="#64748b"
                  fontSize="12"
                  fontWeight="600"
                  fontFamily="sans-serif"
                >
                  {num}
                </text>
              </React.Fragment>
            );
          })}

          {/* 9x9 Board Tiles (Clean White / Off-white) */}
          {Array.from({ length: 9 }).map((_, r) =>
            Array.from({ length: 9 }).map((_, c) => {
              const { x, y } = getCellCoord(c, r);
              const isValidMove = validMoves.some((m) => m.x === c && m.y === r);

              return (
                <g key={`cell-${c}-${r}`}>
                  <rect
                    id={`cell-${c}-${r}`}
                    x={x}
                    y={y}
                    width={CELL_SIZE}
                    height={CELL_SIZE}
                    rx="5"
                    fill={isValidMove ? '#eff6ff' : '#ffffff'}
                    stroke={isValidMove ? config[activePlayer]?.color : '#e7e5e4'}
                    strokeWidth={isValidMove ? '2' : '1'}
                    filter="url(#tile-shadow)"
                    className={`transition-all duration-150 ${
                      isValidMove ? 'cursor-pointer hover:bg-blue-50' : ''
                    }`}
                    onClick={() => {
                      if (isValidMove && !state.isOver && !isAiThinking) {
                        onMovePawn({ x: c, y: r });
                      }
                    }}
                  />

                  {/* Valid move glowing target indicator */}
                  {isValidMove && (
                    <g
                      className="cursor-pointer"
                      onClick={() => onMovePawn({ x: c, y: r })}
                    >
                      <circle
                        cx={x + CELL_SIZE / 2}
                        cy={y + CELL_SIZE / 2}
                        r="12"
                        fill={config[activePlayer]?.color}
                        fillOpacity="0.2"
                      />
                      <circle
                        cx={x + CELL_SIZE / 2}
                        cy={y + CELL_SIZE / 2}
                        r="5"
                        fill={config[activePlayer]?.color}
                      />
                    </g>
                  )}

                  {/* Last Move Target Marker */}
                  {lastAction && lastAction.type === 'MOVE' && lastAction.x === c && lastAction.y === r && (
                    <circle
                      cx={x + CELL_SIZE / 2}
                      cy={y + CELL_SIZE / 2}
                      r={CELL_SIZE * 0.42}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2"
                      strokeDasharray="3 3"
                      className="animate-spin"
                      style={{ animationDuration: '8s' }}
                    />
                  )}
                </g>
              );
            })
          )}

          {/* Shortest Path Visualization Traces */}
          {showPaths &&
            playerPaths.map(({ playerId, path, color }) => {
              if (path.length < 2) return null;
              const points = path
                .map((p) => {
                  const { x, y } = getCellCoord(p.x, p.y);
                  return `${x + CELL_SIZE / 2},${y + CELL_SIZE / 2}`;
                })
                .join(' ');
              return (
                <polyline
                  key={`path-${playerId}`}
                  points={points}
                  fill="none"
                  stroke={color}
                  strokeWidth="2.5"
                  strokeDasharray="4 4"
                  strokeOpacity="0.75"
                />
              );
            })}

          {/* Placed Walls (Warm Tactile Wood) */}
          {state.walls.map((wall, idx) => {
            const { x, y, width, height } = getWallCoord(wall.x, wall.y, wall.d);
            const wallColor = config[wall.p]?.color || '#ca8a04';
            const isLastPlaced =
              lastAction &&
              lastAction.type === 'WALL' &&
              lastAction.x === wall.x &&
              lastAction.y === wall.y &&
              lastAction.d === wall.d;

            return (
              <g key={`placed-wall-${idx}`} filter="url(#wall-shadow-light)">
                <rect
                  id={`wall-${wall.x}-${wall.y}-${wall.d}`}
                  x={x}
                  y={y}
                  width={width}
                  height={height}
                  rx="3.5"
                  fill="url(#wood-wall-light)"
                  stroke={isLastPlaced ? '#f59e0b' : '#572803'}
                  strokeWidth={isLastPlaced ? '2' : '0.8'}
                />
                {/* Thin player identity line in middle of wall */}
                <rect
                  x={wall.d === 0 ? x + 5 : x + 2}
                  y={wall.d === 0 ? y + 2 : y + 5}
                  width={wall.d === 0 ? width - 10 : width - 4}
                  height={wall.d === 0 ? height - 4 : height - 10}
                  rx="1"
                  fill={wallColor}
                  opacity="0.85"
                />
                {/* Highlight glow pulse if it was just placed */}
                {isLastPlaced && (
                  <rect
                    x={x - 2}
                    y={y - 2}
                    width={width + 4}
                    height={height + 4}
                    rx="5"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="1.5"
                    strokeOpacity="0.8"
                    className="animate-pulse"
                  />
                )}
              </g>
            );
          })}

          {/* Wall Placement Preview (When Hovered or Selected on Mobile) */}
          {activeWallCandidate && !state.isOver && (
            <g filter="url(#wall-shadow-light)">
              {(() => {
                const { x, y, width, height } = getWallCoord(
                  activeWallCandidate.x,
                  activeWallCandidate.y,
                  activeWallCandidate.d
                );
                const isValid = wallCandidateValidity?.valid;
                return (
                  <rect
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    rx="3.5"
                    fill={isValid ? '#22c55e' : '#ef4444'}
                    fillOpacity="0.7"
                    stroke={isValid ? '#15803d' : '#b91c1c'}
                    strokeWidth="1.5"
                    strokeDasharray="4 2"
                    className="animate-pulse"
                  />
                );
              })()}
            </g>
          )}

          {/* Wall Placement Touch Hotspots (8x8 Grid Intersections) */}
          {(actionMode === 'hWall' || actionMode === 'vWall') &&
            !state.isOver &&
            !isAiThinking &&
            state.leftWalls[activePlayer] > 0 &&
            Array.from({ length: 8 }).map((_, gy) =>
              Array.from({ length: 8 }).map((_, gx) => {
                const targetD: Direction = actionMode === 'hWall' ? 0 : 1;
                const { x, y, width, height } = getWallCoord(gx, gy, targetD);
                const isGeoValid = isWallSlotGeometricallyValid(state.walls, gx, gy, targetD);

                if (!isGeoValid) return null;

                // Expand touch area for mobile thumbs
                const touchPadding = 6;

                return (
                  <rect
                    key={`slot-${gx}-${gy}-${targetD}`}
                    x={targetD === 0 ? x : x - touchPadding}
                    y={targetD === 0 ? y - touchPadding : y}
                    width={targetD === 0 ? width : width + touchPadding * 2}
                    height={targetD === 0 ? height + touchPadding * 2 : height}
                    rx="4"
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoverSlot({ x: gx, y: gy, d: targetD })}
                    onMouseLeave={() => setHoverSlot(null)}
                    onClick={() => {
                      const check = canPlaceWall(state, gx, gy, targetD, activePlayer);
                      // On mobile, tap selects the slot for preview/confirmation
                      onSelectWallSlot({ x: gx, y: gy, d: targetD });
                      if (check.valid && !selectedWallSlot) {
                        // If already selected, or desktop immediate placement
                        onPlaceWall({ x: gx, y: gy, d: targetD });
                        onSelectWallSlot(null);
                      }
                    }}
                  />
                );
              })
            )}

          {/* Player Pawns */}
          {state.playerPos.map((pos, pIdx) => {
            const { x, y } = getCellCoord(pos.x, pos.y);
            const cx = x + CELL_SIZE / 2;
            const cy = y + CELL_SIZE / 2;
            const gradientId = ['#pawn-red-light', '#pawn-green-light', '#pawn-blue-light', '#pawn-orange-light'][
              state.playerCount === 2 ? (pIdx === 0 ? 0 : 2) : pIdx
            ];
            const isCurrentTurn = state.waitFor === pIdx && !state.isOver;

            return (
              <g key={`pawn-${pIdx}`} filter="url(#pawn-shadow-light)">
                {/* Active turn halo */}
                {isCurrentTurn && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={CELL_SIZE * 0.44}
                    fill="none"
                    stroke={config[pIdx]?.color || '#3b82f6'}
                    strokeWidth="2"
                    strokeDasharray="4 2"
                    strokeOpacity="0.8"
                    className="animate-spin-slow"
                  />
                )}

                {/* Main Pawn Ring (Matching Screenshot) */}
                <circle
                  id={`pawn-${pIdx}`}
                  cx={cx}
                  cy={cy}
                  r={CELL_SIZE * 0.33}
                  fill="#ffffff"
                  stroke={config[pIdx]?.color || '#3b82f6'}
                  strokeWidth="5.5"
                />

                {/* Center animal emoji matching player avatar */}
                <text
                  x={cx}
                  y={cy + 4.5}
                  textAnchor="middle"
                  fontSize="13"
                  className="select-none pointer-events-none"
                >
                  {['🐱', '🐶', '🐴', '🐮'][pIdx]}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Invalid Wall Warning Banner */}
      {activeWallCandidate && wallCandidateValidity && !wallCandidateValidity.valid && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium shadow-md pointer-events-none transition-all flex items-center gap-1.5 whitespace-nowrap z-20">
          <span>⚠️ {wallCandidateValidity.reason}</span>
        </div>
      )}

      {/* Mobile Wall Confirmation Floating Action Button */}
      {selectedWallSlot && wallCandidateValidity?.valid && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-white/95 border border-stone-200 p-1.5 rounded-xl shadow-lg backdrop-blur-xs">
          <button
            onClick={() => {
              onPlaceWall(selectedWallSlot);
              onSelectWallSlot(null);
            }}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            确认放置
          </button>
          <button
            onClick={() => onSelectWallSlot(null)}
            className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs font-medium rounded-lg transition-colors"
          >
            取消
          </button>
        </div>
      )}
    </div>
  );
};
