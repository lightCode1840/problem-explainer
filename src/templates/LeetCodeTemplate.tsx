import React, { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from 'remotion';
import { LeetCodeProblemData } from '../types/problem';
import { ArrayVisualizer } from '../components/visualizers/ArrayVisualizer';
import { TreeVisualizer } from '../components/visualizers/TreeVisualizer';
import { LinkedListVisualizer } from '../components/visualizers/LinkedListVisualizer';
import { GridVisualizer } from '../components/visualizers/GridVisualizer';

interface Props {
  data: LeetCodeProblemData;
  isDark?: boolean;
}

const EASE_SMOOTH = Easing.bezier(0.25, 0.1, 0.25, 1);

export const LeetCodeTemplate: React.FC<Props> = ({ data, isDark = false }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();

  const steps = data.steps || [];
  const hasApproach = !!(data.approachOverview?.methodName);
  const hasComplexity = !!(data.complexity?.timeComplexity);
  const hasSummary = !!data.summary;

  const stepFrames = useMemo(() => {
    if (!steps.length) return [];

    const problemReadingLength = data.problemReading?.length || 0;
    const stepsLength = steps.reduce((acc, step) => acc + step.text.length, 0);
    const totalLength = problemReadingLength + stepsLength;

    if (totalLength === 0) {
      return steps.map(() => ({ start: 0, end: durationInFrames }));
    }

    // Reserve frames for approach/complexity/summary phases if present
    const reserveFrames = (hasApproach ? fps * 2 : 0) + (hasSummary ? fps * 4 : 0);
    const usableFrames = Math.max(1, durationInFrames - reserveFrames);

    const readingRatio = problemReadingLength / totalLength;
    const readingFrames = Math.floor(readingRatio * usableFrames);
    let currentStart = readingFrames + (hasApproach ? fps * 2 : 0);

    return steps.map((step, i) => {
      if (i === steps.length - 1) {
        return { start: currentStart, end: durationInFrames - (hasSummary ? fps * 4 : 0) };
      }
      const framesForStep = Math.floor((step.text.length / totalLength) * usableFrames);
      const start = currentStart;
      const end = currentStart + framesForStep;
      currentStart = end;
      return { start, end };
    });
  }, [steps, data.problemReading, durationInFrames, fps, hasApproach, hasSummary]);

  let currentStepIndex = 0;
  for (let i = 0; i < stepFrames.length; i++) {
    if (frame >= stepFrames[i].start && frame < stepFrames[i].end) {
      currentStepIndex = i;
      break;
    }
    if (i === stepFrames.length - 1 && frame >= stepFrames[i].end) {
      currentStepIndex = i;
    }
  }

  const isReadingPhase = stepFrames.length > 0 && frame < stepFrames[0].start;
  const isApproachPhase = hasApproach && stepFrames.length > 0
    && frame >= stepFrames[0].start - fps * 2 && frame < stepFrames[0].start;

  const currentStep = steps[currentStepIndex];
  const prevState = currentStepIndex > 0 ? steps[currentStepIndex - 1].state : null;

  const TRANSITION_DURATION_SEC = 1.5;
  const rawProgress = stepFrames.length > 0 && !isReadingPhase && !isApproachPhase
    ? Math.min(1, Math.max(0, (frame - stepFrames[currentStepIndex].start) / (fps * TRANSITION_DURATION_SEC)))
    : 0;
  const stepProgress = interpolate(rawProgress, [0, 1], [0, 1], {
    easing: EASE_SMOOTH,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Complexity shown in last 20% of the last step
  const isLastStep = currentStepIndex === steps.length - 1 && stepFrames.length > 0;
  const progressInLastStep = isLastStep
    ? (frame - stepFrames[currentStepIndex].start) / Math.max(1, stepFrames[currentStepIndex].end - stepFrames[currentStepIndex].start)
    : 0;
  const showComplexity = hasComplexity && isLastStep && progressInLastStep > 0.6;

  // Summary overlay in final seconds
  const summaryStart = hasSummary ? durationInFrames - fps * 5 : 0;
  const showSummary = hasSummary && frame >= summaryStart;
  const summaryOpacity = hasSummary
    ? interpolate(frame, [summaryStart, summaryStart + fps * 1], [0, 1], {
        easing: EASE_SMOOTH, extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
      })
    : 0;

  // Approach card entrance
  const approachOpacity = isApproachPhase
    ? interpolate(frame,
        [stepFrames[0].start - fps * 2, stepFrames[0].start - fps * 1.5],
        [0, 1],
        { easing: EASE_SMOOTH, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
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
    textFontWeight: 'font-medium',
  };

  return (
    <AbsoluteFill className={`${isDark ? 'bg-[#0f111a] text-gray-200' : 'bg-gray-50 text-gray-800'} flex-row font-sans`}>
      {/* Left: Problem + Code */}
      <div
        className={`h-full flex flex-col border-r z-10 shadow-2xl overflow-hidden ${isDark ? 'border-slate-800 bg-[#161822]' : 'border-gray-200 bg-white'}`}
        style={{
          width: `${styleConfig.layoutSplit}%`,
          minWidth: 0,
          maxWidth: `${styleConfig.layoutSplit}%`,
          flex: `0 0 ${styleConfig.layoutSplit}%`,
        }}
      >
        <div className={`p-8 border-b shrink-0 ${isDark ? 'border-slate-800 bg-[#1a1c29]' : 'border-gray-200 bg-gray-50'}`}>
          <div className="flex items-center mb-4 min-w-0">
            <div className="flex items-center justify-center bg-yellow-500/20 w-8 h-8 rounded mr-3 shrink-0">
              <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125.513 5.527 5.527 0 0 0 .062 2.362 5.83 5.83 0 0 0 .349 1.017 5.938 5.938 0 0 0 1.271 1.541l11.114 11.666c.137.131.332.222.536.257a.87.87 0 0 0 .616-.08.855.855 0 0 0 .439-.462.87.87 0 0 0 .016-.622l-4.14-11.458h5.92a1.34 1.34 0 0 0 1.258-.819 1.36 1.36 0 0 0-.095-1.42l-9.824-14.5A1.37 1.37 0 0 0 13.483 0z" />
              </svg>
            </div>
            <h2 className={`text-2xl font-bold tracking-wide truncate min-w-0 flex-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {data.title}
            </h2>
          </div>
          <div className={`text-sm leading-relaxed whitespace-pre-wrap max-h-40 overflow-hidden line-clamp-5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            {data.description}
          </div>
        </div>

        {/* Code pane */}
        <div className={`flex-1 flex flex-col overflow-hidden min-h-0 ${isDark ? 'bg-[#1e1e1e]' : 'bg-gray-100'}`}>
          <div className={`h-10 flex items-center px-4 border-b shrink-0 ${isDark ? 'bg-[#2d2d2d] border-gray-800' : 'bg-gray-200 border-gray-300'}`}>
            <div className="flex space-x-2 mr-4">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
            </div>
            <div className={`px-3 py-1 text-xs rounded-t-md font-mono mt-1 shrink-0 ${isDark ? 'bg-[#1e1e1e] text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
              solution.{data.language === 'python' ? 'py' : data.language === 'java' ? 'java' : data.language === 'cpp' ? 'cpp' : 'js'}
            </div>
          </div>
          <div className="flex-1 p-6 relative overflow-x-hidden overflow-y-auto">
            <pre className={`font-mono ${styleConfig.codeFontSize} leading-relaxed whitespace-pre-wrap break-all md:break-words ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
              {displayedCode.split('\n').map((line, idx, arr) => {
                const isHighlighted = !isReadingPhase && !isApproachPhase && currentStep?.codeLines?.includes(idx);
                return (
                  <div key={idx} className={`px-2 -mx-2 rounded transition-all duration-500 ease-out ${isHighlighted ? 'bg-emerald-500/30 border-l-2 border-emerald-400' : 'border-l-2 border-transparent'}`}>
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

      {/* Right: Visualization + Narration */}
      <div
        className={`h-full flex flex-col overflow-hidden ${isDark ? 'bg-[#1e1e2e]' : 'bg-white'}`}
        style={{
          width: `${100 - styleConfig.layoutSplit}%`,
          minWidth: 0,
          maxWidth: `${100 - styleConfig.layoutSplit}%`,
          flex: `0 0 ${100 - styleConfig.layoutSplit}%`,
        }}
      >
        {/* Top: Dynamic visualization (70%) */}
        <div className={`h-[70%] relative flex flex-col items-center justify-center border-b overflow-hidden ${isDark ? 'border-slate-800' : 'border-gray-200'}`}>
          {/* Approach overview card — shown between reading and steps */}
          {isApproachPhase && hasApproach && (
            <div
              className={`absolute inset-0 flex items-center justify-center z-30 ${isDark ? 'bg-[#1e1e2e]/80' : 'bg-white/80'}`}
              style={{ opacity: approachOpacity }}
            >
              <div className="bg-cyan-500/10 border border-cyan-500/40 rounded-2xl px-8 py-6 max-w-lg text-center">
                <div className="text-cyan-400 text-sm font-bold uppercase tracking-widest mb-3">
                  {data.approachOverview!.methodName}
                </div>
                <div className="text-white text-xl font-semibold leading-relaxed">
                  {data.approachOverview!.coreInsight}
                </div>
                {data.approachOverview!.whyBetter && (
                  <div className="text-slate-400 text-sm mt-3">
                    {data.approachOverview!.whyBetter}
                  </div>
                )}
              </div>
            </div>
          )}

          {currentStep?.state?.structures ? (
            <div className={`w-full h-full flex ${currentStep.state.structures.length > 1 ? 'flex-row' : 'flex-col'} items-center justify-center gap-4 p-4`}>
              {currentStep.state.structures.map((struct) => {
                const prevStruct = prevState?.structures?.find(s => s.id === struct.id) || null;
                return (
                  <div key={struct.id} className="flex-1 w-full h-full flex items-center justify-center border border-slate-700/50 rounded-xl bg-slate-900/30 p-2 relative">
                    {isReadingPhase && (
                      <div className="absolute top-2 right-2 flex items-center gap-2 bg-cyan-500/20 text-cyan-300 px-3 py-1 rounded-full text-xs font-medium border border-cyan-500/30 z-50 shadow-lg animate-pulse">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        题目分析中
                      </div>
                    )}
                    {/* Complexity overlay in visualization area */}
                    {showComplexity && (
                      <div className="absolute bottom-3 right-3 z-40 flex gap-3">
                        <div className="bg-emerald-500/15 border border-emerald-500/40 rounded-xl px-4 py-2">
                          <span className="text-emerald-400 text-xs font-bold uppercase">time</span>
                          <span className="text-emerald-300 text-lg font-bold ml-2">{data.complexity!.timeComplexity}</span>
                        </div>
                        <div className="bg-violet-500/15 border border-violet-500/40 rounded-xl px-4 py-2">
                          <span className="text-violet-400 text-xs font-bold uppercase">space</span>
                          <span className="text-violet-300 text-lg font-bold ml-2">{data.complexity!.spaceComplexity}</span>
                        </div>
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
            <div className={`text-center animate-pulse flex flex-col items-center ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              <svg className="w-16 h-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <h3 className="text-2xl font-semibold">分析题目要求中...</h3>
            </div>
          )}
        </div>

        {/* Bottom: Narration text (30%) */}
        <div className={`h-[30%] p-10 flex flex-col justify-center relative overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-gray-100'}`}>
          <div className={`absolute top-0 left-0 w-full h-1 ${isDark ? 'bg-slate-800' : 'bg-gray-200'}`}>
            <div
              className="h-full bg-cyan-500 transition-all duration-100 ease-linear"
              style={{ width: `${(frame / durationInFrames) * 100}%` }}
            ></div>
          </div>

          <h4 className="text-cyan-400 font-bold mb-4 uppercase tracking-widest text-sm flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            {isApproachPhase ? '解题思路' : showComplexity ? '复杂度分析' : '思路推演'}
          </h4>

          <p className={`text-2xl leading-relaxed ${styleConfig.textFontWeight} ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
            {isReadingPhase
              ? data.problemReading
              : isApproachPhase
                ? (data.approachOverview?.coreInsight ?? '')
                : showComplexity
                  ? data.complexity?.briefExplanation ?? ''
                  : currentStep?.text}
          </p>
        </div>
      </div>

      {/* Summary overlay — full screen at end */}
      {showSummary && (
        <div
          className={`absolute inset-0 z-50 flex items-center justify-center ${isDark ? 'bg-[#0f111a]/90' : 'bg-white/90'}`}
          style={{ opacity: summaryOpacity }}
        >
          <div className="max-w-2xl text-center px-12">
            <div className="text-cyan-400 text-sm font-bold uppercase tracking-widest mb-6">
              总结
            </div>
            <div className={`text-3xl font-semibold leading-relaxed ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {data.summary}
            </div>
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
