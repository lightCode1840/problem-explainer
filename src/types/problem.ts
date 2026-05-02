export type ProblemType = 'grammar' | 'java_interview' | 'leetcode';

export interface BaseProblemData {
  id: string;
  type: ProblemType;
  title: string;
  durationInFrames?: number;
  audioUrl?: string; // 动态生成的 TTS 语音文件地址
}

export interface GrammarProblemData extends BaseProblemData {
  type: 'grammar';
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface GraphNode {
  id: string;           // 节点唯一ID，如 "A"
  label: string;        // 节点显示的文字，如 "Client"
  type?: 'default' | 'highlight' | 'secondary';
  x?: number;           // 0-100 相对 X 坐标 (可选)
  y?: number;           // 0-100 相对 Y 坐标 (可选)
}

export interface GraphEdge {
  from: string;         // 起始节点 ID
  to: string;           // 目标节点 ID
  label?: string;       // 连线上的文字，如 "extends"
  dashed?: boolean;     // 是否是虚线
}

export interface GraphStep {
  text: string;         // 对应当前步骤的讲解文案片段
  activeNodes?: string[];// 当前步骤需要高亮的节点 ID 数组
  activeEdges?: Array<{from: string, to: string}>; // 当前步骤高亮的连线
}

export interface GraphData {
  layout: 'horizontal' | 'vertical' | 'free'; 
  nodes: GraphNode[];
  edges: GraphEdge[];
  steps: GraphStep[];   // 动画序列
}

export interface ComparisonData {
  headers: string[]; // 表头，例如 ["特性", "ArrayList", "LinkedList"]
  rows: string[][]; // 表格行，例如 [["底层数据结构", "动态数组", "双向链表"], ["随机访问", "O(1)", "O(n)"]]
  steps: {
    text: string;
    activeRows: number[]; // 当前步骤高亮的行索引（0-indexed）
  }[];
}

export interface TimelineData {
  events: {
    title: string; // 阶段名称，例如 "实例化"
    description: string; // 阶段描述
  }[];
  steps: {
    text: string;
    activeEvents: number[]; // 当前步骤高亮的事件索引（0-indexed）
  }[];
}

export interface JavaInterviewProblemData extends BaseProblemData {
  type: 'java_interview';
  question: string;
  keyPoints: string[];
  visualIcon?: string; // 保留 Emoji 作为基础兜底
  graphData?: GraphData; // 结构图解数据
  comparisonData?: ComparisonData; // 表格对比数据
  timelineData?: TimelineData; // 时间轴/流程数据
  explanation: string;
}

export interface AnimationStructure {
  id: string; // 唯一标识符，例如 "tree1", "queue1"
  type: 'array' | 'tree' | 'linkedlist' | 'grid';
  data: unknown[]; // Array elements or tree serialized data
  pointers?: Record<string, number>; // Maps pointer names (e.g., 'left', 'i') to array indices
  highlights?: number[]; // Indices of elements to highlight
}

export interface AnimationState {
  structures: AnimationStructure[]; // 支持同时渲染多个数据结构（如树 + 优先队列）
}

export interface ProblemStep {
  text: string; // The explanation text for this step
  state: AnimationState; // The visual state for this step
  codeLines?: number[]; // Indices of the code lines to highlight (0-indexed)
}

export interface VideoStyleConfig {
  layoutSplit: number; // Percentage for the left pane (e.g., 35)
  codeFontSize: string; // Tailwind text size classes (e.g., 'text-sm', 'text-base', 'text-lg')
  textFontWeight: string; // Tailwind font weight classes (e.g., 'font-normal', 'font-medium', 'font-bold')
}

export interface LeetCodeProblemData extends BaseProblemData {
  type: 'leetcode';
  description: string;
  codeSnippet: string;
  language: string;
  problemReading: string; // 读题部分的配音文案
  steps: ProblemStep[]; // 替换原来的单段 explanation
  explanation?: string; // 保留可选字段，兼容旧数据
  styleConfig?: VideoStyleConfig; // 视频展示样式配置
}

export type AnyProblemData = GrammarProblemData | JavaInterviewProblemData | LeetCodeProblemData;
