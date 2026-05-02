import React, { useEffect, useRef, useState } from 'react';
import { interpolate, spring, useVideoConfig } from 'remotion';
import { AnimationStructure } from '../../types/problem';

interface Props {
  prevState: AnimationStructure | null;
  currState: AnimationStructure;
  progress: number; // 0 to 1 value representing the transition progress
}

export const ArrayVisualizer: React.FC<Props> = ({ prevState, currState, progress }) => {
  const { fps } = useVideoConfig();
  const data = currState.data || [];
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800); // Default fallback

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

  // Calculate dynamic dimensions
  const numItems = Math.max(1, data.length);
  const baseItemWidth = 80;
  const baseGap = 24;
  
  let currentItemWidth = baseItemWidth;
  let currentGap = baseGap;
  let currentFontSize = 30; // 30px is roughly text-3xl

  const totalBaseWidth = numItems * baseItemWidth + (numItems - 1) * baseGap;
  const ratio = totalBaseWidth / containerWidth;

  if (ratio > 0.9) {
    // 1. Priority a: Compress gap
    // We need to save (totalBaseWidth - 0.9 * containerWidth) pixels
    const neededReduction = totalBaseWidth - 0.9 * containerWidth;
    const gapReduction = Math.min(baseGap - 8, neededReduction / Math.max(1, numItems - 1));
    currentGap = baseGap - gapReduction;

    const newTotalWidth = numItems * baseItemWidth + (numItems - 1) * currentGap;
    if (newTotalWidth > 0.9 * containerWidth) {
      // 2. Priority b: Adjust font size and item width
      // Scale down font size from 30px to 12-16px range
      const scale = (0.9 * containerWidth) / newTotalWidth;
      // Constraint: item width >= 80px? But if width >= 80px, we can't shrink it.
      // Wait, the spec says "设置最小可读性约束：每个步骤项宽度≥80px，文字≥12px"
      // If we can't shrink width < 80px, we only shrink text? Shrinking text doesn't help total width if item is fixed 80px.
      // Let's just adjust font size and rely on overflow-x-auto.
      currentFontSize = Math.max(16, 30 * scale);
    }
  }

  const slotWidth = currentItemWidth + currentGap;

  // Use spring to make pointer movements look natural
  const pointerSpring = spring({
    frame: progress * fps * 2, // scale progress to frames (assuming 2 sec transition)
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
        {/* Render Array Elements */}
        {data.map((item, index) => {
          const isHighlighted = currState.highlights?.includes(index);
          
          const bgClass = isHighlighted 
            ? 'bg-emerald-500 border-emerald-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]' 
            : 'bg-slate-800 border-slate-600 text-slate-200';

          return (
            <div 
              key={index}
              className={`flex items-center justify-center font-mono font-bold rounded-xl border-2 transition-colors duration-300 shrink-0 ${bgClass}`}
              style={{ 
                width: `${currentItemWidth}px`, 
                height: `${currentItemWidth}px`,
                fontSize: `${currentFontSize}px`
              }}
            >
              {String(item)}
            </div>
          );
        })}

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
                width: `${currentItemWidth}px`,
                bottom: '1rem',
                left: '1rem',
                transform: `translateX(${currentX}px)` 
              }}
            >
              <svg className="w-6 h-6 text-indigo-400 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              {/* Hide subtitle/name if container is too compressed (Priority c) */}
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
