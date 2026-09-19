import React from 'react';
import { MoveRecord } from '../types';
import { PLAYER_CONFIGS } from '../game/rules';
import { History, ScrollText } from 'lucide-react';

interface MoveHistoryProps {
  playerCount: 2 | 3 | 4;
  recordList: MoveRecord[];
}

export const MoveHistory: React.FC<MoveHistoryProps> = ({ playerCount, recordList }) => {
  const configs = PLAYER_CONFIGS[playerCount];

  if (recordList.length === 0) {
    return (
      <div className="bg-white border border-stone-200 rounded-2xl p-3 text-center text-xs text-stone-400">
        <ScrollText className="w-4 h-4 mx-auto mb-1 opacity-40 text-stone-500" />
        暂无对局走子记录，点击棋盘开始对弈
      </div>
    );
  }

  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-3 shadow-xs flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs text-stone-500 font-medium">
        <span className="flex items-center gap-1.5">
          <History className="w-3.5 h-3.5 text-amber-600" />
          走子记录 ({recordList.length} 步)
        </span>
      </div>

      <div className="max-h-28 overflow-y-auto space-y-1 pr-1 font-mono text-[11px]">
        {recordList.map((rec, idx) => {
          const pConfig = configs[rec.playerId];
          return (
            <div
              key={`record-${idx}`}
              className="flex items-center justify-between py-1 px-2 rounded-lg bg-stone-50 border border-stone-100"
            >
              <div className="flex items-center gap-1.5 truncate">
                <span className="text-stone-400 text-[10px] w-4 text-right">{idx + 1}.</span>
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: pConfig?.color || '#888' }}
                />
                <span className="text-stone-700 font-medium truncate">{pConfig?.name || `P${rec.playerId + 1}`}</span>
              </div>
              <span className="text-amber-800 font-semibold">{rec.notation}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
