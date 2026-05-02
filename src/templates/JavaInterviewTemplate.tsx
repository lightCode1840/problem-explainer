import React, { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring } from 'remotion';
import { JavaInterviewProblemData } from '../types/problem';
import { GraphVisualizer } from '../components/visualizers/GraphVisualizer';
import { ComparisonVisualizer } from '../components/visualizers/ComparisonVisualizer';
import { TimelineVisualizer } from '../components/visualizers/TimelineVisualizer';

interface Props {
  data: JavaInterviewProblemData;
}

export const JavaInterviewTemplate: React.FC<Props> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const appearFrame = fps * 1.5;
  const framePerPoint = fps * 1.5;

  const activeStepIndex = useMemo(() => {
    let stepsLength = 0;
    if (data.graphData?.steps) stepsLength = data.graphData.steps.length;
    else if (data.comparisonData?.steps) stepsLength = data.comparisonData.steps.length;
    else if (data.timelineData?.steps) stepsLength = data.timelineData.steps.length;

    if (stepsLength === 0) return 0;

    const totalFrames = data.durationInFrames || fps * 30;
    const framesPerStep = totalFrames / stepsLength;
    return Math.min(Math.floor(frame / framesPerStep), stepsLength - 1);
  }, [frame, data, fps]);

  // Estimate scroll offset from character count — avoids relying on CSS calc(100%)
  // in transforms which can be unreliable in Remotion's render context.
  const estimatedLineHeightPx = 46;
  const estimatedCharsPerLine = 48;
  const estimatedContainerPx = 260;
  const totalLines = Math.ceil((data.explanation?.length ?? 0) / estimatedCharsPerLine);
  const estimatedContentPx = totalLines * estimatedLineHeightPx;
  const maxScrollPx = Math.max(0, estimatedContentPx - estimatedContainerPx);

  let pptScrollOffset = 0;
  if (maxScrollPx > 0) {
    const durationFrames = data.durationInFrames || fps * 30;
    const activeDuration = Math.max(1, durationFrames - fps * 4);
    const totalPages = Math.ceil(estimatedContentPx / estimatedContainerPx);
    const framesPerPage = activeDuration / totalPages;
    const activeFrame = Math.max(0, frame - fps * 2);
    const currentPageIndex = Math.min(totalPages - 1, Math.floor(activeFrame / framesPerPage));
    const frameInCurrentPage = activeFrame - currentPageIndex * framesPerPage;
    const flipTriggerFrame = Math.max(0, framesPerPage - fps * 1.5);
    const transitionFrame = Math.max(0, frameInCurrentPage - flipTriggerFrame);
    const transitionProgress = spring({
      frame: transitionFrame,
      fps,
      config: { damping: 16, stiffness: 100, mass: 0.8 },
    });
    const ratio = Math.min(1, (currentPageIndex + transitionProgress) / Math.max(1, totalPages - 1));
    pptScrollOffset = ratio * maxScrollPx;
  }

  return (
    <AbsoluteFill className="bg-slate-100 p-8 flex flex-col gap-6 font-sans">
      {/* Top: left key-points + right visualisation (57% height) */}
      <div className="flex w-full flex-row gap-6" style={{ height: '57%' }}>

        {/* Left: question + key points */}
        <div className="w-1/2 h-full bg-white rounded-3xl border border-slate-200 p-8 flex flex-col overflow-hidden">
          <div className="bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full text-xl font-semibold w-max mb-5 border border-indigo-100 shrink-0">
            {data.title}
          </div>

          <h2 className="text-4xl font-bold text-slate-800 mb-6 leading-snug shrink-0">
            {data.question}
          </h2>

          <div className="flex-1 flex flex-col min-h-0 bg-slate-50 rounded-2xl border border-slate-100 p-5 overflow-hidden">
            <div className="flex items-center gap-2.5 shrink-0 mb-3">
              <svg className="w-5 h-5 text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-2xl font-bold text-slate-400 uppercase tracking-wider">核心考点</h3>
            </div>

            <ul className="flex-1 flex flex-col justify-start gap-2.5 overflow-hidden">
              {data.keyPoints.map((point, idx) => {
                const itemAppearFrame = appearFrame + idx * framePerPoint;
                const isVisible = frame >= itemAppearFrame;
                return (
                  <li
                    key={idx}
                    className="flex items-start leading-relaxed"
                    style={{
                      fontSize: '1.75rem',
                      color: '#334155',
                      opacity: isVisible ? 1 : 0,
                      transform: isVisible ? 'translateX(0)' : 'translateX(-24px)',
                      transition: 'opacity 0.6s ease, transform 0.6s ease',
                    }}
                  >
                    <span className="text-indigo-500 mr-3 shrink-0 mt-1" style={{ fontSize: '1.25rem' }}>▸</span>
                    <span>{point}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Right: visualisation */}
        <div className="w-1/2 h-full bg-white rounded-3xl border border-slate-200 flex flex-col justify-center items-center overflow-hidden p-8">
          {data.graphData ? (
            <div className="w-full h-full flex items-center justify-center">
              <GraphVisualizer graphData={data.graphData} activeStepIndex={activeStepIndex} />
            </div>
          ) : data.comparisonData ? (
            <div className="w-full h-full flex items-center justify-center">
              <ComparisonVisualizer comparisonData={data.comparisonData} activeStepIndex={activeStepIndex} />
            </div>
          ) : data.timelineData ? (
            <div className="w-full h-full flex items-center justify-center">
              <TimelineVisualizer timelineData={data.timelineData} activeStepIndex={activeStepIndex} />
            </div>
          ) : (
            <div
              className="w-full h-full flex flex-col items-center justify-center text-center"
              style={{
                opacity: frame > appearFrame ? 1 : 0,
                transform: frame > appearFrame ? 'scale(1)' : 'scale(0.95)',
                transition: 'opacity 0.8s ease, transform 0.8s ease',
              }}
            >
              <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mb-6 border border-indigo-100">
                <svg className="w-10 h-10 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-3xl font-bold text-slate-800 mb-5">
                {data.title.split('-').pop()?.trim() || data.title}
              </h3>
              <div className="w-14 h-1.5 bg-indigo-500 rounded-full mb-6" />
              <div className="w-full space-y-3">
                {data.keyPoints.slice(0, 3).map((p, i) => {
                  const keywordMatch = p.match(/^([^：:，,]+)[：:，,]/);
                  const keyword = keywordMatch ? keywordMatch[1] : `要点 ${i + 1}`;
                  return (
                    <div key={i} className="flex items-center gap-4 bg-slate-50 px-5 py-3.5 rounded-xl border border-slate-100">
                      <div className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-indigo-600 font-bold shrink-0 text-xl">
                        {i + 1}
                      </div>
                      <span className="text-slate-700 font-medium text-2xl">{keyword}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom: explanation (43% height) */}
      <div className="flex-1 bg-white rounded-3xl border border-slate-200 px-8 py-6 flex flex-col overflow-hidden">
        <h3 className="text-2xl font-bold text-indigo-500 mb-4 flex items-center gap-2.5 tracking-widest uppercase shrink-0">
          <svg className="w-6 h-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          深度解析
        </h3>

        <div className="flex-1 overflow-hidden relative">
          <div
            className="text-slate-700 leading-relaxed tracking-wide w-full"
            style={{
              fontSize: '1.75rem',
              opacity: frame > appearFrame * 1.5 ? 1 : 0,
              transform: `translateY(${-pptScrollOffset}px)`,
              transition: 'opacity 1s ease-in-out',
            }}
          >
            {data.explanation}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
