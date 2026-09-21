/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  GameState,
  GameMode,
  AiDifficulty,
  Position,
  Direction,
  Action,
} from './types';
import {
  createInitialState,
  applyAction,
  canPlaceWall,
  PLAYER_CONFIGS,
} from './game/rules';
import { calculateAiMove } from './game/ai';
import { soundManager } from './game/audio';
import {
  createOnlineRoom,
  joinOnlineRoom,
  applyOnlineRoomAction,
  getRecentRooms,
  subscribeToRoom,
  getOnlineRoom,
  RecentRoomItem,
  resetOnlineRoom,
  startOnlineRoom,
  leaveOnlineRoom,
  getMyPlayerId,
  OnlineRoom,
} from './game/rooms';
import { Board } from './components/Board';
import { HomeScreen } from './components/HomeScreen';
import { WaitingLobby } from './components/WaitingLobby';
import { PlayerStatusBar } from './components/PlayerStatusBar';
import { InGameToolbar } from './components/InGameToolbar';
import { MoveHistory } from './components/MoveHistory';
import { DocViewer } from './components/DocViewer';
import { RulesModal } from './components/RulesModal';
import { InteractiveTutorial } from './components/InteractiveTutorial';
import { PuzzleModal } from './components/PuzzleModal';
import { ReplayViewer } from './components/ReplayViewer';
import { HexagonLogo } from './components/HexagonLogo';
import {
  Trophy,
  History,
  ArrowLeft,
  Share2,
  Check,
  ChevronDown,
} from 'lucide-react';

export default function App() {
  // Screen Navigation: 'home' | 'game' | 'docs'
  const [currentScreen, setCurrentScreen] = useState<'home' | 'game' | 'docs'>('home');

  // Game Configuration
  const [playerCount, setPlayerCount] = useState<2 | 3 | 4>(2);
  const [gameMode, setGameMode] = useState<GameMode>('ai');
  const [aiDifficulty, setAiDifficulty] = useState<AiDifficulty>('medium');
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [currentRoom, setCurrentRoom] = useState<OnlineRoom | null>(null);
  const [myPlayerIndex, setMyPlayerIndex] = useState<number>(0);
  const [recentRooms, setRecentRooms] = useState<RecentRoomItem[]>(() => getRecentRooms());

  // Board Interactive States
  const [actionMode, setActionMode] = useState<'move' | 'hWall' | 'vWall'>('move');
  const [boardRotation, setBoardRotation] = useState<number>(0);
  const [showPaths, setShowPaths] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(() => soundManager.getMuted());
  const [selectedWallSlot, setSelectedWallSlot] = useState<{ x: number; y: number; d: Direction } | null>(null);
  const [lastAction, setLastAction] = useState<Action | null>(null);
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [copiedRoomCode, setCopiedRoomCode] = useState<boolean>(false);

  const handleToggleMute = () => {
    const next = soundManager.toggleMute();
    setIsMuted(next);
  };

  // Modals
  const [isRulesOpen, setIsRulesOpen] = useState<boolean>(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState<boolean>(false);
  const [isPuzzleOpen, setIsPuzzleOpen] = useState<boolean>(false);
  const [isReplayOpen, setIsReplayOpen] = useState<boolean>(false);
  const [showEndGameConfirm, setShowEndGameConfirm] = useState<boolean>(false);

  // Core Game State
  const [state, setState] = useState<GameState>(() => createInitialState(2));

  // Refresh recent rooms list
  const refreshRecentRooms = () => {
    setRecentRooms(getRecentRooms());
  };

  // Synchronize Online Room Updates (Multi-Tab / Multi-Window Sync)
  useEffect(() => {
    if (gameMode !== 'online' || !currentRoomId) return;

    // Load initial room data
    getOnlineRoom(currentRoomId).then((initial) => {
      if (initial) {
        setCurrentRoom({ ...initial, players: [...initial.players] });
        setState(initial.state);
      }
    });

    const unsubscribe = subscribeToRoom(
      currentRoomId,
      (updatedRoom) => {
        const myId = getMyPlayerId();
        const foundIdx = updatedRoom.players.findIndex((p) => p.id === myId);
        if (foundIdx >= 0) {
          setMyPlayerIndex(foundIdx);
        }

        setCurrentRoom((prev) => {
          if (prev && prev.status === 'waiting' && updatedRoom.status === 'playing') {
            soundManager.playGameStart();
          } else if (prev && prev.players.length < updatedRoom.players.length) {
            soundManager.playJoinRoom();
          }
          return { ...updatedRoom, players: [...updatedRoom.players] };
        });
        setState(updatedRoom.state);
      },
      () => {
        // Room was disbanded by host
        setCurrentRoomId(null);
        setCurrentRoom(null);
        setCurrentScreen('home');
      }
    );

    return () => {
      unsubscribe();
    };
  }, [gameMode, currentRoomId]);

  // Handle victory confetti
  const prevWinnerCount = useRef(0);
  useEffect(() => {
    if (state.isOver && state.winnerId.length > 0 && prevWinnerCount.current === 0) {
      soundManager.playVictory();
      confetti({
        particleCount: 90,
        spread: 75,
        origin: { y: 0.6 },
      });
      prevWinnerCount.current = state.winnerId.length;
    } else if (!state.isOver) {
      prevWinnerCount.current = 0;
    }
  }, [state.isOver, state.winnerId]);

  // Mode Initializers from HomeScreen
  const handleStartAiGame = (count: 2 | 3 | 4, difficulty: 'easy' | 'medium' | 'hard') => {
    setPlayerCount(count);
    setGameMode('ai');
    setAiDifficulty(difficulty);
    setCurrentRoomId(null);
    setMyPlayerIndex(0);
    setState(createInitialState(count));
    setActionMode('move');
    setSelectedWallSlot(null);
    setLastAction(null);
    setBoardRotation(0);
    setCurrentScreen('game');
  };

  const handleStartPassAndPlay = (count: 2 | 3 | 4) => {
    setPlayerCount(count);
    setGameMode('pass_and_play');
    setCurrentRoomId(null);
    setMyPlayerIndex(0);
    setState(createInitialState(count));
    setActionMode('move');
    setSelectedWallSlot(null);
    setLastAction(null);
    setBoardRotation(0);
    setCurrentScreen('game');
  };

  const handleCreateRoom = async (count: 2 | 3 | 4) => {
    try {
      const room = await createOnlineRoom(count, '小猫 (房主)', '🐱');
      setPlayerCount(count);
      setGameMode('online');
      setCurrentRoomId(room.id);
      setCurrentRoom(room);
      setMyPlayerIndex(0);
      setState(room.state);
      setActionMode('move');
      setSelectedWallSlot(null);
      setLastAction(null);
      setBoardRotation(0);
      refreshRecentRooms();
      soundManager.playJoinRoom();
      setCurrentScreen('game');
    } catch (err) {
      console.error('Failed to create room', err);
    }
  };

  const handleJoinRoom = async (roomId: string): Promise<{ success: boolean; error?: string }> => {
    const normId = roomId.trim().toLowerCase();
    try {
      const joinResult = await joinOnlineRoom(normId);
      if (joinResult.room) {
        setPlayerCount(joinResult.room.playerCount);
        setGameMode('online');
        setCurrentRoomId(joinResult.room.id);
        setCurrentRoom(joinResult.room);
        setMyPlayerIndex(joinResult.playerIndex >= 0 ? joinResult.playerIndex : 0);
        setState(joinResult.room.state);
        setActionMode('move');
        setSelectedWallSlot(null);
        setLastAction(null);
        setBoardRotation(0);
        refreshRecentRooms();
        soundManager.playJoinRoom();
        setCurrentScreen('game');
        return { success: true };
      } else {
        return {
          success: false,
          error: joinResult.error || '未找到该房间，请核对房间号',
        };
      }
    } catch {
      return { success: false, error: '网络连接异常，请重试' };
    }
  };

  const handleStartOnlineGame = async (fillWithAi: boolean) => {
    if (!currentRoomId) return;
    const room = await startOnlineRoom(currentRoomId, fillWithAi);
    if (room) {
      setCurrentRoom(room);
      setState(room.state);
      soundManager.playGameStart();
    }
  };

  const handleLeaveOnlineRoom = async () => {
    if (currentRoomId) {
      await leaveOnlineRoom(currentRoomId);
    }
    setCurrentRoomId(null);
    setCurrentRoom(null);
    setCurrentScreen('home');
    refreshRecentRooms();
  };

  // Handle Reset / New Game
  const handleResetGame = () => {
    if (gameMode === 'online' && currentRoomId) {
      resetOnlineRoom(currentRoomId).then((resetRoom) => {
        if (resetRoom) setState(resetRoom.state);
      });
      setState(createInitialState(playerCount));
    } else {
      setState(createInitialState(playerCount));
    }
    setActionMode('move');
    setSelectedWallSlot(null);
    setLastAction(null);
    setBoardRotation(0);
    setShowEndGameConfirm(false);
  };

  // Handle Move Pawn
  const handleMovePawn = useCallback(
    (targetPos: Position) => {
      if (state.isOver || isAiThinking) return;

      // In online mode, verify it's my turn
      if (gameMode === 'online' && state.waitFor !== myPlayerIndex) {
        soundManager.playError();
        return;
      }

      const action: Action = { type: 'MOVE', x: targetPos.x, y: targetPos.y };

      if (gameMode === 'online' && currentRoomId) {
        soundManager.playMove();
        const nextState = applyAction(state, action);
        setState(nextState);
        setLastAction(action);
        setSelectedWallSlot(null);
        applyOnlineRoomAction(currentRoomId, action);
      } else {
        const nextState = applyAction(state, action);
        soundManager.playMove();
        setState(nextState);
        setLastAction(action);
        setSelectedWallSlot(null);
      }
    },
    [state, isAiThinking, gameMode, myPlayerIndex, currentRoomId]
  );

  // Handle Place Wall
  const handlePlaceWall = useCallback(
    (wall: { x: number; y: number; d: Direction }) => {
      if (state.isOver || isAiThinking) return;

      // In online mode, verify it's my turn
      if (gameMode === 'online' && state.waitFor !== myPlayerIndex) {
        soundManager.playError();
        return;
      }

      const check = canPlaceWall(state, wall.x, wall.y, wall.d, state.waitFor);
      if (!check.valid) {
        soundManager.playError();
        return;
      }

      const action: Action = { type: 'WALL', x: wall.x, y: wall.y, d: wall.d };

      if (gameMode === 'online' && currentRoomId) {
        soundManager.playWall();
        const nextState = applyAction(state, action);
        setState(nextState);
        setLastAction(action);
        setSelectedWallSlot(null);
        if (nextState.leftWalls[nextState.waitFor] <= 0) {
          setActionMode('move');
        }
        applyOnlineRoomAction(currentRoomId, action);
      } else {
        const nextState = applyAction(state, action);
        soundManager.playWall();
        setState(nextState);
        setLastAction(action);
        setSelectedWallSlot(null);
        if (nextState.leftWalls[nextState.waitFor] <= 0) {
          setActionMode('move');
        }
      }
    },
    [state, isAiThinking, gameMode, myPlayerIndex, currentRoomId]
  );

  // Confirm selected wall slot from mobile confirmation bar
  const handleConfirmSelectedWall = () => {
    if (selectedWallSlot) {
      handlePlaceWall(selectedWallSlot);
    }
  };

  // Undo Move
  const handleUndo = () => {
    if (state.history.length === 0 || isAiThinking || gameMode === 'online') return;
    setSelectedWallSlot(null);
    setLastAction(null);

    // In AI mode, undo 2 steps if possible so human player is back to their turn
    if (gameMode === 'ai' && state.history.length >= 2) {
      const targetHistoryIndex = state.history.length - 2;
      const snapshot = state.history[targetHistoryIndex].state;
      const remainingHistory = state.history.slice(0, targetHistoryIndex);
      const remainingRecords = state.recordList.slice(0, targetHistoryIndex);

      setState({
        ...snapshot,
        history: remainingHistory,
        recordList: remainingRecords,
      });
    } else {
      const prevSnapshot = state.history[state.history.length - 1].state;
      const remainingHistory = state.history.slice(0, -1);
      const remainingRecords = state.recordList.slice(0, -1);

      setState({
        ...prevSnapshot,
        history: remainingHistory,
        recordList: remainingRecords,
      });
    }
  };

  // AI Turn Handling
  useEffect(() => {
    if (state.isOver) return;
    if (gameMode !== 'ai') return;

    const currentP = state.waitFor;
    if (currentP !== 0) {
      setIsAiThinking(true);
      const timer = setTimeout(() => {
        const aiAction = calculateAiMove(state, currentP, aiDifficulty);
        if (aiAction) {
          const nextState = applyAction(state, aiAction);
          if (aiAction.type === 'MOVE') {
            soundManager.playMove();
          } else {
            soundManager.playWall();
          }
          setState(nextState);
          setLastAction(aiAction);
        }
        setIsAiThinking(false);
      }, 450);

      return () => clearTimeout(timer);
    }
  }, [state, gameMode, aiDifficulty]);

  // Copy Room Code / Share Link
  const handleCopyRoom = () => {
    if (!currentRoomId) return;
    try {
      navigator.clipboard.writeText(currentRoomId.toUpperCase());
      setCopiedRoomCode(true);
      setTimeout(() => setCopiedRoomCode(false), 2000);
    } catch {
      // ignore
    }
  };

  // 1. HOME SCREEN VIEW
  if (currentScreen === 'home') {
    return (
      <>
        <HomeScreen
          onStartAiGame={handleStartAiGame}
          onStartPassAndPlay={handleStartPassAndPlay}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onOpenRules={() => setIsRulesOpen(true)}
          onOpenPuzzles={() => setIsPuzzleOpen(true)}
          recentRooms={recentRooms}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />

        {/* Global Modals */}
        <RulesModal
          isOpen={isRulesOpen}
          onClose={() => setIsRulesOpen(false)}
        />
        <PuzzleModal
          isOpen={isPuzzleOpen}
          onClose={() => setIsPuzzleOpen(false)}
        />
      </>
    );
  }

  // 2. WAITING LOBBY VIEW (When in online room and waiting for friends to join)
  if (currentScreen === 'game' && gameMode === 'online' && currentRoom && currentRoom.status === 'waiting') {
    return (
      <WaitingLobby
        room={currentRoom}
        myPlayerId={getMyPlayerId()}
        myPlayerIndex={myPlayerIndex}
        onStartGame={handleStartOnlineGame}
        onLeaveRoom={handleLeaveOnlineRoom}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
      />
    );
  }

  // 2. DOCUMENTATION SCREEN VIEW
  if (currentScreen === 'docs') {
    return (
      <div className="min-h-screen bg-stone-100 text-stone-800 flex flex-col font-sans">
        <header className="border-b border-stone-200 bg-white sticky top-0 z-40 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentScreen('home')}
              className="px-3 py-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>返回主页</span>
            </button>
            <h1 className="text-sm font-bold text-stone-900">产品开发与技术架构文档</h1>
          </div>

          <button
            onClick={() => setCurrentScreen('game')}
            className="px-3.5 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors shadow-2xs"
          >
            进入对战
          </button>
        </header>

        <main className="flex-1 max-w-4xl w-full mx-auto p-4">
          <DocViewer />
        </main>
      </div>
    );
  }

  // 3. IN-GAME SCREEN VIEW (Matching Screenshot 2)
  return (
    <div className="min-h-screen bg-[#f0f4f9] text-stone-800 flex flex-col justify-between selection:bg-amber-200 font-sans select-none">
      {/* Top Header Bar: Replicating Screenshot 2 Header */}
      <header className="w-full max-w-md mx-auto px-3 pt-2 pb-1 flex items-center justify-between">
        {/* Left: 返回主页 button */}
        <button
          id="btn-return-home"
          onClick={() => setCurrentScreen('home')}
          className="px-3 py-1.5 rounded-full bg-white text-stone-700 text-xs font-medium border border-stone-200/90 shadow-2xs hover:bg-stone-50 transition-colors flex items-center gap-1 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>返回主页</span>
        </button>

        {/* Center: 3D Hexagon + Title + Room Code */}
        <div className="flex items-center gap-1.5">
          <HexagonLogo size={24} />
          <div className="flex flex-col items-center">
            <span className="text-sm font-extrabold text-stone-900 tracking-tight leading-none">
              路墙棋
            </span>
            <div className="flex items-center gap-1 mt-0.5">
              {currentRoomId ? (
                <button
                  onClick={handleCopyRoom}
                  className="flex items-center gap-0.5 text-[11px] font-mono text-stone-600 bg-white px-1.5 py-0.2 rounded border border-stone-200 hover:bg-stone-50"
                  title="点击复制房间号"
                >
                  <span>房间号: {currentRoomId.toUpperCase()}</span>
                  {copiedRoomCode ? (
                    <Check className="w-2.5 h-2.5 text-emerald-600" />
                  ) : (
                    <Share2 className="w-2.5 h-2.5 text-stone-400" />
                  )}
                </button>
              ) : (
                <span className="text-[10px] font-medium flex items-center gap-1">
                  {gameMode === 'ai' ? (
                    <>
                      <span className="text-stone-600">人机对战</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                          aiDifficulty === 'hard'
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : aiDifficulty === 'medium'
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {aiDifficulty === 'easy' ? '🌱 简单' : aiDifficulty === 'medium' ? '⚡ 中等' : '👑 大师'}
                      </span>
                    </>
                  ) : (
                    '面对面对战'
                  )}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: 结束游戏 button */}
        <button
          id="btn-end-game"
          onClick={() => setShowEndGameConfirm(true)}
          className="px-3 py-1.5 rounded-full bg-white text-stone-700 text-xs font-medium border border-stone-200/90 shadow-2xs hover:bg-stone-50 transition-colors flex items-center gap-1 cursor-pointer"
        >
          <span>结束游戏</span>
        </button>
      </header>

      {/* Main Board & Controls Container: Constrained to max-w-md */}
      <main className="flex-1 w-full max-w-md mx-auto px-2 sm:px-4 py-1 flex flex-col gap-2">
        {/* Player Status Avatars Bar (Screenshot 2: Badges, Alarm Clocks, Remaining Walls) */}
        <PlayerStatusBar
          state={state}
          myPlayerIndex={myPlayerIndex}
          isHost={myPlayerIndex === 0}
          gameMode={gameMode}
          aiDifficulty={aiDifficulty}
        />

        {/* Victory Celebration Banner */}
        {state.isOver && state.winnerId.length > 0 && (
          <div className="w-full bg-white border-2 border-amber-400 rounded-2xl p-4 text-center shadow-md animate-fade-in my-1">
            <div className="flex items-center justify-center gap-2 text-amber-700 font-bold text-base mb-1">
              <Trophy className="w-5 h-5 text-amber-500" />
              <span>
                🎉 恭喜 {state.winnerId.map((id) => PLAYER_CONFIGS[state.playerCount][id].name).join('、')} 获胜！
              </span>
            </div>
            <p className="text-xs text-stone-600">
              历经 {state.round} 回合精彩博弈，率先突围成功！
            </p>
            <div className="flex items-center justify-center gap-2 mt-3">
              <button
                onClick={handleResetGame}
                className="px-4 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-medium text-xs transition-colors shadow-xs"
              >
                再来一局
              </button>
              <button
                onClick={() => setIsReplayOpen(true)}
                className="px-4 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-medium text-xs transition-colors shadow-xs flex items-center gap-1"
              >
                <History className="w-3.5 h-3.5 text-amber-700" />
                <span>复盘整局</span>
              </button>
              <button
                onClick={() => setCurrentScreen('home')}
                className="px-3.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium text-xs transition-colors"
              >
                返回主页
              </button>
            </div>
          </div>
        )}

        {/* SVG Board */}
        <div className="w-full flex justify-center">
          <Board
            state={state}
            actionMode={actionMode}
            onMovePawn={handleMovePawn}
            onPlaceWall={handlePlaceWall}
            showPaths={showPaths}
            boardRotation={boardRotation}
            isAiThinking={isAiThinking}
            selectedWallSlot={selectedWallSlot}
            onSelectWallSlot={setSelectedWallSlot}
            lastAction={lastAction}
          />
        </div>

        {/* In-Game Toolbar (Streamlined Controls) */}
        <InGameToolbar
          state={state}
          actionMode={actionMode}
          onSetActionMode={(mode) => {
            setActionMode(mode);
            setSelectedWallSlot(null);
          }}
          selectedWallSlot={selectedWallSlot}
          onConfirmWall={handleConfirmSelectedWall}
          onCancelWall={() => setSelectedWallSlot(null)}
          onUndo={handleUndo}
          onRotateBoard={() => setBoardRotation((r) => (r + 90) % 360)}
          onOpenReplay={() => setIsReplayOpen(true)}
          showPaths={showPaths}
          onTogglePaths={() => setShowPaths((p) => !p)}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          gameMode={gameMode}
        />

        {/* Move History Log (Clean Collapsible Accordion) */}
        <div className="w-full mt-1">
          <MoveHistory
            playerCount={state.playerCount}
            recordList={state.recordList}
          />
        </div>
      </main>

      {/* End Game Confirm Dialog */}
      {showEndGameConfirm && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-xs w-full shadow-xl border border-stone-200 flex flex-col gap-3 animate-scale-up">
            <h3 className="font-bold text-base text-stone-900 text-center">
              结束当前对局？
            </h3>
            <p className="text-xs text-stone-600 text-center">
              您可以选择重开一局，或者直接保存棋谱并返回主页。
            </p>
            <div className="flex flex-col gap-2 mt-2">
              <button
                onClick={handleResetGame}
                className="w-full py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold transition-colors"
              >
                重开本局
              </button>
              <button
                onClick={() => {
                  setShowEndGameConfirm(false);
                  setCurrentScreen('home');
                }}
                className="w-full py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium transition-colors"
              >
                返回主页
              </button>
              <button
                onClick={() => setShowEndGameConfirm(false)}
                className="w-full py-1.5 text-stone-400 hover:text-stone-600 text-xs"
              >
                继续游戏
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Beginner Interactive Tutorial Modal */}
      <InteractiveTutorial
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
      />

      {/* Rules Modal */}
      <RulesModal
        isOpen={isRulesOpen}
        onClose={() => setIsRulesOpen(false)}
      />

      {/* Milestone 2: Tactical Puzzles Modal */}
      <PuzzleModal
        isOpen={isPuzzleOpen}
        onClose={() => setIsPuzzleOpen(false)}
      />

      {/* Milestone 2: Game Replay Viewer Modal */}
      <ReplayViewer
        isOpen={isReplayOpen}
        onClose={() => setIsReplayOpen(false)}
        fullHistory={state.history}
        playerCount={state.playerCount}
      />
    </div>
  );
}
