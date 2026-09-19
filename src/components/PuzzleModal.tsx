import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Puzzle, PUZZLES } from '../game/puzzles';
import { GameState, Position, Direction, Action } from '../types';
import { applyAction, canPlaceWall, PLAYER_CONFIGS } from '../game/rules';
import { soundManager } from '../game/audio';
import { Board } from './Board';
import {
  Sparkles,
  Trophy,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RotateCcw,
  ChevronRight,
  X,
  Target,
  Award,
  Layers,
  Check,
} from 'lucide-react';

interface PuzzleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PuzzleModal: React.FC<PuzzleModalProps> = ({ isOpen, onClose }) => {
  const [selectedPuzzleIdx, setSelectedPuzzleIdx] = useState<number>(0);
  const [currentPuzzleState, setCurrentPuzzleState] = useState<GameState>(() =>
    JSON.parse(JSON.stringify(PUZZLES[0].initialState))
  );
  const [solvedPuzzles, setSolvedPuzzles] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('quoridor_puzzles_solved');
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    }
    return [];
  });
  const [feedback, setFeedback] = useState<{
    status: 'idle' | 'success' | 'failed';
    message?: string;
  }>({ status: 'idle' });
  const [showHint, setShowHint] = useState<boolean>(false);
  const [actionMode, setActionMode] = useState<'move' | 'hWall' | 'vWall'>('move');
  const [selectedWallSlot, setSelectedWallSlot] = useState<{ x: number; y: number; d: Direction } | null>(null);
  const [lastAction, setLastAction] = useState<Action | null>(null);

  const activePuzzle = PUZZLES[selectedPuzzleIdx];

  // Load selected puzzle
  useEffect(() => {
    if (activePuzzle) {
      setCurrentPuzzleState(JSON.parse(JSON.stringify(activePuzzle.initialState)));
      setFeedback({ status: 'idle' });
      setShowHint(false);
      setActionMode('move');
      setSelectedWallSlot(null);
      setLastAction(null);
    }
  }, [selectedPuzzleIdx, isOpen]);

  // Save solved puzzles to localStorage
  const markPuzzleSolved = (puzzleId: string) => {
    setSolvedPuzzles((prev) => {
      if (prev.includes(puzzleId)) return prev;
      const updated = [...prev, puzzleId];
      try {
        localStorage.setItem('quoridor_puzzles_solved', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleReset = () => {
    setCurrentPuzzleState(JSON.parse(JSON.stringify(activePuzzle.initialState)));
    setFeedback({ status: 'idle' });
    setSelectedWallSlot(null);
    setLastAction(null);
  };

  const handlePawnMove = (targetPos: Position) => {
    if (feedback.status === 'success') return;
    const action: Action = { type: 'MOVE', x: targetPos.x, y: targetPos.y };
    const nextState = applyAction(currentPuzzleState, action);
    soundManager.playMove();
    setCurrentPuzzleState(nextState);
    setLastAction(action);

    const check = activePuzzle.solutionCheck(action, nextState);
    if (check.solved) {
      soundManager.playVictory();
      confetti({ particleCount: 50, spread: 60 });
      setFeedback({ status: 'success', message: activePuzzle.explanation });
      markPuzzleSolved(activePuzzle.id);
    } else {
      soundManager.playError();
      setFeedback({ status: 'failed', message: check.reason });
    }
  };

  const handlePlaceWall = (wall: { x: number; y: number; d: Direction }) => {
    if (feedback.status === 'success') return;
    const checkValidity = canPlaceWall(
      currentPuzzleState,
      wall.x,
      wall.y,
      wall.d,
      currentPuzzleState.waitFor
    );
    if (!checkValidity.valid) {
      soundManager.playError();
      setFeedback({ status: 'failed', message: checkValidity.reason });
      return;
    }

    const action: Action = { type: 'WALL', x: wall.x, y: wall.y, d: wall.d };
    const nextState = applyAction(currentPuzzleState, action);
    soundManager.playWall();
    setCurrentPuzzleState(nextState);
    setSelectedWallSlot(null);
    setLastAction(action);

    const check = activePuzzle.solutionCheck(action, nextState);
    if (check.solved) {
      soundManager.playVictory();
      confetti({ particleCount: 50, spread: 60 });
      setFeedback({ status: 'success', message: activePuzzle.explanation });
      markPuzzleSolved(activePuzzle.id);
    } else {
      soundManager.playError();
      setFeedback({ status: 'failed', message: check.reason });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-stone-200 flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="p-3.5 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm sm:text-base font-bold text-stone-900 leading-tight">
                  残局闯关
                </h2>
                <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full font-bold">
                  通关 {solvedPuzzles.length}/{PUZZLES.length}
                </span>
              </div>
              <p className="text-[11px] text-stone-500">
                通过实战残局掌握跨跳、斜跳与卡位精髓
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

        {/* Level Selector Badges */}
        <div className="px-3 pt-2.5 pb-1 bg-stone-50/80 border-b border-stone-200 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {PUZZLES.map((puzzle, idx) => {
            const isSolved = solvedPuzzles.includes(puzzle.id);
            const isCurrent = idx === selectedPuzzleIdx;
            return (
              <button
                key={puzzle.id}
                onClick={() => setSelectedPuzzleIdx(idx)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                  isCurrent
                    ? 'bg-stone-900 text-white shadow-xs'
                    : isSolved
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                    : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
                }`}
              >
                {isSolved ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <span className="text-[10px] text-stone-400 font-mono">
                    #{idx + 1}
                  </span>
                )}
                <span>第{idx + 1}关</span>
              </button>
            );
          })}
        </div>

        {/* Puzzle Details & Board */}
        <div className="p-3 sm:p-4 overflow-y-auto flex flex-col items-center gap-3">
          {/* Level Goal Card */}
          <div className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-stone-900">
                  {activePuzzle.title}
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                    activePuzzle.difficulty === '入门'
                      ? 'bg-emerald-100 text-emerald-800'
                      : activePuzzle.difficulty === '进阶'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {activePuzzle.difficulty}
                </span>
              </div>
              <button
                onClick={handleReset}
                className="flex items-center gap-1 text-[11px] text-stone-600 hover:text-stone-900 bg-white border border-stone-200 px-2 py-0.5 rounded-lg shadow-2xs"
              >
                <RotateCcw className="w-3 h-3" />
                <span>重试</span>
              </button>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              {activePuzzle.description}
            </p>

            {/* Hint toggler */}
            <div className="mt-2 pt-2 border-t border-stone-200/80 flex items-center justify-between">
              <button
                onClick={() => setShowHint((h) => !h)}
                className="text-[11px] text-amber-700 hover:text-amber-900 flex items-center gap-1 font-medium"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{showHint ? '隐藏提示' : '点击查看提示'}</span>
              </button>
              {showHint && (
                <span className="text-[11px] text-stone-600 italic bg-amber-50 px-2 py-0.5 rounded border border-amber-200 animate-fade-in">
                  💡 {activePuzzle.hint}
                </span>
              )}
            </div>
          </div>

          {/* Mini Board */}
          <div className="w-full max-w-[340px]">
            <Board
              state={currentPuzzleState}
              actionMode={actionMode}
              onMovePawn={handlePawnMove}
              onPlaceWall={handlePlaceWall}
              showPaths={false}
              boardRotation={0}
              isAiThinking={false}
              selectedWallSlot={selectedWallSlot}
              onSelectWallSlot={setSelectedWallSlot}
              lastAction={lastAction}
            />
          </div>

          {/* Mode Selector for Puzzle Actions */}
          <div className="w-full grid grid-cols-3 gap-2 bg-stone-100 p-1 rounded-xl border border-stone-200">
            <button
              onClick={() => {
                setActionMode('move');
                setSelectedWallSlot(null);
              }}
              className={`py-1.5 rounded-lg text-xs font-medium transition-all ${
                actionMode === 'move'
                  ? 'bg-white text-stone-900 shadow-xs font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              移动棋子
            </button>
            <button
              onClick={() => {
                setActionMode('hWall');
                setSelectedWallSlot(null);
              }}
              className={`py-1.5 rounded-lg text-xs font-medium transition-all ${
                actionMode === 'hWall'
                  ? 'bg-white text-stone-900 shadow-xs font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              水平放墙
            </button>
            <button
              onClick={() => {
                setActionMode('vWall');
                setSelectedWallSlot(null);
              }}
              className={`py-1.5 rounded-lg text-xs font-medium transition-all ${
                actionMode === 'vWall'
                  ? 'bg-white text-stone-900 shadow-xs font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              竖直放墙
            </button>
          </div>

          {/* Feedback banner */}
          {feedback.status === 'success' && (
            <div className="w-full bg-emerald-50 border border-emerald-300 rounded-xl p-3 text-center shadow-xs animate-fade-in">
              <div className="flex items-center justify-center gap-1.5 text-emerald-800 font-bold text-xs mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>通关成功！</span>
              </div>
              <p className="text-[11px] text-emerald-700 leading-relaxed mb-2">
                {feedback.message}
              </p>
              {selectedPuzzleIdx < PUZZLES.length - 1 ? (
                <button
                  onClick={() => setSelectedPuzzleIdx((p) => p + 1)}
                  className="px-4 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium inline-flex items-center gap-1 transition-colors shadow-2xs"
                >
                  <span>下一关</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <div className="text-xs font-bold text-amber-700 flex items-center justify-center gap-1">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span>恭喜！你已通关全部残局解谜！</span>
                </div>
              )}
            </div>
          )}

          {feedback.status === 'failed' && (
            <div className="w-full bg-red-50 border border-red-200 rounded-xl p-2.5 text-center text-xs text-red-700 flex items-center justify-center gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{feedback.message || '走法不符合目标，请点击重试再想一想！'}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
