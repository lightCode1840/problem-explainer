import React from 'react';
import { ComparisonData } from '../../types/problem';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';

interface Props {
  comparisonData: ComparisonData;
  activeStepIndex: number;
}

export const ComparisonVisualizer: React.FC<Props> = ({ comparisonData, activeStepIndex }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Find the active rows for the current step
  const activeRows = comparisonData.steps[activeStepIndex]?.activeRows || [];

  // Calculate dynamic scale factor if there are too many rows to fit the container
  // 针对表格进行双重防御：基于行数的缩放 + 基于内容长度的字号缩小
  const rowCountScale = Math.min(1, 3.5 / Math.max(1, comparisonData.rows.length));
  
  // 提取所有文字内容计算总长度
  const totalChars = comparisonData.rows.reduce((sum, row) => sum + row.join('').length, 0) + comparisonData.headers.join('').length;
  const fontSizeScale = Math.min(1, 400 / Math.max(1, totalChars));
  const finalScale = Math.min(rowCountScale, fontSizeScale);

  return (
    <div className="w-full h-full flex flex-col justify-center items-center font-sans p-4">
      <div 
        className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm w-full transition-transform duration-500"
        style={{ transform: `scale(${finalScale})`, transformOrigin: 'center center' }}
      >
        {/* Table Header */}
        <div className="flex bg-indigo-50 border-b border-slate-200">
          {comparisonData.headers.map((header, idx) => (
            <div 
              key={idx} 
              className={`flex-1 p-4 text-center font-bold text-indigo-800 ${idx > 0 ? 'border-l border-indigo-100' : ''}`}
            >
              {header}
            </div>
          ))}
        </div>
        
        {/* Table Body */}
        <div className="flex flex-col">
          {comparisonData.rows.map((row, rowIndex) => {
            const isActive = activeRows.includes(rowIndex);
            
            // Animate row appearance
            const appearProgress = spring({
              frame: frame - (rowIndex * 15), // slight stagger
              fps,
              config: { damping: 14, stiffness: 100 }
            });
            
            // Highlight animation - smoother transitions
            const highlightScale = spring({
              frame: isActive ? frame : 0,
              fps,
              config: { damping: 18, stiffness: 120, mass: 0.8 }
            });
            
            const isHighlighted = isActive && activeStepIndex > 0; // only highlight after step 0

            return (
              <div 
                key={rowIndex}
                className={`flex border-b border-slate-100 last:border-b-0 transition-colors duration-700 ease-in-out ${
                  isActive ? 'bg-indigo-50/50' : 'bg-white'
                }`}
                style={{
                  opacity: appearProgress,
                  transform: `translateY(${(1 - appearProgress) * 20}px) scale(${
                    isActive ? 1 + (highlightScale * 0.01) : 1
                  })`,
                  transformOrigin: 'center center',
                  zIndex: isActive ? 10 : 1
                }}
              >
                {row.map((cell, colIndex) => (
                  <div 
                    key={colIndex}
                    className={`flex-1 p-3 sm:p-4 text-center flex items-center justify-center ${
                      colIndex === 0 ? 'font-semibold text-slate-700' : 'text-slate-600'
                    } ${colIndex > 0 ? 'border-l border-slate-100' : ''}`}
                  >
                    <span className={`px-2 sm:px-4 py-1.5 rounded-lg transition-all duration-700 ease-in-out text-sm sm:text-base leading-snug break-words max-w-full ${
                      isActive && colIndex > 0 ? 'bg-white shadow-sm border border-indigo-100 font-medium text-indigo-700 scale-105' : 'border border-transparent'
                    }`}>
                      {cell}
                    </span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
