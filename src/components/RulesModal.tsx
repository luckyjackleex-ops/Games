import React from 'react';
import { X, HelpCircle, Footprints, Shield, Flag } from 'lucide-react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white border border-stone-200 rounded-2xl max-w-md w-full p-5 shadow-2xl relative text-stone-800">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-3 text-amber-700 font-bold text-base">
          <HelpCircle className="w-5 h-5 text-amber-600" />
          <span>路墙棋（Quoridor 步步为营）核心规则</span>
        </div>

        <div className="space-y-3 text-xs text-stone-600 leading-relaxed max-h-[65vh] overflow-y-auto pr-1">
          <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
            <div className="font-semibold text-stone-900 flex items-center gap-1.5 mb-1 text-xs text-red-600">
              <Flag className="w-4 h-4 text-red-500" />
              1. 胜利目标
            </div>
            <p>
              最先将自己的棋子移动到<strong>对面任意底线格子</strong>的玩家直接获胜！
            </p>
            <ul className="list-disc pl-4 mt-1 space-y-0.5 text-stone-500">
              <li>红方 (你)：从底部第 9 行出发，先到达顶部第 1 行获胜</li>
              <li>蓝方 (AI)：从顶部第 1 行出发，先到达底部第 9 行获胜</li>
            </ul>
          </div>

          <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
            <div className="font-semibold text-stone-900 flex items-center gap-1.5 mb-1 text-xs text-blue-600">
              <Footprints className="w-4 h-4 text-blue-500" />
              2. 移动棋子与跳步
            </div>
            <p>
              每回合向相邻的上下左右空格移动 1 格（不可穿墙）。
            </p>
            <p className="mt-1 text-stone-700 font-medium">
              遇到敌人：
            </p>
            <ul className="list-disc pl-4 mt-0.5 space-y-0.5 text-stone-500">
              <li>敌人身后无墙：直接翻越跳到敌人后方（一次跨 2 格）；</li>
              <li>敌人身后有墙挡着：可斜跳到敌人左侧或右侧的空位。</li>
            </ul>
          </div>

          <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
            <div className="font-semibold text-stone-900 flex items-center gap-1.5 mb-1 text-xs text-amber-700">
              <Shield className="w-4 h-4 text-amber-600" />
              3. 放置墙壁与绝不封死原则
            </div>
            <p>
              每面木墙长 2 格，放在格子之间的凹槽。
            </p>
            <ul className="list-disc pl-4 mt-1 space-y-0.5 text-stone-500">
              <li><strong>木墙配置：</strong>2人对战每人 10 块板；3人对战每人 7 块板；4人对战每人 5 块板。</li>
              <li>不能重叠，也不能十字交叉穿刺；</li>
              <li><strong>绝不封死原则：</strong>无论怎么放墙，必须保证<strong>每个玩家都有至少一条可以走向终点的通路</strong>！不可把任何人彻底堵死。</li>
            </ul>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-stone-100 text-right">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-medium text-xs transition-colors shadow-xs"
          >
            开始对局
          </button>
        </div>
      </div>
    </div>
  );
};
