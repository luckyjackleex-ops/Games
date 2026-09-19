import React, { useState } from 'react';
import { OnlineRoom } from '../game/rooms';
import { Copy, Check, Users, ArrowLeft, Volume2, VolumeX, Sparkles, Bot } from 'lucide-react';
import { soundManager } from '../game/audio';

interface WaitingLobbyProps {
  room: OnlineRoom;
  myPlayerId: string;
  myPlayerIndex: number;
  onStartGame: (fillWithAi: boolean) => void;
  onLeaveRoom: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

const PLAYER_THEMES = [
  { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', tag: '红方', defaultName: '小猫' },
  { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', tag: '蓝方', defaultName: '小狗' },
  { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', tag: '绿方', defaultName: '小马' },
  { color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', tag: '橙方', defaultName: '小牛' },
];

export const WaitingLobby: React.FC<WaitingLobbyProps> = ({
  room,
  myPlayerId,
  myPlayerIndex,
  onStartGame,
  onLeaveRoom,
  isMuted,
  onToggleMute,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  const isHost = room.hostId === myPlayerId;
  const currentCount = room.players.length;
  const targetCount = room.playerCount;
  const isFull = currentCount >= targetCount;

  const handleCopyCode = async () => {
    soundManager.playMove();
    try {
      await navigator.clipboard.writeText(room.id.toUpperCase());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback prompt
      prompt('请复制房间号：', room.id.toUpperCase());
    }
  };

  const handleCopyInvitation = async () => {
    soundManager.playMove();
    const text = `一起来玩路墙棋吧！房间号：${room.id.toUpperCase()} （主页输入房间号即可进入）`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    } catch {
      prompt('请复制邀请口令：', text);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f4f9] text-stone-800 flex flex-col justify-between p-4 sm:p-6 select-none font-sans">
      {/* Top Navigation Bar */}
      <div className="w-full max-w-sm sm:max-w-md mx-auto flex items-center justify-between pt-1 pb-3">
        <button
          id="btn-lobby-back"
          onClick={onLeaveRoom}
          className="px-3.5 py-1.5 rounded-full bg-white text-stone-700 text-xs font-medium border border-stone-200/90 shadow-xs hover:bg-stone-50 transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-stone-500" />
          <span>{isHost ? '解散并返回' : '退出房间'}</span>
        </button>

        <div className="flex items-center gap-1.5">
          <button
            id="btn-lobby-mute"
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

      {/* Main Content Area */}
      <div className="w-full max-w-sm sm:max-w-md mx-auto flex-1 flex flex-col items-center justify-center gap-4 py-2">
        {/* Lobby Header Badge */}
        <div className="flex flex-col items-center gap-1.5 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold">
            <Users className="w-3.5 h-3.5" />
            <span>联机对战等候室 · {targetCount}人场</span>
          </div>
          <h2 className="text-xl font-bold text-stone-900 tracking-tight">
            {isFull ? '全员已就绪，等待开启' : '等候好友进入房间'}
          </h2>
          <p className="text-xs text-stone-500 max-w-xs">
            把房间号发给好友，好友在主页输入房间号即可实时加入
          </p>
        </div>

        {/* Room Code Showcase Box */}
        <div className="w-full bg-white border border-stone-200/90 rounded-2xl p-4 shadow-sm text-center flex flex-col items-center gap-3">
          <div className="text-[11px] font-semibold tracking-wider text-stone-400 uppercase">
            房间号 (ROOM CODE)
          </div>

          {/* Letter Chips */}
          <div className="flex items-center justify-center gap-2.5">
            {room.id
              .toUpperCase()
              .split('')
              .map((char, i) => (
                <span
                  key={i}
                  className="w-12 h-14 rounded-xl bg-stone-50 border-2 border-stone-200 text-stone-900 font-mono text-2xl font-black flex items-center justify-center shadow-2xs"
                >
                  {char}
                </span>
              ))}
          </div>

          {/* Action Buttons */}
          <div className="w-full grid grid-cols-2 gap-2 mt-1">
            <button
              id="btn-lobby-copy-code"
              onClick={handleCopyCode}
              className="w-full py-2 px-3 rounded-xl bg-stone-50 hover:bg-stone-100 active:scale-[0.98] border border-stone-200 text-stone-700 font-medium text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-stone-500" />}
              <span>{copied ? '已复制房间号' : '复制房间号'}</span>
            </button>

            <button
              id="btn-lobby-copy-invite"
              onClick={handleCopyInvitation}
              className="w-full py-2 px-3 rounded-xl bg-blue-50 hover:bg-blue-100/80 active:scale-[0.98] border border-blue-200 text-blue-700 font-medium text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              {copiedText ? <Check className="w-3.5 h-3.5 text-blue-600" /> : <Sparkles className="w-3.5 h-3.5 text-blue-500" />}
              <span>{copiedText ? '已复制口令' : '复制邀请口令'}</span>
            </button>
          </div>
        </div>

        {/* Players Seats Grid */}
        <div className="w-full flex flex-col gap-2.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-stone-700">席位名单</span>
            <span className="text-xs font-semibold text-stone-500 font-mono">
              已就绪 {currentCount} / {targetCount}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {Array.from({ length: targetCount }).map((_, slotIdx) => {
              const player = room.players[slotIdx];
              const theme = PLAYER_THEMES[slotIdx] || PLAYER_THEMES[0];
              const isMe = player && player.id === myPlayerId;

              if (player) {
                return (
                  <div
                    key={slotIdx}
                    className={`p-3 rounded-xl bg-white border ${theme.border} shadow-2xs flex items-center justify-between`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-full bg-stone-50 border border-stone-200 flex items-center justify-center text-xl shrink-0 shadow-2xs">
                        {player.avatar}
                      </div>
                      <div className="flex flex-col text-left">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-stone-900 leading-tight">
                            {player.name}
                          </span>
                          {player.isHost && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-medium border border-amber-200">
                              房主
                            </span>
                          )}
                          {isMe && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 font-medium border border-blue-200">
                              我
                            </span>
                          )}
                        </div>
                        <span className={`text-[11px] font-medium ${theme.color} mt-0.5`}>
                          {theme.tag}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200/80">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>已就绪</span>
                    </div>
                  </div>
                );
              }

              // Empty Slot Waiting for Friend
              return (
                <div
                  key={slotIdx}
                  className="p-3 rounded-xl bg-white/60 border border-dashed border-stone-300 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full bg-stone-100/70 border border-dashed border-stone-300 flex items-center justify-center text-sm text-stone-400 shrink-0">
                      {slotIdx + 1}
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-semibold text-stone-500">
                        等待好友加入...
                      </span>
                      <span className="text-[11px] text-stone-400 mt-0.5">
                        {theme.tag}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] text-stone-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-stone-300 animate-ping" />
                    <span>等待中</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Controls */}
        <div className="w-full flex flex-col gap-2 mt-2">
          {isHost ? (
            <>
              <button
                id="btn-lobby-start"
                onClick={() => onStartGame(false)}
                disabled={!isFull}
                className={`w-full py-3.5 px-4 rounded-full font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm ${
                  isFull
                    ? 'bg-blue-600 hover:bg-blue-700 text-white active:scale-[0.99]'
                    : 'bg-stone-200 text-stone-400 cursor-not-allowed border border-stone-300/60'
                }`}
              >
                {isFull ? (
                  <>
                    <span>🚀 全员已齐，立即开始游戏</span>
                  </>
                ) : (
                  <>
                    <span>等待好友加入 ({currentCount}/{targetCount})</span>
                  </>
                )}
              </button>

              {!isFull && (
                <button
                  id="btn-lobby-fill-ai"
                  onClick={() => onStartGame(true)}
                  className="w-full py-2.5 px-4 rounded-full bg-white hover:bg-stone-50 active:scale-[0.99] border border-stone-200/90 text-stone-700 font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
                >
                  <Bot className="w-3.5 h-3.5 text-blue-600" />
                  <span>等不及了？空位由智能AI补齐并开始</span>
                </button>
              )}
            </>
          ) : (
            <div className="w-full py-3.5 px-4 rounded-full bg-stone-100 border border-stone-200 text-stone-600 font-medium text-xs flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span>您已就绪，等待房主开启对局...</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer hint */}
      <div className="w-full max-w-sm mx-auto text-center pb-2 text-[11px] text-stone-400">
        提示：不同浏览器窗口或手机进入同一房间号，即可跨端实时同台对决。
      </div>
    </div>
  );
};
