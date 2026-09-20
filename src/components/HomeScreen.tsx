import React, { useState } from 'react';
import { HexagonLogo } from './HexagonLogo';
import { RecentRoomItem, formatRelativeTime } from '../game/rooms';
import {
  Lightbulb,
  Bot,
  RotateCw,
  Users,
  Target,
  Sparkles,
  BookOpen,
  Home,
  ArrowRight,
  Plus,
  Play,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface HomeScreenProps {
  onStartAiGame: (playerCount: 2 | 3 | 4, difficulty: 'easy' | 'medium' | 'hard') => void;
  onStartPassAndPlay: (playerCount: 2 | 3 | 4) => void;
  onCreateRoom: (playerCount: 2 | 3 | 4) => void;
  onJoinRoom: (roomId: string) => Promise<{ success: boolean; error?: string } | void> | void;
  onOpenRules: () => void;
  onOpenPuzzles: () => void;
  recentRooms: RecentRoomItem[];
  isMuted: boolean;
  onToggleMute: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onStartAiGame,
  onStartPassAndPlay,
  onCreateRoom,
  onJoinRoom,
  onOpenRules,
  onOpenPuzzles,
  recentRooms,
  isMuted,
  onToggleMute,
}) => {
  const [inputRoomId, setInputRoomId] = useState('');
  const [inputError, setInputError] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Selected configs for quick modals
  const [selectedPlayerCount, setSelectedPlayerCount] = useState<2 | 3 | 4>(2);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  const handleJoinClick = async (targetCode?: string) => {
    const code = (targetCode || inputRoomId).trim();
    if (!code) {
      setInputError('请输入4位房间号');
      return;
    }
    setInputError('');
    setIsJoining(true);
    try {
      const res = await onJoinRoom(code);
      if (res && !res.success && res.error) {
        setInputError(res.error);
      }
    } catch {
      setInputError('进入房间异常，请重试');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f4f9] text-stone-800 flex flex-col justify-between p-4 sm:p-6 select-none font-sans">
      {/* Top Header Bar */}
      <div className="w-full max-w-sm mx-auto flex items-center justify-end pt-1 pb-4">
        {/* Top-right: 声音开关 */}
        <div className="flex items-center gap-1.5">
          <button
            id="btn-home-mute"
            onClick={onToggleMute}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border shadow-xs transition-all flex items-center gap-1.5 cursor-pointer ${
              !isMuted
                ? 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                : 'bg-stone-100 text-stone-500 border-stone-200'
            }`}
            title={!isMuted ? '点击静音' : '点击开启声音'}
          >
            {!isMuted ? (
              <Volume2 className="w-3.5 h-3.5 text-blue-600" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-stone-400" />
            )}
            <span>声音: {!isMuted ? '开' : '关'}</span>
          </button>
        </div>
      </div>

      {/* Main Container: Exact Replication of the screenshot */}
      <div className="w-full max-w-xs sm:max-w-sm mx-auto flex-1 flex flex-col items-center justify-center gap-4 py-2">
        {/* Brand Logo & Title */}
        <div className="flex items-center justify-center gap-3 my-1">
          <HexagonLogo size={46} />
          <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight font-sans">
            路墙棋
          </h1>
        </div>

        {/* Announcement Box */}
        <div className="w-full bg-white border border-stone-200/90 rounded-xl px-3.5 py-2.5 shadow-2xs text-center">
          <p className="text-xs text-stone-600 leading-relaxed">
            公告：支持人机对战、面对面对战、创建房间联机、残局闯关、复盘与视角切换。
          </p>
        </div>

        {/* Main Action Buttons Stack */}
        <div className="w-full flex flex-col gap-2.5 mt-1">
          {/* 1. 查看规则 */}
          <button
            id="btn-home-rules"
            onClick={onOpenRules}
            className="w-full py-3 px-4 rounded-full bg-white hover:bg-stone-50 active:scale-[0.99] text-stone-800 border border-stone-200/90 shadow-xs font-medium text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span className="text-amber-500">💡</span>
            <span>查看规则</span>
          </button>

          {/* 2. 人机对战 */}
          <button
            id="btn-home-ai"
            onClick={() => setShowAiModal(true)}
            className="w-full py-3 px-4 rounded-full bg-white hover:bg-stone-50 active:scale-[0.99] text-stone-800 border border-stone-200/90 shadow-xs font-medium text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span className="text-blue-500">🤖</span>
            <span>人机对战</span>
          </button>

          {/* 3. 面对面对战 */}
          <button
            id="btn-home-pass-play"
            onClick={() => onStartPassAndPlay(2)}
            className="w-full py-3 px-4 rounded-full bg-white hover:bg-stone-50 active:scale-[0.99] text-stone-800 border border-stone-200/90 shadow-xs font-medium text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span className="text-emerald-500">👥</span>
            <span>面对面对战</span>
          </button>

          {/* 4. 残局闯关 */}
          <button
            id="btn-home-puzzles"
            onClick={onOpenPuzzles}
            className="w-full py-3 px-4 rounded-full bg-white hover:bg-stone-50 active:scale-[0.99] text-stone-800 border border-stone-200/90 shadow-xs font-medium text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span className="text-purple-500">🧩</span>
            <span>残局闯关</span>
          </button>

          {/* 6. 创建房间 (Blue pill matching the screenshot) */}
          <button
            id="btn-home-create-room"
            onClick={() => setShowCreateModal(true)}
            className="w-full py-3 px-4 rounded-full bg-gradient-to-r from-blue-500 to-sky-500 hover:from-blue-600 hover:to-sky-600 active:scale-[0.99] text-white shadow-md shadow-blue-300/50 font-semibold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Users className="w-4 h-4 text-white" />
            <span>创建房间</span>
          </button>

          {/* 7. Input: 输入房间号，进指定房间 */}
          <div className="w-full flex flex-col gap-1 mt-1">
            <div className="relative w-full">
              <input
                id="input-room-code"
                type="text"
                value={inputRoomId}
                onChange={(e) => {
                  setInputRoomId(e.target.value.toLowerCase());
                  setInputError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleJoinClick();
                }}
                maxLength={6}
                placeholder="输入房间号，进指定房间"
                className="w-full py-2.5 px-4 text-center rounded-2xl bg-white border border-stone-200 text-stone-800 placeholder:text-stone-400 text-sm shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all uppercase tracking-widest font-mono"
              />
            </div>
            {inputError && (
              <p className="text-center text-xs text-rose-500 font-medium">{inputError}</p>
            )}
          </div>

          {/* 8. 进入房间 button */}
          <button
            id="btn-home-join-room"
            onClick={() => handleJoinClick()}
            disabled={isJoining}
            className={`w-full py-2.5 px-4 rounded-full font-medium text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              isJoining
                ? 'bg-[#ccd8e5] text-slate-500 cursor-wait'
                : 'bg-[#dbe4ee] hover:bg-[#ccd8e5] active:scale-[0.99] text-slate-700'
            }`}
          >
            <Users className="w-4 h-4 text-slate-600" />
            <span>{isJoining ? '正在连接房间...' : '进入房间'}</span>
          </button>
        </div>

        {/* 最近进入过的房间 Section */}
        <div className="w-full mt-3">
          <div className="text-center text-xs font-semibold text-stone-700 mb-2">
            最近进入过的房间
          </div>

          <div className="w-full flex flex-col gap-1.5">
            {recentRooms.length > 0 ? (
              recentRooms.map((room) => (
                <div
                  key={room.id}
                  className="w-full bg-white/90 border border-stone-200/80 rounded-xl px-3 py-2 flex items-center justify-between text-xs shadow-2xs hover:bg-white transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">🏠</span>
                    <span className="font-mono font-bold text-stone-900 tracking-wider">
                      {room.id}
                    </span>
                    <span className="text-[11px] text-stone-500">
                      ({room.playerCount}人对战)
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-stone-400 text-[11px]">
                      {formatRelativeTime(room.visitedAt)}
                    </span>
                    <button
                      onClick={() => handleJoinClick(room.id)}
                      disabled={isJoining}
                      className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-blue-50 hover:text-blue-600 text-stone-700 font-medium text-xs border border-stone-200 transition-colors cursor-pointer"
                    >
                      进入
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-2 text-xs text-stone-400">
                暂无进入记录
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full max-w-sm mx-auto text-center py-3 text-[11px] text-stone-400 flex flex-col items-center gap-1">
        <div>路墙棋 (Quoridor 步步为营) · 纯净简约版</div>
      </footer>

      {/* AI Config Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-xs w-full shadow-xl border border-stone-200 flex flex-col gap-4 animate-scale-up">
            <h3 className="font-bold text-base text-stone-900 text-center flex items-center justify-center gap-1.5">
              <span>🤖</span> 人机对战设置
            </h3>

            <div>
              <label className="text-xs font-semibold text-stone-600 mb-1.5 block">
                对局人数
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedPlayerCount(2)}
                  className={`py-2 px-1 text-xs rounded-xl font-medium border transition-all ${
                    selectedPlayerCount === 2
                      ? 'bg-blue-50 border-blue-400 text-blue-800 font-bold'
                      : 'bg-stone-50 border-stone-200 text-stone-600'
                  }`}
                >
                  <div>2人 (1对1)</div>
                  <div className="text-[10px] text-stone-400 font-normal">各10面墙</div>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPlayerCount(3)}
                  className={`py-2 px-1 text-xs rounded-xl font-medium border transition-all ${
                    selectedPlayerCount === 3
                      ? 'bg-blue-50 border-blue-400 text-blue-800 font-bold'
                      : 'bg-stone-50 border-stone-200 text-stone-600'
                  }`}
                >
                  <div>3人对局</div>
                  <div className="text-[10px] text-amber-600 font-medium">各7面墙</div>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPlayerCount(4)}
                  className={`py-2 px-1 text-xs rounded-xl font-medium border transition-all ${
                    selectedPlayerCount === 4
                      ? 'bg-blue-50 border-blue-400 text-blue-800 font-bold'
                      : 'bg-stone-50 border-stone-200 text-stone-600'
                  }`}
                >
                  <div>4人大乱斗</div>
                  <div className="text-[10px] text-stone-400 font-normal">各5面墙</div>
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-600 mb-1.5 block">
                AI 难度
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['easy', 'medium', 'hard'] as const).map((diff) => {
                  const names = { easy: '简单', medium: '中等', hard: '大师' };
                  const isSelected = selectedDifficulty === diff;
                  return (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => setSelectedDifficulty(diff)}
                      className={`py-2.5 text-xs rounded-xl font-medium border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-50 border-amber-400 text-amber-900 font-bold shadow-2xs'
                          : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                      }`}
                    >
                      {names[diff]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                className="flex-1 py-2 rounded-xl bg-stone-100 text-stone-700 text-xs font-medium hover:bg-stone-200 transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAiModal(false);
                  onStartAiGame(selectedPlayerCount, selectedDifficulty);
                }}
                className="flex-1 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors shadow-xs"
              >
                开始对战
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-xs w-full shadow-xl border border-stone-200 flex flex-col gap-4 animate-scale-up">
            <h3 className="font-bold text-base text-stone-900 text-center flex items-center justify-center gap-1.5">
              <span>👥</span> 创建新房间
            </h3>

            <div>
              <label className="text-xs font-semibold text-stone-600 mb-1.5 block">
                选择对战模式
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedPlayerCount(2)}
                  className={`py-2 px-1 text-xs rounded-xl font-medium border transition-all ${
                    selectedPlayerCount === 2
                      ? 'bg-blue-50 border-blue-400 text-blue-800 font-bold'
                      : 'bg-stone-50 border-stone-200 text-stone-600'
                  }`}
                >
                  <div>双人对局</div>
                  <div className="text-[10px] text-stone-400 font-normal">各10墙</div>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPlayerCount(3)}
                  className={`py-2 px-1 text-xs rounded-xl font-medium border transition-all ${
                    selectedPlayerCount === 3
                      ? 'bg-blue-50 border-blue-400 text-blue-800 font-bold'
                      : 'bg-stone-50 border-stone-200 text-stone-600'
                  }`}
                >
                  <div>三人对局</div>
                  <div className="text-[10px] text-amber-600 font-semibold">各7墙</div>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPlayerCount(4)}
                  className={`py-2 px-1 text-xs rounded-xl font-medium border transition-all ${
                    selectedPlayerCount === 4
                      ? 'bg-blue-50 border-blue-400 text-blue-800 font-bold'
                      : 'bg-stone-50 border-stone-200 text-stone-600'
                  }`}
                >
                  <div>四人大乱斗</div>
                  <div className="text-[10px] text-stone-400 font-normal">各5墙</div>
                </button>
              </div>
            </div>

            <p className="text-[11px] text-stone-500 text-center leading-relaxed">
              创建后将自动生成 4 位房间号，支持同一网络或不同标签页/设备输入房间号随时加入！
            </p>

            <div className="flex gap-2 mt-1">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-2 rounded-xl bg-stone-100 text-stone-700 text-xs font-medium hover:bg-stone-200 transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  onCreateRoom(selectedPlayerCount);
                }}
                className="flex-1 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors shadow-xs"
              >
                创建并进入
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
