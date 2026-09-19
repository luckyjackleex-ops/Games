import { GameState, Wall, Position, Action } from '../types';
import { createInitialState } from './rules';

export interface Puzzle {
  id: string;
  title: string;
  difficulty: '入门' | '进阶' | '大师';
  description: string;
  hint: string;
  explanation: string;
  initialState: GameState;
  // What moves or goal constitutes solving this puzzle
  solutionCheck: (action: Action, resultingState: GameState) => {
    solved: boolean;
    reason?: string;
  };
}

export const PUZZLES: Puzzle[] = [
  {
    id: 'puzzle-1',
    title: '第一关：飞跃突袭',
    difficulty: '入门',
    description: '你的红子距离终点只有两步之遥，正前方被蓝子挡住。利用【直线跨跳】一举冲线！',
    hint: '直接点击对手后方格子，正向翻越敌人！',
    explanation: '当敌人身后无墙壁阻隔时，你可以直接直线跨越他，一次性前进两格冲入胜利底线！',
    initialState: (() => {
      const s = createInitialState(2);
      s.playerPos[0] = { x: 4, y: 2 }; // Red near goal (row 0)
      s.playerPos[1] = { x: 4, y: 1 }; // Blue right in front
      s.waitFor = 0;
      s.round = 7;
      s.walls = [
        { x: 3, y: 3, d: 0, p: 1 },
        { x: 5, y: 3, d: 0, p: 1 },
      ];
      return s;
    })(),
    solutionCheck: (action, state) => {
      if (action.type === 'MOVE' && action.x === 4 && action.y === 0) {
        return { solved: true };
      }
      return { solved: false, reason: '没有直接直跳冲线！尝试点击最上方第1行的目标格。' };
    },
  },
  {
    id: 'puzzle-2',
    title: '第二关：斜跳破防',
    difficulty: '进阶',
    description: '红方面临绝境：蓝方在正前方，且蓝方身后被一面横墙死死封住无法直跳！如何突破？',
    hint: '当正向跨跳被墙挡住时，允许向对手左边或右边的空格斜跳！',
    explanation: '由于对手后方被横墙锁死，规则允许玩家对角斜跳至对手两侧的空位，灵活破防！',
    initialState: (() => {
      const s = createInitialState(2);
      s.playerPos[0] = { x: 4, y: 2 };
      s.playerPos[1] = { x: 4, y: 1 };
      s.waitFor = 0;
      s.round = 10;
      s.leftWalls[0] = 3;
      s.leftWalls[1] = 2;
      s.walls = [
        // Horizontal wall directly behind blue player (between row 0 and 1)
        { x: 4, y: 0, d: 0, p: 1 },
      ];
      return s;
    })(),
    solutionCheck: (action) => {
      if (action.type === 'MOVE' && ((action.x === 3 && action.y === 1) || (action.x === 5 && action.y === 1))) {
        return { solved: true };
      }
      return { solved: false, reason: '请尝试斜跳到对手的左右侧翼空格！' };
    },
  },
  {
    id: 'puzzle-3',
    title: '第三关：关门造梯',
    difficulty: '进阶',
    description: '蓝方只要再走 1 步就能冲线获胜！红方此时必须精准放置一面木墙，拖延蓝方步伐！',
    hint: '选择【水平放墙】，将墙放置在蓝方冲线正前方的必经之路，阻断其前进！',
    explanation: '放置木墙成功阻断了蓝方的直接得分点，迫使对手绕路，为己方争夺至关重要的回合差！',
    initialState: (() => {
      const s = createInitialState(2);
      s.playerPos[0] = { x: 4, y: 5 };
      s.playerPos[1] = { x: 4, y: 7 }; // Blue is at row 7, goal is row 8!
      s.waitFor = 0; // Red's turn
      s.round = 12;
      s.leftWalls[0] = 5;
      s.leftWalls[1] = 1;
      s.walls = [
        { x: 2, y: 6, d: 1, p: 0 },
        { x: 5, y: 6, d: 1, p: 0 },
      ];
      return s;
    })(),
    solutionCheck: (action, state) => {
      // Placing a horizontal wall at y=7 between row 7 and 8 blocks blue from directly winning
      if (action.type === 'WALL' && action.d === 0 && action.y === 7 && (action.x === 3 || action.x === 4)) {
        return { solved: true };
      }
      return { solved: false, reason: '蓝方马上就要冲线了！必须在蓝方前进的第8格前放一堵横墙！' };
    },
  },
  {
    id: 'puzzle-4',
    title: '第四关：反向压迫',
    difficulty: '大师',
    description: '双方陷入拉锯战。蓝方正欲向左突破绕开墙壁。红方使用竖直墙截断其退路！',
    hint: '切换为【竖直放墙】，在走廊尽头插上一面竖墙，将蓝方逼入长回头路！',
    explanation: '大师级的精髓在于预判对手的绕行路线，在其必经走廊上打上“死结”，迫使其走更远的弯路！',
    initialState: (() => {
      const s = createInitialState(2);
      s.playerPos[0] = { x: 2, y: 3 };
      s.playerPos[1] = { x: 5, y: 4 };
      s.waitFor = 0;
      s.round = 15;
      s.leftWalls[0] = 4;
      s.leftWalls[1] = 2;
      s.walls = [
        { x: 4, y: 4, d: 0, p: 0 },
        { x: 6, y: 4, d: 0, p: 0 },
      ];
      return s;
    })(),
    solutionCheck: (action) => {
      if (action.type === 'WALL' && action.d === 1 && (action.x === 6 || action.x === 7) && action.y === 4) {
        return { solved: true };
      }
      return { solved: false, reason: '尝试在右侧走廊放置一面竖直墙，封锁敌人的横向逃逸路线！' };
    },
  },
];
