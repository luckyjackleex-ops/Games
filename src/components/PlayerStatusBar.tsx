import React from 'react';
import { GameState } from '../types';
import { PLAYER_CONFIGS } from '../game/rules';

interface PlayerStatusBarProps {
  state: GameState;
  myPlayerIndex?: number;
  isHost?: boolean;
  gameMode: string;
  aiDifficulty?: 'easy' | 'medium' | 'hard';
}

export const DEFAULT_AVATARS = ['🐱', '🐶', '🐴', '🐮'];
export const ANIMAL_NAMES = ['小猫', '小狗', '小马', '小牛'];

export const PlayerStatusBar: React.FC<PlayerStatusBarProps> = ({
  state,
  myPlayerIndex = 0,
  isHost = true,
  gameMode,
  aiDifficulty = 'medium',
}) => {
  const configs = PLAYER_CONFIGS[state.playerCount];
  const activePlayer = state.waitFor;

  const diffLabels = {
    easy: { name: '简单', color: 'bg-amber-100 text-amber-800 border-amber-300' },
    medium: { name: '中等', color: 'bg-blue-100 text-blue-800 border-blue-300' },
    hard: { name: '大师', color: 'bg-purple-100 text-purple-900 border-purple-300' },
  };

  // Player status prompt text
  const getStatusText = () => {
    if (state.isOver) {
      if (state.winnerId.length > 0) {
        const winner = configs[state.winnerId[0]];
        return `🎉 ${winner?.name || '获胜者'} 赢得胜利！`;
      }
      return '对局已结束';
    }

    if (gameMode === 'online') {
      if (activePlayer === myPlayerIndex) {
        return '轮到我方操作（点击棋盘移动或放置墙体）';
      }
      return `等玩家${activePlayer + 1}操作`;
    }

    if (gameMode === 'ai') {
      if (activePlayer === 0) {
        return '轮到您操作（移动棋子或放置木墙）';
      }
      return `🤖 AI · ${diffLabels[aiDifficulty].name} (${configs[activePlayer]?.name || '对手'}) 思考中...`;
    }

    if (gameMode === 'pass_and_play') {
      return `轮到 ${configs[activePlayer]?.name} 操作（面对面桌游）`;
    }

    return `等玩家${activePlayer + 1}操作`;
  };

  return (
    <div className="w-full flex flex-col items-center gap-2 pt-1 pb-2">
      {/* Avatars Row */}
      <div className="w-full flex items-center justify-around px-1 max-w-sm mx-auto">
        {Array.from({ length: state.playerCount }).map((_, idx) => {
          const cfg = configs[idx];
          const isTurn = state.waitFor === idx && !state.isOver;
          const isMe = gameMode === 'online' ? myPlayerIndex === idx : idx === 0;
          const isCurrentHost = idx === 0;
          const wallsLeft = state.leftWalls[idx] ?? 0;
          const avatarEmoji = DEFAULT_AVATARS[idx] || '👤';

          return (
            <div key={`player-avatar-${idx}`} className="flex flex-col items-center gap-1">
              {/* Avatar Container with Badges */}
              <div className="relative">
                {/* Badges on Top-Left */}
                <div className="absolute -top-1.5 -left-1.5 z-10 flex flex-col gap-0.5 items-start">
                  {isCurrentHost && gameMode !== 'ai' && (
                    <span className="px-1.5 py-0.2 rounded-full bg-[#f97316] text-white text-[9px] font-bold leading-tight shadow-2xs">
                      房主
                    </span>
                  )}
                  {isMe && (
                    <span className="px-1.5 py-0.2 rounded-full bg-[#ef4444] text-white text-[9px] font-bold leading-tight shadow-2xs">
                      我
                    </span>
                  )}
                  {gameMode === 'ai' && idx > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold leading-tight shadow-2xs ${
                        aiDifficulty === 'hard'
                          ? 'bg-purple-600 text-white'
                          : aiDifficulty === 'medium'
                          ? 'bg-blue-600 text-white'
                          : 'bg-amber-500 text-white'
                      }`}
                    >
                      AI·{diffLabels[aiDifficulty].name}
                    </span>
                  )}
                </div>

                {/* Alarm clock on Top-Right when it's their turn */}
                {isTurn && (
                  <div className="absolute -top-2 -right-2 z-10 text-xs animate-bounce pointer-events-none">
                    <span>⏰</span>
                  </div>
                )}

                {/* Avatar Circle */}
                <div
                  className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-white border-2 flex items-center justify-center text-xl sm:text-2xl shadow-xs transition-all ${
                    isTurn
                      ? 'ring-2 ring-offset-1 scale-105 shadow-md'
                      : 'border-stone-300 opacity-90'
                  }`}
                  style={{
                    borderColor: cfg?.color || '#3b82f6',
                    outlineColor: cfg?.color || '#3b82f6',
                  }}
                >
                  <span>{avatarEmoji}</span>
                </div>

                {/* Bottom-Right Player Number Badge */}
                <div
                  className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-2xs border border-white"
                  style={{ backgroundColor: cfg?.color || '#3b82f6' }}
                >
                  {idx + 1}
                </div>
              </div>

              {/* Remaining Walls Row */}
              <div className="flex items-center gap-1 mt-0.5">
                {/* Ring matching the pawn */}
                <span
                  className="w-2.5 h-2.5 rounded-full border-2 inline-block shrink-0"
                  style={{ borderColor: cfg?.color || '#3b82f6', backgroundColor: '#ffffff' }}
                />
                <span className="text-[11px] font-medium text-stone-700">
                  剩 {wallsLeft} 墙
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Centered Turn Status Text */}
      <div className="w-full text-center mt-0.5">
        <div className="inline-block px-3 py-1 rounded-full bg-white/80 border border-stone-200/80 text-xs sm:text-sm font-semibold text-stone-800 shadow-2xs">
          {getStatusText()}
        </div>
      </div>
    </div>
  );
};
