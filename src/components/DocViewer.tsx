import React, { useState } from 'react';
import {
  FileText,
  Copy,
  Check,
  Download,
  BookOpen,
  Cpu,
  Layers,
  Network,
  CalendarCheck,
  ShieldAlert,
} from 'lucide-react';

export const PRD_MARKDOWN_CONTENT = `# 《路墙棋（步步为营 Quoridor）》产品需求文档 (PRD) 与技术架构方案

---

## 一、 项目概述与产品定位

### 1.1 背景与起源
**路墙棋**（英文原名 **Quoridor**，国内常译为“步步为营”或“路墙棋”）是著名的门萨（Mensa）精选智力策略棋类游戏，1997 年获得 Mensa Mind Game 奖项。微信公众号《线下聚会游戏》（作者：hullqin，在线版本：game.hullqin.cn/lqq）将其以无广告、零门槛网页版形式推出，深得聚会玩家与棋类爱好者的喜爱。

### 1.2 产品定位与核心体验目标
- **定位**：轻量级、免安装、多端自适应（手机/平板/桌面）的纯粹回合制抽象棋类对战平台。
- **支持模式**：
  1. **单机/人机对战**（初级、中级、大师级 BFS 剪枝 AI）；
  2. **同屏轮流对战**（适合朋友线下聚会同屏 Pass & Play）；
  3. **在线房间联机对战**（支持 2~4 人房间匹配、信令同步、观战与棋谱复盘）。
- **核心魅力**：规则极简（仅两种动作：走子或筑墙），但空间博弈极深。不仅要为自己规划最短通路，更要通过筑墙巧妙阻截对手、迫使对手绕远路，同时必须遵守“不得封死通路”的底线规则。

---

## 二、 核心棋规逻辑与数学模型定义

### 2.1 坐标系与棋盘规格
1. **棋盘格子网格**：$9 \\times 9$ 正方形格子，坐标为 $(x, y)$，其中 $x \\in [0, 8]$（对应 A~I 列），$y \\in [0, 8]$（对应 1~9 行）。
2. **墙壁凹槽网格**：$8 \\times 8$ 交叉路口，坐标为 $(gx, gy)$，其中 $gx \\in [0, 7], gy \\in [0, 7]$。
3. **墙壁尺寸与方向**：
   - 墙壁长度恒为 $2$ 个格子单位，厚度贴合网格缝隙。
   - 方向 $d = 0$（水平墙 Horizontal）：阻隔 $(x, y) \\leftrightarrow (x, y+1)$ 以及 $(x+1, y) \\leftrightarrow (x+1, y+1)$ 的连通。
   - 方向 $d = 1$（竖直墙 Vertical）：阻隔 $(x, y) \\leftrightarrow (x+1, y)$ 以及 $(x, y+1) \\leftrightarrow (x+1, y+1)$ 的连通。

### 2.2 玩家配置与获胜判定
| 模式 | 初始位置 | 目标底线 | 初始墙壁数 |
| :--- | :--- | :--- | :--- |
| **红方 (P1)** | $(4, 8)$ 底部中央 | $y = 0$（顶行任意格） | 2人:10 / 3人:7 / 4人:5 |
| **蓝方 (P2)** | $(4, 0)$ 顶部中央 | $y = 8$（底行任意格） | 2人:10 / 3人:7 / 4人:5 |
| **绿方 (P3)** | $(8, 4)$ 右侧中央 | $x = 0$（最左列任意格） | 3人:7 / 4人:5 |
| **橙方 (P4)** | $(0, 4)$ 左侧中央 | $x = 8$（最右列任意格） | 4人:5 |

### 2.3 行棋与跳步算法 (Jump Rules)
每个回合轮到的玩家必须且仅能二选一：**移动棋子** 或 **放置一面墙壁**。
1. **标准移动**：向上下左右相邻且**无墙壁阻挡**的空格移动 1 格。
2. **正向跨跳 (Straight Jump)**：
   - 若相邻一格存在敌方棋子，且该敌方棋子正后方**无墙阻挡且未出界且无其他棋子**，己方棋子可直接翻过敌方，落入其后方一格（距离原点 2 格）。
3. **侧向斜跳 (Diagonal Jump)**：
   - 若敌方棋子正后方被墙壁、棋盘边缘或第三方棋子阻挡，导致无法直线跨跳，己方棋子可斜跳至敌方棋子左侧或右侧的空位（前提是敌方格子与该侧翼格子之间无墙壁阻隔）。

### 2.4 筑墙约束与连通性校验 (Fair-Play Constraint)
1. **几何无重叠与无交叉**：
   - 同方向墙壁不可重叠：$(x, y, d)$ 不能与 $(x-1, y, d)$ 或 $(x+1, y, d)$（水平）重叠。
   - 垂直方向不能相交交叉：即同一交叉口 $(x, y)$ 不能同时存在 $d=0$ 和 $d=1$ 的十字架（交叉十字放置禁止）。
2. **公平通路保护（图论连通性 BFS 校验）**：
   - 任何玩家放置墙壁时，**绝不允许将任何一位玩家通往其获胜目标线的全部路线封死**。
   - **算法**：在试探放置新墙后，对场上每一位存活玩家执行广度优先搜索（BFS）。若存在任一玩家无法到达任意合法目标点，则判定该落墙非法并回滚。

---

## 三、 详细功能模块说明

### 3.1 核心规则引擎 (Rules Engine Module)
- **输入**：当前 GameState、待执行 Action（MOVE 或 WALL）。
- **职责**：
  1. \`getValidPawnMoves(state, playerId)\`：生成当前棋子所有合法移动点（含常规步、正向跨跳、侧向斜跳）。
  2. \`isWallSlotGeometricallyValid(walls, x, y, d)\`：墙体空间无重叠、无十字穿刺检测。
  3. \`canPlaceWall(state, x, y, d, playerId)\`：全图所有存活玩家的 BFS 通路可达性判定。
  4. \`applyAction(state, action)\`：不可变状态转移，回合流转、获胜条件触发。

### 3.2 智能 AI 对战引擎 (AI Agent Module)
- **初级 (Easy)**：以 75% 概率沿自身最短路径前行，25% 概率随机在棋盘放置合法扰乱墙。
- **中级 (Medium)**：
  - 基于 BFS 计算己方与领先对手的剩余最短距离。
  - 当对手距离目标 $\\le 3$ 步或比自己更快时，激活防守筑墙评估：寻找能使对手路径增幅最大（$\\Delta Dist$ 最大）的墙位。
- **大师级 (Hard / Minimax + 启发式剪枝)**：
  - 启发式评估函数：$E = (Dist_{opp} - Dist_{self}) \\times W_1 + RemainingWalls \\times W_2$。
  - 聚焦剪枝：不暴力搜索全部 128 个墙位，只搜索对手 BFS 路线周围 $3 \\times 3$ 关键咽喉点。

### 3.3 房间与联机通信模块 (Multiplayer Module)
- **协议方案**：WebSocket 权威状态服务器或 WebRTC P2P 数据通道。
- **房间生命周期**：创建房间 -> 分享房号/二维码 -> 房主选定人数（2/3/4）-> 准备就绪 -> 轮流广播 Operation -> 胜负结算。
- **动作协议序列化 (Compact Bit-Packing)**：
  - 移动：\`{ type: 0, x: 4, y: 3 }\`，仅需 1 字节（$x \\times 9 + y \\in [0, 80]$）。
  - 放墙：\`{ type: 1, x, y, d }\`，仅需 1 字节（$x + 8y + (d \\ll 6)$）。
  - 超低带宽消耗，支持高压缩率完整复盘录像回放。

### 3.4 交互与渲染引擎 (View & UX Module)
- **SVG 矢量高精度棋盘**：采用独立 viewBox 坐标映射，实现视网膜级清晰度，适配手机与宽屏。
- **凹槽交互感应**：将 8x8 凹槽放大为易点触的热区，hover 状态实时高亮绿色（可放）或红色（不可放，附带原因气泡）。
- **棋盘视角自由旋转**：支持 $0^\\circ, 90^\\circ, 180^\\circ, 270^\\circ$ 旋转，适应面对面对战或 4 人各自视角。
- **轻量原生音效**：通过 Web Audio API 纯代码合成木质棋子敲击、筑墙咔嗒声、违规蜂鸣器与胜利号角，零静态资源加载。

---

## 四、 技术架构方案

### 4.1 技术栈选型
| 层级 | 选用技术 | 选型理由 |
| :--- | :--- | :--- |
| **前端框架** | React 19 + TypeScript | 强类型保证棋规坐标、动作数据安全，组件解耦清晰 |
| **样式与动效** | Tailwind CSS 4 + SVG | 零多余 CSS 文件，声明式自适应排版与响应式微交互 |
| **算法支持** | 纯函数图论引擎 (BFS / Queue) | 零外部依赖，毫秒级完成全图连通性与最短路径计算 |
| **音频方案** | Web Audio API (OscillatorNode) | 零体积开销，无需 mp3 音频素材即可合成真实打击感 |
| **联机拓展** | WebSocket / Express (Node.js) | 易部署于 Cloud Run / 容器，低延迟双向广播 |

### 4.2 数据结构定义 (TypeScript)
\`\`\`typescript
export type Direction = 0 | 1; // 0: 水平墙, 1: 竖直墙

export interface Position {
  x: number; // 0..8
  y: number; // 0..8
}

export interface Wall {
  x: number; // 0..7
  y: number; // 0..7
  d: Direction;
  p: number; // 放墙玩家编号 (0..3)
}

export type Action = 
  | { type: 'MOVE'; x: number; y: number }
  | { type: 'WALL'; x: number; y: number; d: Direction };

export interface GameState {
  playerCount: 2 | 3 | 4;
  playerPos: Position[];
  walls: Wall[];
  leftWalls: number[];
  waitFor: number;
  firstId: number;
  round: number;
  winnerId: number[];
  isOver: boolean;
  history: any[];
}
\`\`\`

### 4.3 核心状态转移时序图
1. **玩家触发操作 (UI Event)**
2. $\\rightarrow$ **前置校验**：是否轮到该玩家？是否有剩余墙壁？
3. $\\rightarrow$ **规则引擎验证**：
   - 移动：是否在 \`getValidPawnMoves\` 列表中？
   - 放墙：无交叉？无重叠？全员 BFS 连通性通过？
4. $\\rightarrow$ **状态提交 (ApplyAction)**：
   - 更新棋子坐标 / 追加墙体数组
   - 递减剩余墙数
   - 目标线终点检测（胜者登记）
   - 轮转至下一位有效玩家 (\`waitFor = (waitFor + 1) % N\`)
5. $\\rightarrow$ **广播与触觉反馈**：
   - 触发 Web Audio 音效
   - 若进入 AI 回合，延迟 400ms 触发 \`calculateAiMove\` 并自动执行

---

## 五、 实施路线图与验收标准

### 阶段一：纯函数核心规则与几何引擎（1~2天）
- 完成 9x9 坐标系、8x8 凹槽定义。
- 完整单元测试覆盖：正向跳跃、侧翼斜跳、墙体几何互斥、BFS 绝不封路校验。

### 阶段二：现代响应式 SVG 棋盘交互（2~3天）
- 棋盘矢量绘制、棋子质感样式与发光步数指示器。
- 凹槽 Hover 热区探测、放墙实时合法性高亮预检。
- 声音合成引擎与全屏幕适配。

### 阶段三：多级智能 AI 研发（1~2天）
- 启发式最短路径贪心与防御封堵算法。
- 难度调节与思考微延迟，提供拟人化对局体验。

### 阶段四：网络联机与房间系统（2~3天）
- WebSocket 房间信令与落子同步。
- 掉线重连机制与历史回放棋谱功能。
`;

export const DocViewer: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'rules' | 'modules' | 'tech' | 'roadmap'>('overview');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(PRD_MARKDOWN_CONTENT);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard error
    }
  };

  const handleDownload = () => {
    const blob = new Blob([PRD_MARKDOWN_CONTENT], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Quoridor_路墙棋_产品开发文档_技术架构方案.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full flex flex-col gap-4 text-stone-800">
      {/* Doc Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-stone-200 p-4 rounded-2xl shadow-xs">
        <div className="flex items-center gap-2.5">
          <FileText className="w-5 h-5 text-amber-600" />
          <div>
            <h2 className="text-base font-semibold text-stone-900">
              路墙棋（Quoridor 步步为营）产品开发文档 & 技术架构方案
            </h2>
            <p className="text-xs text-stone-500">
              包含完整业务规则定义、跳步/筑墙几何数学模型、启发式 AI、WebSocket 联机协议与开发规格
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-copy-prd"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-stone-100 border border-stone-200 text-stone-700 hover:bg-stone-200 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? '已复制 Markdown' : '复制文档 Markdown'}
          </button>
          <button
            id="btn-download-prd"
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-stone-900 text-white hover:bg-stone-800 transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            下载规格书 (.md)
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-stone-200 pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'overview'
              ? 'bg-amber-100 text-amber-900 border border-amber-300 font-semibold'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          1. 产品定位与目标
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'rules'
              ? 'bg-amber-100 text-amber-900 border border-amber-300 font-semibold'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          2. 规则逻辑与数学模型
        </button>
        <button
          onClick={() => setActiveTab('modules')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'modules'
              ? 'bg-amber-100 text-amber-900 border border-amber-300 font-semibold'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          3. 详细功能模块拆解
        </button>
        <button
          onClick={() => setActiveTab('tech')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'tech'
              ? 'bg-amber-100 text-amber-900 border border-amber-300 font-semibold'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Network className="w-3.5 h-3.5" />
          4. 技术架构与通信协议
        </button>
        <button
          onClick={() => setActiveTab('roadmap')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'roadmap'
              ? 'bg-amber-100 text-amber-900 border border-amber-300 font-semibold'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <CalendarCheck className="w-3.5 h-3.5" />
          5. 研发实施路线与测试
        </button>
      </div>

      {/* Tab Panels */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 leading-relaxed space-y-6 shadow-xs">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-stone-900 flex items-center gap-2">
              <span className="w-2 h-5 bg-amber-500 rounded-full" />
              一、 产品背景与定位
            </h3>
            <p className="text-stone-600 text-sm">
              <strong>路墙棋</strong>（原名 <strong>Quoridor</strong>，又名《步步为营》）是由 Mirko Marchesi
              发明并于 1997 年获得门萨评选（Mensa Recommended Games）的经典抽象策略桌游。微信公众号《线下聚会游戏》开发了该游戏网页版（game.hullqin.cn/lqq），深受喜爱。
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-3">
                <div className="text-amber-800 font-semibold text-sm mb-1">极简规则，高深策略</div>
                <div className="text-xs text-stone-500">
                  每回合仅有两个决策支：移动 1 步或筑 1 面墙。空间切割与动态路径博弈，上手 30 秒，精通需高强空间算力。
                </div>
              </div>
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-3">
                <div className="text-amber-800 font-semibold text-sm mb-1">全场景支持</div>
                <div className="text-xs text-stone-500">
                  支持 2 人、3 人、4 人对战；支持单人对抗启发式 AI、同屏线下轮流 Pass & Play、以及多人在线房间匹配。
                </div>
              </div>
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-3">
                <div className="text-amber-800 font-semibold text-sm mb-1">纯净与高性能体验</div>
                <div className="text-xs text-stone-500">
                  纯矢量高清晰度 SVG 棋盘渲染，毫秒级图论 BFS 碰撞与通路检测，无广告、极速冷启动。
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'rules' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-stone-900 flex items-center gap-2">
              <span className="w-2 h-5 bg-amber-500 rounded-full" />
              二、 完整规则逻辑与数学几何模型
            </h3>

            <div className="space-y-3 text-sm text-stone-700">
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                <span className="font-semibold text-amber-800">1. 坐标系与尺寸定义：</span>
                <ul className="list-disc pl-5 mt-1 space-y-1 text-xs text-stone-600">
                  <li>棋盘包含 9 列 (A~I，对应 $x=0..8$) 与 9 行 (1~9，对应 $y=0..8$)，共 81 个棋子方格。</li>
                  <li>凹槽交汇点为 8 列 $\times$ 8 行（对应 $gx=0..7, gy=0..7$），用于确定墙壁的旋转锚点。</li>
                  <li>墙体长度恒为 2 个格子单位。水平墙（$d=0$）阻断上下两格连通；竖直墙（$d=1$）阻断左右两格连通。</li>
                </ul>
              </div>

              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                <span className="font-semibold text-amber-800">2. 跳步算法核心判定（Jump Logic）：</span>
                <p className="text-xs text-stone-600 mt-1">
                  若行进前方相邻格存在其他玩家棋子：
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 text-xs">
                  <div className="p-2.5 bg-white rounded-lg border border-stone-200">
                    <span className="text-stone-900 font-medium">正向直线跨跳 (Straight Jump)：</span>
                    <p className="text-stone-500 mt-0.5">
                      若被跨越敌子后方无墙壁阻隔且未出界且未被第三者占据，直接落在其后方一格（总距离 2 格）。
                    </p>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-stone-200">
                    <span className="text-stone-900 font-medium">侧向对角斜跳 (Diagonal Jump)：</span>
                    <p className="text-stone-500 mt-0.5">
                      若直线跨跳被墙壁或边界阻断，允许跳入敌子左侧或右侧空格（前提是敌子到该侧翼无墙壁阻断）。
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                <span className="font-semibold text-amber-800 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  3. 绝对公平通路原则（Fair-Play Rule）：
                </span>
                <p className="text-xs text-stone-600 mt-1">
                  放置墙壁时，<strong>绝不可彻底封死任何一名玩家到达其目标底线的通路</strong>。引擎必须在用户尝试放墙时，以 O(V+E) 进行全局 BFS 连通性校验；若任一玩家无解，则该落墙动作非法并给出明确视觉警示。
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'modules' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-stone-900 flex items-center gap-2">
              <span className="w-2 h-5 bg-amber-500 rounded-full" />
              三、 详细功能模块拆解
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
                <div className="font-semibold text-stone-900 text-sm text-amber-800 mb-1">
                  模块 1：纯逻辑规则引擎 (Rules Engine)
                </div>
                <ul className="space-y-1 text-stone-600">
                  <li>• 不可变状态流转：传入旧状态与动作，产生新状态与棋谱记录。</li>
                  <li>• 合法跳步判定器与墙壁十字/重叠碰撞检测。</li>
                  <li>• 双向多源 BFS 最短路径评估与全员连通性验算。</li>
                </ul>
              </div>

              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
                <div className="font-semibold text-stone-900 text-sm text-amber-800 mb-1">
                  模块 2：启发式 AI 决策机 (AI Engine)
                </div>
                <ul className="space-y-1 text-stone-600">
                  <li>• 估值函数：己方目标距离 vs 领先对手目标距离的动态博弈。</li>
                  <li>• 局部剪枝算法：仅针对对手前向走廊的咽喉卡点评估墙壁效用。</li>
                  <li>• 3 档难度调节（初级随机步、中级贪心法、大师级反向压迫）。</li>
                </ul>
              </div>

              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
                <div className="font-semibold text-stone-900 text-sm text-amber-800 mb-1">
                  模块 3：SVG 矢量视网膜画布 (Board UI)
                </div>
                <ul className="space-y-1 text-stone-600">
                  <li>• 响应式 viewBox 渲染，棋格微光高亮与棋子脉冲光环。</li>
                  <li>• 8x8 凹槽点触与实时合法性 Hover 导引（绿色可行，红色封死警报）。</li>
                  <li>• 可选的 BFS 最短路径辅助虚线显示。</li>
                </ul>
              </div>

              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
                <div className="font-semibold text-stone-900 text-sm text-amber-800 mb-1">
                  模块 4：音频与对局辅助系统 (Audio & Utilities)
                </div>
                <ul className="space-y-1 text-stone-600">
                  <li>• 纯 Web Audio API 物理敲击与落锁声波合成，零外部音频依赖。</li>
                  <li>• 无限悔棋 (Undo) 与全局快照时空回溯。</li>
                  <li>• 棋盘 $90^\circ$ 自由视向翻转，适应线下聚会面对面环绕。</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tech' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-stone-900 flex items-center gap-2">
              <span className="w-2 h-5 bg-amber-500 rounded-full" />
              四、 技术架构与通信方案
            </h3>

            <div className="space-y-3 text-xs text-stone-700">
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                <div className="font-semibold text-amber-800 text-sm mb-1">
                  4.1 紧凑动作位编码协议 (Compact Bit-Packing)
                </div>
                <p className="text-stone-600">
                  为支持极低延迟与极小体积棋谱存储，设计紧凑定长二进制编码：
                </p>
                <div className="p-2.5 bg-stone-100 border border-stone-200 rounded-lg font-mono text-[11px] mt-2 space-y-1 text-stone-800">
                  <div>// 移动动作：仅需 1 字节 (bit 0-6 存储 0..80 坐标，bit 7 为 0)</div>
                  <div>MOVE_BYTE = (y * 9 + x) & 0x7F;</div>
                  <div>// 放墙动作：仅需 1 字节 (bit 0-2: x, bit 3-5: y, bit 6: 方向 d, bit 7 为 1)</div>
                  <div>WALL_BYTE = 0x80 | (d &lt;&lt; 6) | ((y & 7) &lt;&lt; 3) | (x & 7);</div>
                </div>
              </div>

              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                <div className="font-semibold text-amber-800 text-sm mb-1">
                  4.2 WebSocket 权威服务器架构
                </div>
                <p className="text-stone-600">
                  采用“服务端权威判定 + 客户端乐观渲染”架构。客户端提交 Action 后，服务端执行相同 \`canPlaceWall\` 与 \`getValidPawnMoves\` 逻辑，防作弊并向房间全体成员广播增量变更。
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'roadmap' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-stone-900 flex items-center gap-2">
              <span className="w-2 h-5 bg-amber-500 rounded-full" />
              五、 研发实施路线图与验收用例
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 flex items-start gap-3">
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono font-bold shrink-0 flex items-center gap-1">
                  <span>✓</span> 里程碑 1
                </span>
                <div>
                  <div className="font-semibold text-emerald-950 flex items-center gap-1.5">
                    <span>纯函数规则库完成与全面测试</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-200 text-emerald-900 font-normal">已交付</span>
                  </div>
                  <div className="text-stone-600 mt-0.5">
                    验收标准：跨跳、斜跳、几何交叉拦截、迷宫封死识别率 100% 通过纯函数几何验证。
                  </div>
                </div>
              </div>

              <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 flex items-start gap-3">
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono font-bold shrink-0 flex items-center gap-1">
                  <span>✓</span> 里程碑 2
                </span>
                <div>
                  <div className="font-semibold text-emerald-950 flex items-center gap-1.5">
                    <span>交互式 SVG 棋盘、面对面桌游与实战残局闯关上线</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-200 text-emerald-900 font-normal">已交付</span>
                  </div>
                  <div className="text-stone-600 mt-0.5">
                    验收标准：触控灵敏度 60FPS、防误触预览+确认放墙、手机振动触觉反馈、面对面轮流转盘对战、经典残局通关与对局逐手复盘回放。
                  </div>
                </div>
              </div>

              <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 flex items-start gap-3">
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono font-bold shrink-0 flex items-center gap-1">
                  <span>✓</span> 里程碑 3
                </span>
                <div>
                  <div className="font-semibold text-emerald-950 flex items-center gap-1.5">
                    <span>智能 AI 引擎增强与大师级剪枝优化</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-200 text-emerald-900 font-normal">已交付</span>
                  </div>
                  <div className="text-stone-600 mt-0.5">
                    验收标准：切断边定向剪枝算法在 50ms 内给出兼顾多对手卡位、危机防御与进攻的最优解，支持大师级 2-Ply 深度反制模拟。
                  </div>
                </div>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-start gap-3">
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-200 font-mono font-bold shrink-0">
                  里程碑 4
                </span>
                <div>
                  <div className="font-semibold text-stone-900">网络联机多端对战与全量房间信令系统</div>
                  <div className="text-stone-500 mt-0.5">
                    验收标准：全平台 4 位房间号实时信令广播对战、掉线重连与观众席旁观。
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
