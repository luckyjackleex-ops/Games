import React, { useState, useEffect } from 'react';
import { GameState, Position, Direction, Action } from '../types';
import { PLAYER_CONFIGS } from '../game/rules';
import { Board } from './Board';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  X,
  History,
} from 'lucide-react';

interface ReplayViewerProps {
  isOpen: boolean;
  onClose: () => void;
  fullHistory: {
    state: Omit<GameState, 'history'>;
    action?: Action;
    notation?: string;
  }[];
  playerCount: 2 | 3 | 4;
}

export const ReplayViewer: React.FC<ReplayViewerProps> = ({
  isOpen,
  onClose,
  fullHistory,
  playerCount,
}) => {
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // When opened, reset to the final step or step 0
  useEffect(() => {
    if (isOpen) {
      setStepIndex(fullHistory.length > 0 ? fullHistory.length - 1 : 0);
      setIsPlaying(false);
    }
  }, [isOpen, fullHistory.length]);

  // Auto-play timer
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setStepIndex((prev) => {
        if (prev >= fullHistory.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 1200);

    return () => clearInterval(interval);
  }, [isPlaying, fullHistory.length]);

  if (!isOpen || fullHistory.length === 0) return null;

  const currentStep = fullHistory[stepIndex];
  const currentState: GameState = {
    ...currentStep.state,
    history: [],
  };

  const config = PLAYER_CONFIGS[playerCount];

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-stone-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-3.5 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-stone-900 leading-tight">
                对局复盘与回放
              </h2>
              <p className="text-[11px] text-stone-500">
                步数: 第 {stepIndex + 1} / {fullHistory.length} 手
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content with Mini Board Preview */}
        <div className="p-3 sm:p-4 overflow-y-auto flex flex-col items-center gap-3">
          {/* Action description banner */}
          <div className="w-full bg-stone-100 rounded-xl p-2.5 flex items-center justify-between text-xs border border-stone-200">
            <div className="flex items-center gap-2">
              <span className="font-bold text-stone-700">当前行动:</span>
              {currentStep.action ? (
                <span className="font-mono font-semibold text-stone-900 bg-white px-2 py-0.5 rounded border border-stone-200">
                  {currentStep.notation || '移动'}
                </span>
              ) : (
                <span className="text-stone-500 italic">开局初始状态</span>
              )}
            </div>
            <div className="text-[11px] text-stone-500">
              回合: 第 {currentState.round} 回合
            </div>
          </div>

          {/* Board rendering */}
          <div className="w-full max-w-[340px]">
            <Board
              state={currentState}
              actionMode="move"
              onMovePawn={() => {}}
              onPlaceWall={() => {}}
              showPaths={false}
              boardRotation={0}
              isAiThinking={false}
              selectedWallSlot={null}
              onSelectWallSlot={() => {}}
              lastAction={currentStep.action}
            />
          </div>

          {/* Player stats at this snapshot */}
          <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2">
            {currentState.playerPos.map((pos, idx) => (
              <div
                key={idx}
                className="bg-stone-50 border border-stone-200 rounded-xl p-2 flex items-center gap-2"
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: config[idx]?.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-bold text-stone-800 truncate">
                    {config[idx]?.name}
                  </div>
                  <div className="text-[10px] text-stone-500">
                    余墙: {currentState.leftWalls[idx]}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Control Toolbar */}
        <div className="p-3 bg-stone-50 border-t border-stone-200 flex flex-col gap-2">
          {/* Step scrub slider */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-stone-500 w-6 text-right">1</span>
            <input
              type="range"
              min="0"
              max={fullHistory.length - 1}
              value={stepIndex}
              onChange={(e) => {
                setIsPlaying(false);
                setStepIndex(Number(e.target.value));
              }}
              className="flex-1 accent-stone-800 h-1.5 bg-stone-200 rounded-lg cursor-pointer"
            />
            <span className="text-[10px] text-stone-500 w-6">
              {fullHistory.length}
            </span>
          </div>

          {/* Playback Buttons */}
          <div className="flex items-center justify-center gap-2 sm:gap-4">
            <button
              onClick={() => {
                setIsPlaying(false);
                setStepIndex(0);
              }}
              className="p-2 rounded-xl bg-white border border-stone-200 hover:bg-stone-100 text-stone-700 transition-colors shadow-2xs"
              title="回到起点"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                setIsPlaying(false);
                setStepIndex((p) => Math.max(0, p - 1));
              }}
              disabled={stepIndex <= 0}
              className="p-2 rounded-xl bg-white border border-stone-200 hover:bg-stone-100 disabled:opacity-40 text-stone-700 transition-colors shadow-2xs"
              title="上一手"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsPlaying((p) => !p)}
              className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-medium text-xs flex items-center gap-1.5 shadow-xs transition-colors"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4" />
                  <span>暂停</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>自动播放</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                setIsPlaying(false);
                setStepIndex((p) => Math.min(fullHistory.length - 1, p + 1));
              }}
              disabled={stepIndex >= fullHistory.length - 1}
              className="p-2 rounded-xl bg-white border border-stone-200 hover:bg-stone-100 disabled:opacity-40 text-stone-700 transition-colors shadow-2xs"
              title="下一手"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                setIsPlaying(false);
                setStepIndex(fullHistory.length - 1);
              }}
              className="p-2 rounded-xl bg-white border border-stone-200 hover:bg-stone-100 text-stone-700 transition-colors shadow-2xs"
              title="跳到终局"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
