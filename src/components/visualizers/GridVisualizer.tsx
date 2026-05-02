import React, { useEffect, useRef, useState } from 'react';
import { interpolate, spring, useVideoConfig } from 'remotion';
import { AnimationStructure } from '../../types/problem';

interface Props {
  prevState: AnimationStructure | null;
  currState: AnimationStructure;
  progress: number;
}

export const GridVisualizer: React.FC<Props> = ({ prevState, currState, progress }) => {
  const { fps } = useVideoConfig();
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Assume data is a 2D array: unknown[][]
  const gridData = (currState.data as unknown[][]) || [];
  const rows = gridData.length;
  const cols = rows > 0 ? (gridData[0] as unknown[]).length : 0;

  // Dynamic dimensions calculation
  const baseCellSize = 64; // w-16
  const baseGap = 8;       // gap-2
  const baseFontSize = 24; // text-2xl

  let currentCellSize = baseCellSize;
  let currentGap = baseGap;
  let currentFontSize = baseFontSize;

  if (cols > 0) {
    const totalBaseWidth = cols * baseCellSize + (cols - 1) * baseGap;
    const ratio = totalBaseWidth / containerWidth;

    if (ratio > 0.9) {
      // Compress gap
      const neededReduction = totalBaseWidth - 0.9 * containerWidth;
      const itemsWithGaps = Math.max(1, cols - 1);
      
      const gapReduction = Math.min(baseGap - 2, neededReduction / itemsWithGaps);
      currentGap = baseGap - gapReduction;

      const newTotalWidth = cols * baseCellSize + (cols - 1) * currentGap;
      
      if (newTotalWidth > 0.9 * containerWidth) {
        // Compress cell size and font size
        const scale = (0.9 * containerWidth) / newTotalWidth;
        currentCellSize = Math.max(32, baseCellSize * scale); // Don't go below 32px
        currentFontSize = Math.max(12, baseFontSize * scale);
      }
    }
  }

  const slotSize = currentCellSize + currentGap;

  // Use spring to make pointer movements look natural
  const pointerSpring = spring({
    frame: progress * fps * 2, // scale progress to frames
    fps,
    config: {
      damping: 12,
      stiffness: 90,
      mass: 0.5,
    },
  });

  return (
    <div 
      ref={containerRef}
      className="w-full h-full flex flex-col items-center justify-center p-8 bg-[#1e1e2e] overflow-hidden"
    >
      <div className="w-full max-w-full overflow-auto custom-scrollbar">
        <div 
          className="relative flex flex-col w-max mx-auto min-h-max pb-8 px-4 mt-12"
          style={{ gap: `${currentGap}px` }}
        >
        {/* Render Grid Rows */}
        {gridData.map((row, rowIndex) => (
          <div key={rowIndex} className="flex" style={{ gap: `${currentGap}px` }}>
            {(row as unknown[]).map((cell, colIndex) => {
              // Flat index for highlights and pointers
              const flatIndex = rowIndex * cols + colIndex;
              const isHighlighted = currState.highlights?.includes(flatIndex);
              const bgClass = isHighlighted 
                ? 'bg-emerald-500 border-emerald-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]' 
                : 'bg-slate-800 border-slate-600 text-slate-200';

              return (
                <div 
                  key={colIndex}
                  className={`flex items-center justify-center font-mono font-bold rounded-lg border-2 transition-colors duration-300 shrink-0 ${bgClass}`}
                  style={{ width: `${currentCellSize}px`, height: `${currentCellSize}px`, fontSize: `${currentFontSize}px` }}
                >
                  {String(cell)}
                </div>
              );
            })}
          </div>
        ))}

        {/* Render Pointers */}
        {currState.pointers && Object.entries(currState.pointers).map(([name, targetFlatIndex]) => {
          const prevFlatIndex = prevState?.pointers?.[name] ?? targetFlatIndex;
          
          const prevRow = Math.floor(prevFlatIndex / cols);
          const prevCol = prevFlatIndex % cols;
          
          const targetRow = Math.floor(targetFlatIndex / cols);
          const targetCol = targetFlatIndex % cols;
          
          const startX = prevCol * slotSize;
          const startY = prevRow * slotSize;
          
          const endX = targetCol * slotSize;
          const endY = targetRow * slotSize;
          
          const currentX = interpolate(pointerSpring, [0, 1], [startX, endX]);
          const currentY = interpolate(pointerSpring, [0, 1], [startY, endY]);

          return (
            <div 
              key={name}
              className="absolute flex flex-col items-center justify-center pointer-events-none"
              style={{ 
                width: `${currentCellSize}px`,
                transform: `translate(${currentX}px, ${currentY}px)`,
                // Position it slightly offset so we can see the pointer and the cell
                top: '-32px',
                left: '1rem',
              }}
            >
              <div className="bg-indigo-500 text-white text-xs font-bold px-2 py-0.5 rounded shadow-lg mb-1 whitespace-nowrap">
                {name}
              </div>
              <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 19V5m0 14l-4-4m4 4l4-4" />
              </svg>
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
};
