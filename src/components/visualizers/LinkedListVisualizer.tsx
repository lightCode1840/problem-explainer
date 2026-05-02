import React, { useEffect, useRef, useState } from 'react';
import { interpolate, spring, useVideoConfig } from 'remotion';
import { AnimationStructure } from '../../types/problem';

interface Props {
  prevState: AnimationStructure | null;
  currState: AnimationStructure;
  progress: number;
}

export const LinkedListVisualizer: React.FC<Props> = ({ prevState, currState, progress }) => {
  const { fps } = useVideoConfig();
  const data = currState.data;

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

  const numItems = Math.max(1, data.length);
  
  // Base dimensions
  const baseNodeWidth = 80;
  const baseNextWidth = 32;
  const baseArrowWidth = 40;
  const baseGap = 8;
  const baseFontSize = 30; // ~text-3xl

  let currentGap = baseGap;
  let currentArrowWidth = baseArrowWidth;
  let currentFontSize = baseFontSize;

  const totalBaseWidth = numItems * (baseNodeWidth + baseNextWidth) + (numItems - 1) * (baseGap + baseArrowWidth) + 40; // 40px for null
  const ratio = totalBaseWidth / containerWidth;

  if (ratio > 0.9) {
    // 1. Priority a: Compress gap & arrow width
    const neededReduction = totalBaseWidth - 0.9 * containerWidth;
    const itemsWithGaps = Math.max(1, numItems - 1);
    
    // We can reduce gap from 8 to 2
    const gapReduction = Math.min(baseGap - 2, neededReduction / itemsWithGaps / 2);
    currentGap = baseGap - gapReduction;
    
    // We can reduce arrow width from 40 to 20
    const arrowReduction = Math.min(baseArrowWidth - 20, neededReduction / itemsWithGaps / 2);
    currentArrowWidth = baseArrowWidth - arrowReduction;

    const newTotalWidth = numItems * (baseNodeWidth + baseNextWidth) + (numItems - 1) * (currentGap + currentArrowWidth) + 40;
    
    if (newTotalWidth > 0.9 * containerWidth) {
      // 2. Priority b: Adjust font size
      const scale = (0.9 * containerWidth) / newTotalWidth;
      currentFontSize = Math.max(12, baseFontSize * scale);
    }
  }

  const slotWidth = baseNodeWidth + baseNextWidth + currentGap + currentArrowWidth;

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
      <div className="w-full max-w-full overflow-x-auto overflow-y-hidden custom-scrollbar">
        <div 
          className="relative flex items-center w-max mx-auto pb-20 pt-8 px-4"
          style={{ gap: `${currentGap}px` }}
        >
        {/* Render Linked List Nodes */}
        {data.map((item, index) => {
          const isHighlighted = currState.highlights?.includes(index);
          const bgClass = isHighlighted 
            ? 'bg-emerald-500 border-emerald-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]' 
            : 'bg-slate-800 border-slate-600 text-slate-200';

          return (
            <React.Fragment key={index}>
              <div className="flex items-center shrink-0">
                {/* Node Box */}
                <div 
                  className={`flex items-center justify-center font-mono font-bold rounded-xl border-2 transition-colors duration-300 ${bgClass}`}
                  style={{ width: `${baseNodeWidth}px`, height: `${baseNodeWidth}px`, fontSize: `${currentFontSize}px` }}
                >
                  {String(item)}
                </div>
                {/* Next Pointer Box (Visual) */}
                <div 
                  className={`flex items-center justify-center border-y-2 border-r-2 rounded-r-xl transition-colors duration-300 ${bgClass} border-l-2 border-l-slate-700`}
                  style={{ width: `${baseNextWidth}px`, height: `${baseNodeWidth}px` }}
                >
                  <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                </div>
              </div>
              
              {/* Arrow */}
              {index < data.length - 1 && (
                <svg 
                  className="text-slate-400 shrink-0" 
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  style={{ width: `${currentArrowWidth}px`, height: '24px' }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              )}
            </React.Fragment>
          );
        })}

        {/* Null Node at the end */}
        {data.length > 0 && (
          <div className="flex items-center text-slate-500 font-mono text-xl font-bold ml-2 shrink-0">
            null
          </div>
        )}

        {/* Render Pointers */}
        {currState.pointers && Object.entries(currState.pointers).map(([name, targetIndex]) => {
          const prevIndex = prevState?.pointers?.[name] ?? targetIndex;
          
          const startX = prevIndex * slotWidth;
          const endX = targetIndex * slotWidth;
          
          const currentX = interpolate(pointerSpring, [0, 1], [startX, endX]);

          return (
            <div 
              key={name}
              className="absolute flex flex-col items-center justify-center pointer-events-none"
              style={{ 
                width: `${baseNodeWidth}px`,
                bottom: '1rem',
                left: '1rem',
                transform: `translateX(${currentX}px)` 
              }}
            >
              <svg className="w-6 h-6 text-indigo-400 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              {ratio <= 1.5 && (
                <div className="bg-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg whitespace-nowrap">
                  {name}
                </div>
              )}
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
};
