import React from 'react';
import { Direction, GameState } from '../types';
import { RotateCw, Undo2, History, Compass, Volume2, VolumeX, Check, X } from 'lucide-react';

interface InGameToolbarProps {
  state: GameState;
  actionMode: 'move' | 'hWall' | 'vWall';
  onSetActionMode: (mode: 'move' | 'hWall' | 'vWall') => void;
  selectedWallSlot: { x: number; y: number; d: Direction } | null;
  onConfirmWall: () => void;
  onCancelWall: () => void;
  onUndo: () => void;
  onRotateBoard: () => void;
  onOpenReplay: () => void;
  showPaths: boolean;
  onTogglePaths: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  gameMode: string;
}

export const InGameToolbar: React.FC<InGameToolbarProps> = ({
  state,
  actionMode,
  onSetActionMode,
  selectedWallSlot,
  onConfirmWall,
  onCancelWall,
  onUndo,
  onRotateBoard,
  onOpenReplay,
  showPaths,
  onTogglePaths,
  isMuted,
  onToggleMute,
  gameMode,
}) => {
  const activePlayer = state.waitFor;
  const leftWalls = state.leftWalls[activePlayer] ?? 0;
  const canPlaceWall = leftWalls > 0 && !state.isOver;

  return (
    <div className="w-full flex flex-col gap-2 max-w-sm mx-auto">
      {/* Mobile Wall Confirmation Floating Bar */}
      {selectedWallSlot && !state.isOver && (
        <div className="w-full bg-amber-50 border-2 border-amber-400 rounded-2xl p-2.5 flex items-center justify-between gap-2 shadow-md animate-fade-in">
          <div className="flex items-center gap-2 pl-1">
            <span className="text-base">🧱</span>
            <div className="text-xs">
              <span className="font-bold text-amber-950">
                已选中{selectedWallSlot.d === 0 ? '横向' : '纵向'}墙体
              </span>
              <p className="text-[11px] text-amber-800">确认放置在该凹槽？</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onCancelWall}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-stone-100 text-stone-700 text-xs font-medium border border-stone-200 transition-colors flex items-center gap-1 shadow-2xs"
            >
              <X className="w-3.5 h-3.5" />
              <span>取消</span>
            </button>
            <button
              onClick={onConfirmWall}
              className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors flex items-center gap-1 shadow-xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>确定放墙</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Action Selector: Move / Horizontal Wall / Vertical Wall */}
      <div className="w-full grid grid-cols-3 gap-2 bg-white/90 p-1.5 rounded-2xl border border-stone-200 shadow-xs">
        {/* Move Button */}
        <button
          id="btn-action-move"
          onClick={() => onSetActionMode('move')}
          className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            actionMode === 'move'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-700 hover:bg-stone-100'
          }`}
        >
          <span>🚶</span>
          <span>移动棋子</span>
        </button>

        {/* Horizontal Wall Button */}
        <button
          id="btn-action-hwall"
          disabled={!canPlaceWall}
          onClick={() => onSetActionMode('hWall')}
          className={`py-2 px-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
            !canPlaceWall
              ? 'opacity-40 cursor-not-allowed text-stone-400'
              : actionMode === 'hWall'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-stone-700 hover:bg-stone-100'
          }`}
        >
          <span>🧱</span>
          <span>横墙</span>
          <span className="text-[10px] px-1 py-0.2 rounded-full bg-stone-200 text-stone-800 font-mono">
            {leftWalls}
          </span>
        </button>

        {/* Vertical Wall Button */}
        <button
          id="btn-action-vwall"
          disabled={!canPlaceWall}
          onClick={() => onSetActionMode('vWall')}
          className={`py-2 px-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
            !canPlaceWall
              ? 'opacity-40 cursor-not-allowed text-stone-400'
              : actionMode === 'vWall'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-stone-700 hover:bg-stone-100'
          }`}
        >
          <span>🧱</span>
          <span>竖墙</span>
          <span className="text-[10px] px-1 py-0.2 rounded-full bg-stone-200 text-stone-800 font-mono">
            {leftWalls}
          </span>
        </button>
      </div>

      {/* Auxiliary Utility Controls Row */}
      <div className="w-full flex items-center justify-between gap-1.5 px-0.5">
        {/* Undo (in offline modes) */}
        {gameMode !== 'online' && (
          <button
            onClick={onUndo}
            disabled={state.history.length === 0 || state.isOver}
            className="flex-1 py-2 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 text-xs font-medium disabled:opacity-40 transition-colors flex items-center justify-center gap-1 shadow-2xs"
            title="悔棋"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>悔棋</span>
          </button>
        )}

        {/* Rotate View */}
        <button
          onClick={onRotateBoard}
          className="flex-1 py-2 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 text-xs font-medium transition-colors flex items-center justify-center gap-1 shadow-2xs"
          title="切换视角"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>视角</span>
        </button>

        {/* Shortest Path Hint */}
        <button
          onClick={onTogglePaths}
          className={`flex-1 py-2 rounded-xl border text-xs font-medium transition-colors flex items-center justify-center gap-1 shadow-2xs ${
            showPaths
              ? 'bg-blue-50 border-blue-300 text-blue-800 font-bold'
              : 'bg-white hover:bg-stone-50 border-stone-200 text-stone-700'
          }`}
          title="显示各方最短路径"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>路径</span>
        </button>

        {/* Replay */}
        <button
          onClick={onOpenReplay}
          disabled={state.history.length === 0}
          className="flex-1 py-2 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 text-xs font-medium disabled:opacity-40 transition-colors flex items-center justify-center gap-1 shadow-2xs"
          title="复盘对局"
        >
          <History className="w-3.5 h-3.5" />
          <span>复盘</span>
        </button>

        {/* Sound toggle */}
        <button
          onClick={onToggleMute}
          className="p-2 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-600 text-xs transition-colors shadow-2xs"
          title={isMuted ? '开启音效' : '静音'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-stone-400" /> : <Volume2 className="w-4 h-4 text-stone-700" />}
        </button>
      </div>
    </div>
  );
};
