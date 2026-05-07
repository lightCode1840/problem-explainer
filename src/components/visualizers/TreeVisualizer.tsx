import React, { useEffect, useRef, useState } from 'react';
import { interpolate, spring, useVideoConfig } from 'remotion';
import { AnimationStructure } from '../../types/problem';

interface Props {
  prevState: AnimationStructure | null;
  currState: AnimationStructure;
  progress: number;
}

// Helper to calculate coordinates for a perfect binary tree in array representation
const getTreeCoordinates = (data: unknown[], width: number, height: number) => {
  const nodes = [];
  const levelHeight = height / (Math.floor(Math.log2(data.length)) + 2);
  
  for (let i = 0; i < data.length; i++) {
    if (data[i] === null || data[i] === undefined) continue;
    
    const level = Math.floor(Math.log2(i + 1));
    const nodesInLevel = Math.pow(2, level);
    const positionInLevel = i - (nodesInLevel - 1);
    
    const segmentWidth = width / nodesInLevel;
    const x = (positionInLevel + 0.5) * segmentWidth;
    const y = (level + 1) * levelHeight;
    
    nodes.push({ id: i, value: data[i], x, y, level });
  }
  return nodes;
};

export const TreeVisualizer: React.FC<Props> = ({ prevState, currState, progress }) => {
  const { fps } = useVideoConfig();
  const data = currState.data;

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Calculate dynamic node size
  const maxLevel = Math.floor(Math.log2(data.length));
  const maxNodesAtBottom = Math.pow(2, maxLevel);
  
  const baseNodeSize = 64; // w-16
  const minNodeSize = 32;
  const baseFontSize = 24; // text-2xl
  const minFontSize = 12;

  // Assume minimum gap between nodes is 8px
  const requiredWidth = maxNodesAtBottom * baseNodeSize + (maxNodesAtBottom - 1) * 8;
  
  // By default, the tree scales to fit container width/height.
  // But if the container is too narrow for the nodes, we need a larger canvas and scroll
  let canvasWidth = Math.max(containerSize.width, requiredWidth);
  let canvasHeight = Math.max(containerSize.height, 400);

  let currentNodeSize = baseNodeSize;
  let currentFontSize = baseFontSize;

  const ratio = requiredWidth / containerSize.width;
  if (ratio > 0.9) {
    const scale = (0.9 * containerSize.width) / requiredWidth;
    currentNodeSize = Math.max(minNodeSize, baseNodeSize * scale);
    currentFontSize = Math.max(minFontSize, baseFontSize * scale);
    
    // Recalculate required width with scaled nodes
    const newRequiredWidth = maxNodesAtBottom * currentNodeSize + (maxNodesAtBottom - 1) * 8;
    canvasWidth = Math.max(containerSize.width, newRequiredWidth);
  }

  const nodes = getTreeCoordinates(data, canvasWidth, canvasHeight);

  const pointerSpring = spring({
    frame: progress * fps * 2,
    fps,
    config: { damping: 12, stiffness: 90, mass: 0.5 },
  });

  return (
    <div 
      ref={containerRef}
      className="w-full h-full relative bg-[#1e1e2e] flex items-center justify-center overflow-auto custom-scrollbar"
    >
      <div 
        className="relative"
        style={{ width: canvasWidth, height: canvasHeight }}
      >
        {/* Edges */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {nodes.map(node => {
            const leftChildIndex = 2 * node.id + 1;
            const rightChildIndex = 2 * node.id + 2;
            
            const leftChild = nodes.find(n => n.id === leftChildIndex);
            const rightChild = nodes.find(n => n.id === rightChildIndex);

            return (
              <g key={`edges-${node.id}`}>
                {leftChild && (
                  <line 
                    x1={node.x} y1={node.y} 
                    x2={leftChild.x} y2={leftChild.y} 
                    stroke="#475569" strokeWidth="3" 
                  />
                )}
                {rightChild && (
                  <line 
                    x1={node.x} y1={node.y} 
                    x2={rightChild.x} y2={rightChild.y} 
                    stroke="#475569" strokeWidth="3" 
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* Nodes */}
        {nodes.map(node => {
          const isHighlighted = currState.highlights?.includes(node.id);
          const bgClass = isHighlighted 
            ? 'bg-amber-500 border-amber-400 text-white shadow-[0_0_20px_rgba(245,158,11,0.5)]' 
            : 'bg-slate-800 border-slate-600 text-slate-200';

          return (
            <div
              key={node.id}
              className={`absolute flex items-center justify-center rounded-full border-4 font-bold z-10 transition-colors duration-300 ${bgClass}`}
              style={{ 
                left: node.x, 
                top: node.y,
                width: `${currentNodeSize}px`,
                height: `${currentNodeSize}px`,
                marginLeft: `-${currentNodeSize / 2}px`,
                marginTop: `-${currentNodeSize / 2}px`,
                fontSize: `${currentFontSize}px`
              }}
            >
              {String(node.value)}
            </div>
          );
        })}

        {/* Pointers */}
        {currState.pointers && Object.entries(currState.pointers).map(([name, targetId]) => {
          const prevId = prevState?.pointers?.[name] ?? targetId;
          
          const targetNode = nodes.find(n => n.id === targetId);
          const prevNode = nodes.find(n => n.id === prevId);

          if (!targetNode || !prevNode) return null;

          const currentX = interpolate(pointerSpring, [0, 1], [prevNode.x, targetNode.x]);
          const currentY = interpolate(pointerSpring, [0, 1], [prevNode.y, targetNode.y]);

          return (
            <div 
              key={name}
              className="absolute z-20 flex flex-col items-center justify-center pointer-events-none"
              style={{ 
                left: currentX, 
                top: currentY - currentNodeSize / 2 - 40,
                width: '100px',
                marginLeft: '-50px'
              }}
            >
              <div className="bg-cyan-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg text-center w-max mb-1 whitespace-nowrap">
                {name}
              </div>
              <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
          );
        })}
      </div>
    </div>
  );
};
