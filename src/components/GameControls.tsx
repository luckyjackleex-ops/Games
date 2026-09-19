import React from 'react';
import { GameState, GameMode, AiDifficulty } from '../types';
import { PLAYER_CONFIGS } from '../game/rules';
import {
  RotateCw,
  Undo2,
  RefreshCw,
  Volume2,
  VolumeX,
  Footprints,
  Minus,
  MoveVertical,
  Compass,
  Trophy,
  Bot,
  Users,
  Sparkles,
  HelpCircle,
  Smartphone,
  Target,
  History,
} from 'lucide-react';

interface GameControlsProps {
  state: GameState;
  gameMode: GameMode;
  aiDifficulty: AiDifficulty;
  actionMode: 'move' | 'hWall' | 'vWall';
  boardRotation: number;
  showPaths: boolean;
  isMuted: boolean;
  isAiThinking: boolean;
  autoFlipPassAndPlay: boolean;
  onSetActionMode: (mode: 'move' | 'hWall' | 'vWall') => void;
  onSetGameMode: (mode: GameMode) => void;
  onSetAiDifficulty: (diff: AiDifficulty) => void;
  onSetPlayerCount: (count: 2 | 3 | 4) => void;
  onRotateBoard: () => void;
  onTogglePaths: () => void;
  onToggleMute: () => void;
  onUndo: () => void;
  onReset: () => void;
  onOpenTutorial: () => void;
  onOpenPuzzles: () => void;
  onOpenReplay: () => void;
  onToggleAutoFlip: () => void;
}

export const GameControls: React.FC<GameControlsProps> = ({
  state,
  gameMode,
  aiDifficulty,
  actionMode,
  boardRotation,
  showPaths,
  isMuted,
  isAiThinking,
  autoFlipPassAndPlay,
  onSetActionMode,
  onSetGameMode,
  onSetAiDifficulty,
  onSetPlayerCount,
  onRotateBoard,
  onTogglePaths,
  onToggleMute,
  onUndo,
  onReset,
  onOpenTutorial,
  onOpenPuzzles,
  onOpenReplay,
  onToggleAutoFlip,
}) => {
  const activeP = state.waitFor;
  const config = PLAYER_CONFIGS[state.playerCount];
  const activeConfig = config[activeP];
  const activeLeftWalls = state.leftWalls[activeP];

  return (
    <div className="w-full flex flex-col gap-3 text-stone-800">
      {/* Active Turn & Status Card (Clean Light Grey & White) */}
      <div className="bg-white border border-stone-200 rounded-2xl p-3.5 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-4 h-4 rounded-full ring-2 shadow-xs shrink-0"
              style={{
                backgroundColor: activeConfig.color,
                boxShadow: `0 0 8px ${activeConfig.color}66`,
              }}
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-stone-900 text-sm">
                  {state.isOver ? (
                    <span className="text-amber-600 flex items-center gap-1">
                      <Trophy className="w-4 h-4" />
                      对局获胜者：
                      {state.winnerId.map((id) => config[id].name).join('、')}
                    </span>
                  ) : (
                    <span>
                      轮到：{activeConfig.name}
                      {gameMode === 'ai' && activeP !== 0 && (
                        <span className="text-[11px] ml-1.5 px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-mono">
                          AI 思考中...
                        </span>
                      )}
                    </span>
                  )}
                </span>
                {!state.isOver && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 border border-stone-200">
                    第 {state.round} 回合
                  </span>
                )}
              </div>
              <p className="text-[11px] text-stone-500 mt-0.5">
                目标方向：{activeConfig.targetLine.label}
              </p>
            </div>
          </div>

          {/* Quick Utility Icon Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={onOpenTutorial}
              title="新手教程"
              className="p-2 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            <button
              onClick={onTogglePaths}
              title={showPaths ? '隐藏 BFS 路线' : '显示 BFS 最短路线'}
              className={`p-2 rounded-xl border transition-colors ${
                showPaths
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200 border-stone-200'
              }`}
            >
              <Compass className="w-4 h-4" />
            </button>
            <button
              onClick={onRotateBoard}
              title={`旋转棋盘 (${boardRotation}°)`}
              className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 border border-stone-200 transition-colors"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button
              onClick={onToggleMute}
              title={isMuted ? '开启音效' : '静音'}
              className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 border border-stone-200 transition-colors"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Players Status Pills (Remaining Walls) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2.5 pt-2.5 border-t border-stone-100">
          {config.map((player, idx) => {
            const count = state.leftWalls[idx];
            const isTurn = state.waitFor === idx && !state.isOver;
            return (
              <div
                key={`player-stat-${idx}`}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                  isTurn
                    ? 'bg-amber-50/80 border border-amber-300 ring-1 ring-amber-400/40 shadow-xs'
                    : 'bg-stone-50 border border-stone-200'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: player.color }}
                  />
                  <span className="text-stone-700 font-medium truncate">{player.name}</span>
                </div>
                <span className="font-mono font-bold text-amber-700 shrink-0">
                  {count} 墙
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Selector: Touch-Friendly 44px+ for Mobile */}
      {!state.isOver && (
        <div className="bg-white border border-stone-200 rounded-2xl p-3 shadow-xs">
          <div className="text-[11px] font-medium text-stone-500 mb-2 flex items-center justify-between">
            <span>选择当前动作：</span>
            {activeLeftWalls === 0 && (
              <span className="text-amber-600 font-normal">墙壁已耗尽，仅可走子</span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => onSetActionMode('move')}
              disabled={isAiThinking}
              className={`flex items-center justify-center gap-1.5 min-h-[44px] py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                actionMode === 'move'
                  ? 'bg-stone-900 text-white border-stone-900 shadow-sm scale-[1.02]'
                  : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
              }`}
            >
              <Footprints className="w-4 h-4 text-blue-500" />
              <span>移动棋子</span>
            </button>

            <button
              onClick={() => onSetActionMode('hWall')}
              disabled={isAiThinking || activeLeftWalls === 0}
              className={`flex items-center justify-center gap-1.5 min-h-[44px] py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                actionMode === 'hWall'
                  ? 'bg-amber-500 text-stone-950 border-amber-500 shadow-sm scale-[1.02]'
                  : activeLeftWalls === 0
                  ? 'opacity-40 cursor-not-allowed bg-stone-100 border-stone-200 text-stone-400'
                  : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
              }`}
            >
              <Minus className="w-4 h-4 text-amber-700" />
              <span>水平放墙</span>
            </button>

            <button
              onClick={() => onSetActionMode('vWall')}
              disabled={isAiThinking || activeLeftWalls === 0}
              className={`flex items-center justify-center gap-1.5 min-h-[44px] py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                actionMode === 'vWall'
                  ? 'bg-amber-500 text-stone-950 border-amber-500 shadow-sm scale-[1.02]'
                  : activeLeftWalls === 0
                  ? 'opacity-40 cursor-not-allowed bg-stone-100 border-stone-200 text-stone-400'
                  : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
              }`}
            >
              <MoveVertical className="w-4 h-4 text-amber-700" />
              <span>竖直放墙</span>
            </button>
          </div>

          <p className="text-[11px] text-stone-500 mt-2.5 text-center">
            {actionMode === 'move'
              ? '👉 点击棋盘上带光圈的合法格子即可移动'
              : '👉 点击棋盘凹槽缝隙预览放墙，再次点击确认'}
          </p>
        </div>
      )}

      {/* Game Mode Settings (Clean Accordion Style) */}
      <div className="bg-white border border-stone-200 rounded-2xl p-3 shadow-xs flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-stone-600">对战人数：</span>
          <div className="flex gap-1">
            {([2, 3, 4] as const).map((num) => (
              <button
                key={`p-count-${num}`}
                onClick={() => onSetPlayerCount(num)}
                className={`px-3 py-1 text-xs rounded-lg border font-medium transition-colors ${
                  state.playerCount === num
                    ? 'bg-stone-900 text-white border-stone-900 font-semibold'
                    : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                }`}
              >
                {num}人
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-stone-600">对战模式：</span>
          <div className="flex gap-1">
            <button
              onClick={() => onSetGameMode('ai')}
              className={`flex items-center gap-1 px-2 py-1 text-xs rounded-lg border font-medium transition-colors ${
                gameMode === 'ai'
                  ? 'bg-stone-900 text-white border-stone-900 font-semibold shadow-xs'
                  : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
              }`}
            >
              <Bot className="w-3.5 h-3.5 text-amber-400" />
              人机
            </button>
            <button
              onClick={() => onSetGameMode('local')}
              className={`flex items-center gap-1 px-2 py-1 text-xs rounded-lg border font-medium transition-colors ${
                gameMode === 'local'
                  ? 'bg-stone-900 text-white border-stone-900 font-semibold shadow-xs'
                  : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-blue-400" />
              同屏
            </button>
            <button
              onClick={() => onSetGameMode('pass_and_play')}
              className={`flex items-center gap-1 px-2 py-1 text-xs rounded-lg border font-medium transition-colors ${
                gameMode === 'pass_and_play'
                  ? 'bg-stone-900 text-white border-stone-900 font-semibold shadow-xs'
                  : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              面对面
            </button>
          </div>
        </div>

        {gameMode === 'pass_and_play' && (
          <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs">
            <span className="text-stone-600">轮流自动转盘(180°)：</span>
            <button
              onClick={onToggleAutoFlip}
              className={`px-2.5 py-0.5 rounded-md border text-xs font-medium transition-colors ${
                autoFlipPassAndPlay
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold'
                  : 'bg-stone-100 text-stone-500 border-stone-200'
              }`}
            >
              {autoFlipPassAndPlay ? '已开启' : '已关闭'}
            </button>
          </div>
        )}

        {gameMode === 'ai' && (
          <div className="flex items-center justify-between pt-2 border-t border-stone-100">
            <span className="text-xs font-medium text-stone-600">AI 难度：</span>
            <div className="flex gap-1">
              {(['easy', 'medium', 'hard'] as const).map((lvl) => (
                <button
                  key={`ai-lvl-${lvl}`}
                  onClick={() => onSetAiDifficulty(lvl)}
                  className={`px-2.5 py-0.5 text-xs rounded-md border transition-colors ${
                    aiDifficulty === lvl
                      ? 'bg-amber-100 text-amber-900 border-amber-300 font-semibold'
                      : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {lvl === 'easy' ? '初级' : lvl === 'medium' ? '中级' : '大师级'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action Features: Puzzles, Replay, Undo, Reset */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-100">
          <button
            onClick={onOpenPuzzles}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-medium bg-amber-50 border border-amber-200 text-amber-900 hover:bg-amber-100 transition-colors shadow-2xs"
          >
            <Target className="w-3.5 h-3.5 text-amber-600" />
            <span>残局闯关</span>
          </button>

          <button
            onClick={onOpenReplay}
            disabled={state.history.length === 0}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-medium bg-stone-50 border border-stone-200 text-stone-700 hover:bg-stone-100 disabled:opacity-40 disabled:hover:bg-stone-50 transition-colors shadow-2xs"
          >
            <History className="w-3.5 h-3.5 text-blue-600" />
            <span>对局复盘</span>
          </button>
        </div>

        {/* Undo and Reset Buttons */}
        <div className="flex gap-2">
          <button
            onClick={onUndo}
            disabled={state.history.length === 0 || isAiThinking}
            className="flex-1 flex items-center justify-center gap-1 py-2 px-3 rounded-xl text-xs font-medium bg-stone-50 border border-stone-200 text-stone-700 hover:bg-stone-100 disabled:opacity-40 disabled:hover:bg-stone-50 transition-colors"
          >
            <Undo2 className="w-3.5 h-3.5" />
            悔棋
          </button>
          <button
            onClick={onReset}
            className="flex-1 flex items-center justify-center gap-1 py-2 px-3 rounded-xl text-xs font-medium bg-stone-50 border border-stone-200 text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            新开局
          </button>
        </div>
      </div>
    </div>
  );
};
