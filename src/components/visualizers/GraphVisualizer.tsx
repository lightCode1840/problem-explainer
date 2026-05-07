import React, { useMemo } from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { GraphData, GraphNode, GraphEdge } from '../../types/problem';

interface GraphVisualizerProps {
  graphData: GraphData;
  activeStepIndex: number;
}

// 简单的物理引擎布局（基于层级树状或环状的静态排版）
// MVP: 我们使用基于 grid/flex 或硬编码偏移的自动排布
export const GraphVisualizer: React.FC<GraphVisualizerProps> = ({ graphData, activeStepIndex }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const currentStep = graphData.steps[activeStepIndex] || null;
  const activeNodes = currentStep?.activeNodes || [];
  const activeEdges = currentStep?.activeEdges || [];

  // 计算节点的位置
  const nodePositions = useMemo(() => {
    const positions: Record<string, { x: number, y: number }> = {};
    const count = graphData.nodes.length;
    
    // 如果 LLM 返回了 x,y 坐标，优先使用（将其从 0-100 映射到百分比）
    // 否则，根据 layout 类型简单自动排版
    
    if (graphData.layout === 'horizontal') {
      // 水平方向均匀分布
      graphData.nodes.forEach((node, i) => {
        positions[node.id] = {
          x: node.x !== undefined ? node.x : 20 + (60 / Math.max(1, count - 1)) * i,
          y: node.y !== undefined ? node.y : 50 + (i % 2 === 0 ? -15 : 15), // 上下错开
        };
      });
    } else if (graphData.layout === 'vertical') {
      // 垂直树状分布
      const levelMap: Record<string, number> = {};
      const childCount: Record<string, number> = {};
      
      // 简单推导层级
      graphData.nodes.forEach(n => levelMap[n.id] = 0);
      graphData.edges.forEach(e => {
        levelMap[e.to] = Math.max(levelMap[e.to], levelMap[e.from] + 1);
        childCount[e.from] = (childCount[e.from] || 0) + 1;
      });

      const maxLevel = Math.max(...Object.values(levelMap), 1);
      
      graphData.nodes.forEach((node) => {
        const lvl = levelMap[node.id];
        // 简单水平散开
        const siblings = graphData.nodes.filter(n => levelMap[n.id] === lvl);
        const sibIndex = siblings.findIndex(n => n.id === node.id);
        
        positions[node.id] = {
          x: node.x !== undefined ? node.x : 50 + (sibIndex - (siblings.length - 1) / 2) * 30,
          y: node.y !== undefined ? node.y : 20 + (60 / maxLevel) * lvl,
        };
      });
    } else {
      // 环形分布
      graphData.nodes.forEach((node, i) => {
        const angle = (i / count) * Math.PI * 2;
        positions[node.id] = {
          x: node.x !== undefined ? node.x : 50 + Math.cos(angle) * 30,
          y: node.y !== undefined ? node.y : 50 + Math.sin(angle) * 30,
        };
      });
    }
    
    return positions;
  }, [graphData]);

  // SVG 连线渲染
  const renderEdges = () => {
    return (
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
          </marker>
          <marker id="arrowhead-active" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#f97316" /> {/* orange-500 */}
          </marker>
        </defs>
        {graphData.edges.map((edge, idx) => {
          const fromPos = nodePositions[edge.from];
          const toPos = nodePositions[edge.to];
          if (!fromPos || !toPos) return null;

          // 是否是当前激活连线
          const isActive = activeEdges.some(e => e.from === edge.from && e.to === edge.to);

          // 简单的入场动画
          const edgeProgress = spring({
            frame: Math.max(0, frame - 15 - idx * 5),
            fps,
            config: { damping: 200 },
          });

          // 计算两点之间的连线
          const dx = toPos.x - fromPos.x;
          const dy = toPos.y - fromPos.y;
          // 稍微缩短连线，避免直接碰到节点中心（假设节点半径大概是 10%）
          const length = Math.sqrt(dx * dx + dy * dy);
          const shortenRatio = length > 0 ? (length - 8) / length : 1;
          
          const endX = fromPos.x + dx * shortenRatio;
          const endY = fromPos.y + dy * shortenRatio;

          return (
            <g key={`${edge.from}-${edge.to}-${idx}`} opacity={edgeProgress}>
              <line
                x1={`${fromPos.x}%`}
                y1={`${fromPos.y}%`}
                x2={`${fromPos.x + dx * shortenRatio * edgeProgress}%`}
                y2={`${fromPos.y + dy * shortenRatio * edgeProgress}%`}
                stroke={isActive ? '#f97316' : '#cbd5e1'}
                strokeWidth={isActive ? 4 : 2}
                strokeDasharray={edge.dashed ? '6,6' : 'none'}
                markerEnd={isActive ? "url(#arrowhead-active)" : "url(#arrowhead)"}
                className="transition-all duration-500"
              />
              {edge.label && (
                <text
                  x={`${fromPos.x + dx * 0.5}%`}
                  y={`${fromPos.y + dy * 0.5 - 2}%`}
                  textAnchor="middle"
                  fill={isActive ? '#ea580c' : '#64748b'}
                  className="text-sm font-semibold transition-colors duration-500"
                >
                  {edge.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div className="w-full h-full relative">
      {renderEdges()}
      
      {/* 渲染节点 */}
      {graphData.nodes.map((node, idx) => {
        const pos = nodePositions[node.id];
        if (!pos) return null;

        const isActive = activeNodes.includes(node.id);
        const isSecondary = node.type === 'secondary';

        // 节点入场动画
        const scale = spring({
          frame: Math.max(0, frame - idx * 5),
          fps,
          config: { tension: 120, friction: 14 },
        });

        // 节点高亮大小变换
        const activeScale = isActive ? 1.15 : 1;

        return (
          <div
            key={node.id}
            className={`absolute flex items-center justify-center rounded-2xl shadow-lg border-2 transition-all duration-500
              ${isActive 
                ? 'bg-orange-50 border-orange-500 text-orange-700 shadow-orange-500/30 z-20' 
                : isSecondary 
                  ? 'bg-slate-100 border-slate-300 text-slate-500 z-10' 
                  : 'bg-white border-cyan-200 text-cyan-900 z-10'
              }`}
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              transform: `translate(-50%, -50%) scale(${scale * activeScale})`,
              minWidth: '120px',
              padding: '12px 20px',
            }}
          >
            <span className={`font-bold ${isActive ? 'text-xl' : 'text-lg'}`}>
              {node.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};