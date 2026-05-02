import React, { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { LeetCodeProblemData } from '../types/problem';
import { ArrayVisualizer } from '../components/visualizers/ArrayVisualizer';
import { TreeVisualizer } from '../components/visualizers/TreeVisualizer';
import { LinkedListVisualizer } from '../components/visualizers/LinkedListVisualizer';
import { GridVisualizer } from '../components/visualizers/GridVisualizer';

interface Props {
  data: LeetCodeProblemData;
}

export const LeetCodeTemplate: React.FC<Props> = ({ data }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();

  // Parse steps and compute durations
  const steps = data.steps || [];
  
  const stepFrames = useMemo(() => {
    if (!steps.length) return [];
    
    // Allocate some frames for problem reading first
    const problemReadingLength = data.problemReading?.length || 0;
    const stepsLength = steps.reduce((acc, step) => acc + step.text.length, 0);
    const totalLength = problemReadingLength + stepsLength;
    
    if (totalLength === 0) {
      return steps.map(() => ({ start: 0, end: durationInFrames }));
    }

    const readingFrames = Math.floor((problemReadingLength / totalLength) * durationInFrames);
    let currentStart = readingFrames;
    
    return steps.map((step, i) => {
      // The last step takes all remaining frames
      if (i === steps.length - 1) {
        return { start: currentStart, end: durationInFrames };
      }
      const framesForStep = Math.floor((step.text.length / totalLength) * durationInFrames);
      const start = currentStart;
      const end = currentStart + framesForStep;
      currentStart = end;
      return { start, end };
    });
  }, [steps, data.problemReading, durationInFrames]);

  // Find current step
  let currentStepIndex = 0;
  for (let i = 0; i < stepFrames.length; i++) {
    if (frame >= stepFrames[i].start && frame < stepFrames[i].end) {
      currentStepIndex = i;
      break;
    }
    // If we're past all steps, stay on the last one
    if (i === stepFrames.length - 1 && frame >= stepFrames[i].end) {
      currentStepIndex = i;
    }
  }

  // Handle problem reading phase
  const isReadingPhase = stepFrames.length > 0 && frame < stepFrames[0].start;

  const currentStep = steps[currentStepIndex];
  const prevState = currentStepIndex > 0 ? steps[currentStepIndex - 1].state : null;
  
  const stepProgress = stepFrames.length > 0 && !isReadingPhase
    ? Math.min(1, Math.max(0, (frame - stepFrames[currentStepIndex].start) / fps)) // progress over 1 second
    : 0;

  // Code typing effect
  const typeDurationFrames = durationInFrames * 0.8;
  const charsCount = data.codeSnippet?.length || 1;
  const framesPerChar = Math.max(1, typeDurationFrames / charsCount);
  const charsToShow = Math.floor(frame / framesPerChar);
  const displayedCode = data.codeSnippet?.slice(0, charsToShow) || '';

  const styleConfig = data.styleConfig || {
    layoutSplit: 35,
    codeFontSize: 'text-[0.9rem]',
    textFontWeight: 'font-medium'
  };

  return (
    <AbsoluteFill className="bg-[#0f111a] text-gray-200 flex-row font-sans">
      {/* 左侧：题目与代码 */}
      <div 
        className="h-full flex flex-col border-r border-slate-800 bg-[#161822] z-10 shadow-2xl overflow-hidden"
        style={{ 
          width: `${styleConfig.layoutSplit}%`, 
          minWidth: 0, 
          maxWidth: `${styleConfig.layoutSplit}%`,
          flex: `0 0 ${styleConfig.layoutSplit}%` 
        }}
      >
        <div className="p-8 border-b border-slate-800 bg-[#1a1c29] shrink-0">
          <div className="flex items-center mb-4 min-w-0">
            <div className="flex items-center justify-center bg-yellow-500/20 w-8 h-8 rounded mr-3 shrink-0">
              <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125.513 5.527 5.527 0 0 0 .062 2.362 5.83 5.83 0 0 0 .349 1.017 5.938 5.938 0 0 0 1.271 1.541l11.114 11.666c.137.131.332.222.536.257a.87.87 0 0 0 .616-.08.855.855 0 0 0 .439-.462.87.87 0 0 0 .016-.622l-4.14-11.458h5.92a1.34 1.34 0 0 0 1.258-.819 1.36 1.36 0 0 0-.095-1.42l-9.824-14.5A1.37 1.37 0 0 0 13.483 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-wide truncate min-w-0 flex-1">
              {data.title}
            </h2>
          </div>
          <div className="text-sm leading-relaxed text-slate-400 whitespace-pre-wrap max-h-40 overflow-hidden line-clamp-5">
            {data.description}
          </div>
        </div>
        
        {/* 代码演示区 */}
        <div className="flex-1 flex flex-col bg-[#1e1e1e] overflow-hidden min-h-0">
          <div className="h-10 bg-[#2d2d2d] flex items-center px-4 border-b border-gray-800 shrink-0">
            <div className="flex space-x-2 mr-4">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
            </div>
            <div className="bg-[#1e1e1e] text-gray-400 px-3 py-1 text-xs rounded-t-md font-mono mt-1 shrink-0">
              solution.{data.language === 'python' ? 'py' : data.language === 'java' ? 'java' : data.language === 'cpp' ? 'cpp' : 'js'}
            </div>
          </div>
          <div className="flex-1 p-6 relative overflow-x-hidden overflow-y-auto">
            <pre className={`font-mono ${styleConfig.codeFontSize} text-emerald-400 leading-relaxed whitespace-pre-wrap break-all md:break-words`}>
              {displayedCode.split('\n').map((line, idx, arr) => {
                const isHighlighted = !isReadingPhase && currentStep?.codeLines?.includes(idx);
                return (
                  <div key={idx} className={`px-2 -mx-2 rounded ${isHighlighted ? 'bg-emerald-500/30 border-l-2 border-emerald-400' : 'border-l-2 border-transparent'}`}>
                    {line}
                    {idx === arr.length - 1 && (
                      <span className="inline-block w-2 h-4 bg-slate-500 ml-1 animate-pulse align-middle"></span>
                    )}
                  </div>
                );
              })}
            </pre>
          </div>
        </div>
      </div>

      {/* 右侧：图解与解说区 */}
      <div 
        className="h-full flex flex-col bg-[#1e1e2e] overflow-hidden"
        style={{ 
          width: `${100 - styleConfig.layoutSplit}%`,
          minWidth: 0,
          maxWidth: `${100 - styleConfig.layoutSplit}%`,
          flex: `0 0 ${100 - styleConfig.layoutSplit}%`
        }}
      >
        
        {/* 上半部：动态图解 (70%) */}
        <div className="h-[70%] relative flex flex-col items-center justify-center border-b border-slate-800 overflow-hidden">
          {currentStep?.state?.structures ? (
            <div className={`w-full h-full flex ${currentStep.state.structures.length > 1 ? 'flex-row' : 'flex-col'} items-center justify-center gap-4 p-4`}>
              {currentStep.state.structures.map((struct) => {
                const prevStruct = prevState?.structures?.find(s => s.id === struct.id) || null;
                return (
                  <div key={struct.id} className="flex-1 w-full h-full flex items-center justify-center border border-slate-700/50 rounded-xl bg-slate-900/30 p-2 relative">
                    {/* Add visual indication if we are in reading phase */}
                    {isReadingPhase && (
                      <div className="absolute top-2 right-2 flex items-center gap-2 bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full text-xs font-medium border border-indigo-500/30 z-50 shadow-lg animate-pulse">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        题目分析中
                      </div>
                    )}
                    {struct.type === 'array' ? (
                      <ArrayVisualizer prevState={prevStruct as any} currState={struct as any} progress={stepProgress} />
                    ) : struct.type === 'tree' ? (
                      <TreeVisualizer prevState={prevStruct as any} currState={struct as any} progress={stepProgress} />
                    ) : struct.type === 'linkedlist' ? (
                      <LinkedListVisualizer prevState={prevStruct as any} currState={struct as any} progress={stepProgress} />
                    ) : struct.type === 'grid' ? (
                      <GridVisualizer prevState={prevStruct as any} currState={struct as any} progress={stepProgress} />
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center animate-pulse text-slate-500 flex flex-col items-center">
              <svg className="w-16 h-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <h3 className="text-2xl font-semibold">分析题目要求中...</h3>
            </div>
          )}
        </div>

        {/* 下半部：实时解说字幕 (30%) */}
        <div className="h-[30%] p-10 bg-slate-900 flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-slate-800">
            <div 
              className="h-full bg-indigo-500 transition-all duration-100 ease-linear" 
              style={{ width: `${(frame / durationInFrames) * 100}%` }}
            ></div>
          </div>
          
          <h4 className="text-indigo-400 font-bold mb-4 uppercase tracking-widest text-sm flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            思路推演
          </h4>
          
          <p className={`text-2xl text-slate-300 leading-relaxed ${styleConfig.textFontWeight}`}>
            {isReadingPhase ? data.problemReading : currentStep?.text}
          </p>
        </div>
      </div>
    </AbsoluteFill>
  );
};
