import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Flag, Footprints, Shield, Sparkles, CheckCircle2 } from 'lucide-react';

interface InteractiveTutorialProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InteractiveTutorial: React.FC<InteractiveTutorialProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState<number>(0);

  if (!isOpen) return null;

  const steps = [
    {
      title: '第一步：胜负目标是什么？',
      subtitle: '谁先走到对面底线，谁就获胜！',
      icon: <Flag className="w-5 h-5 text-red-500" />,
      content: (
        <div className="space-y-3">
          <p className="text-stone-600 text-xs leading-relaxed">
            路墙棋非常简单！你是<strong>红方</strong>（初始在最下方），你的目标就是<strong>一路向上冲</strong>，只要踩到最上面一行的任意一个格子，你就赢了！
          </p>
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 flex flex-col items-center justify-center gap-2">
            <div className="w-full max-w-[200px] border border-stone-300 rounded-lg bg-white p-2 text-center text-xs">
              <div className="bg-red-100 text-red-700 font-semibold py-1 rounded mb-2 text-[11px]">
                🚩 你的目标胜利线 (第1行)
              </div>
              <div className="grid grid-cols-5 gap-1 my-2 py-2 border-y border-stone-200">
                <div className="h-6 bg-stone-100 rounded flex items-center justify-center text-[10px] text-stone-400">·</div>
                <div className="h-6 bg-stone-100 rounded flex items-center justify-center text-[10px] text-stone-400">·</div>
                <div className="h-6 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-[10px]">蓝</div>
                <div className="h-6 bg-stone-100 rounded flex items-center justify-center text-[10px] text-stone-400">·</div>
                <div className="h-6 bg-stone-100 rounded flex items-center justify-center text-[10px] text-stone-400">·</div>
              </div>
              <div className="text-stone-400 text-[10px] my-1">↑ 一直向上走 ↑</div>
              <div className="grid grid-cols-5 gap-1 my-2 py-1">
                <div className="h-6 bg-stone-100 rounded flex items-center justify-center text-[10px] text-stone-400">·</div>
                <div className="h-6 bg-stone-100 rounded flex items-center justify-center text-[10px] text-stone-400">·</div>
                <div className="h-6 bg-red-500 text-white rounded-full flex items-center justify-center font-bold text-[10px] ring-2 ring-red-300 animate-pulse">红</div>
                <div className="h-6 bg-stone-100 rounded flex items-center justify-center text-[10px] text-stone-400">·</div>
                <div className="h-6 bg-stone-100 rounded flex items-center justify-center text-[10px] text-stone-400">·</div>
              </div>
              <div className="text-stone-500 text-[10px]">你的初始起点 (第9行)</div>
            </div>
          </div>
          <p className="text-[11px] text-stone-500 text-center">
            同理，蓝方的目标是向下一路走到最底下第 9 行。
          </p>
        </div>
      ),
    },
    {
      title: '第二步：每回合我能干什么？',
      subtitle: '二选一：移动 1 步，或者 放 1 面墙！',
      icon: <Footprints className="w-5 h-5 text-blue-500" />,
      content: (
        <div className="space-y-3">
          <p className="text-stone-600 text-xs leading-relaxed">
            每个回合轮到你时，你只能做两件事中的一件：
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 bg-white border border-stone-200 rounded-xl shadow-xs">
              <div className="font-semibold text-stone-800 flex items-center gap-1 mb-1">
                <span className="w-4 h-4 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-[10px] font-bold">1</span>
                移动棋子
              </div>
              <p className="text-stone-500 text-[11px]">
                向<strong>上下左右</strong>相邻的空格走 1 格（只要中间没有被墙挡住）。
              </p>
            </div>
            <div className="p-3 bg-white border border-stone-200 rounded-xl shadow-xs">
              <div className="font-semibold text-stone-800 flex items-center gap-1 mb-1">
                <span className="w-4 h-4 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-[10px] font-bold">2</span>
                放置墙壁
              </div>
              <p className="text-stone-500 text-[11px]">
                在格子之间的凹槽放 1 面木墙（长 2 格），阻挡对手的路线！
              </p>
            </div>
          </div>
          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800">
            💡 <strong>墙壁有限</strong>：2人对战时每人只有 10 面墙。用完后就只能移动棋子，不能再放墙了！
          </div>
        </div>
      ),
    },
    {
      title: '第三步：遇到对手怎么跳？',
      subtitle: '正向跨跳 & 侧翼斜跳（超核心技巧）',
      icon: <Sparkles className="w-5 h-5 text-amber-500" />,
      content: (
        <div className="space-y-3">
          <p className="text-stone-600 text-xs leading-relaxed">
            当你的棋子跟对手棋子“正面贴贴”挨在一起时，可以<strong>跳过去</strong>：
          </p>
          <div className="space-y-2 text-xs">
            <div className="p-2.5 bg-white border border-stone-200 rounded-lg flex items-start gap-2">
              <span className="font-bold text-emerald-600 shrink-0">① 直线翻越：</span>
              <p className="text-stone-600 text-[11px]">
                对手身后没有墙，你可以直接翻过他，落到他身后（一下子冲出 2 格！非常爽快）。
              </p>
            </div>
            <div className="p-2.5 bg-white border border-stone-200 rounded-lg flex items-start gap-2">
              <span className="font-bold text-amber-600 shrink-0">② 左右斜跳：</span>
              <p className="text-stone-600 text-[11px]">
                如果对手身后正好有一面墙挡着（无法直跳），你可以跳到对手的<strong>左边</strong>或<strong>右边</strong>！
              </p>
            </div>
          </div>
          <p className="text-[11px] text-stone-500">
            在实机棋盘上，系统会自动把所有能走或能跳的格子用<strong>彩色发光圆圈</strong>标出来，你直接点击就能走！
          </p>
        </div>
      ),
    },
    {
      title: '第四步：放墙的唯一铁律！',
      subtitle: '绝对不能彻底封死任何人的所有通路！',
      icon: <Shield className="w-5 h-5 text-red-500" />,
      content: (
        <div className="space-y-3">
          <p className="text-stone-600 text-xs leading-relaxed">
            放墙是路墙棋的灵魂。你可以用墙筑造迷宫，迫使对手绕一大圈路。但是：
          </p>
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
            <div className="font-semibold mb-1">🚫 铁律：不能封死通路</div>
            <p className="text-[11px] leading-normal">
              你放的这面墙，必须保证<strong>无论你自己还是对手，都必须至少保留 1 条可以到达终点的活路</strong>！如果一面墙会把对方彻底困成死局，游戏会亮红灯提示并禁止放置。
            </p>
          </div>
          <div className="p-2.5 bg-stone-100 rounded-lg text-xs text-stone-700 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>只要记住：“<strong>往前走、跨对手、用墙卡、留活路</strong>”，你就能立刻享受对局乐趣！</span>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white border border-stone-200 rounded-2xl max-w-md w-full p-5 shadow-2xl relative text-stone-800 animate-fade-in">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Step Indicator Pill */}
        <div className="flex items-center gap-1.5 mb-3">
          {steps.map((_, i) => (
            <div
              key={`dot-${i}`}
              onClick={() => setStep(i)}
              className={`h-1.5 rounded-full cursor-pointer transition-all ${
                i === step ? 'w-6 bg-amber-500' : 'w-2 bg-stone-200 hover:bg-stone-300'
              }`}
            />
          ))}
          <span className="text-[11px] text-stone-400 font-medium ml-2">
            {step + 1} / {steps.length}
          </span>
        </div>

        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          {steps[step].icon}
          <h3 className="font-bold text-stone-900 text-base">{steps[step].title}</h3>
        </div>
        <p className="text-xs text-amber-700 font-medium mb-4">{steps[step].subtitle}</p>

        {/* Body Content */}
        <div className="min-h-[220px] flex flex-col justify-between">
          {steps[step].content}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-4 mt-4 border-t border-stone-100">
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-stone-600 hover:bg-stone-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              上一步
            </button>

            {step < steps.length - 1 ? (
              <button
                onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
                className="flex items-center gap-1 px-4 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-medium shadow-xs transition-colors"
              >
                下一步
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onClose}
                className="flex items-center gap-1 px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold rounded-lg text-xs shadow-xs transition-colors"
              >
                学会了，马上开局！
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
