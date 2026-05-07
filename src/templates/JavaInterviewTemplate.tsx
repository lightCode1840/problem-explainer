import React, { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from 'remotion';
import { JavaInterviewProblemData } from '../types/problem';
import { GraphVisualizer } from '../components/visualizers/GraphVisualizer';
import { ComparisonVisualizer } from '../components/visualizers/ComparisonVisualizer';
import { TimelineVisualizer } from '../components/visualizers/TimelineVisualizer';

interface Props {
  data: JavaInterviewProblemData;
  isDark?: boolean;
}

const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);
const EASE_FADE = Easing.bezier(0.45, 0, 0.55, 1);

function enterProgress(frame: number, startFrame: number, durationFrames = 18) {
  return interpolate(frame, [startFrame, startFrame + durationFrames], [0, 1], {
    easing: EASE_OUT,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

function fadeProgress(frame: number, startFrame: number, durationFrames = 24) {
  return interpolate(frame, [startFrame, startFrame + durationFrames], [0, 1], {
    easing: EASE_FADE,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

export const JavaInterviewTemplate: React.FC<Props> = ({ data, isDark = false }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const appearFrame = fps * 1.5;
  const framePerPoint = fps * 2.0;

  // explanation as array or single string
  const explanationParagraphs = useMemo(() => {
    const exp = data.explanation;
    if (Array.isArray(exp)) return exp;
    if (typeof exp === 'string' && exp.length > 0) return [exp];
    return [];
  }, [data.explanation]);

  const hasInterviewTips = !!(data.interviewTips?.commonMistake || data.interviewTips?.followUp || data.interviewTips?.realWorld);
  const hasOneLiner = !!data.oneLiner;
  const hasParagraphs = explanationParagraphs.length > 1;

  const activeStepIndex = useMemo(() => {
    let steps: Array<{ text: string }> = [];
    if (data.graphData?.steps) steps = data.graphData.steps;
    else if (data.comparisonData?.steps) steps = data.comparisonData.steps;
    else if (data.timelineData?.steps) steps = data.timelineData.steps;
    if (steps.length === 0) return 0;

    const totalFrames = data.durationInFrames || fps * 30;
    const contentFrames = Math.max(1, totalFrames - fps * 2);
    const weights = steps.map(s => Math.max(1, s.text?.length ?? 0));
    const totalWeight = weights.reduce((a, b) => a + b, 0);

    let acc = 0;
    for (let i = 0; i < steps.length; i++) {
      const framesForStep = (weights[i] / totalWeight) * contentFrames;
      const stepEnd = fps + acc + framesForStep;
      if (frame < stepEnd) return i;
      acc += framesForStep;
    }
    return steps.length - 1;
  }, [frame, data, fps]);

  // Paragraph-by-paragraph fade for multi-paragraph explanation (replaces PPT scroll)
  const paragraphTiming = useMemo(() => {
    if (!hasParagraphs) return null;
    const totalFrames = data.durationInFrames || fps * 30;
    const contentStart = fps * 2.5;
    const contentDuration = Math.max(1, totalFrames - contentStart - (hasOneLiner ? fps * 4 : 0) - (hasInterviewTips ? fps * 4 : 0));
    const framesPerParagraph = contentDuration / explanationParagraphs.length;

    return explanationParagraphs.map((_, i) => ({
      start: contentStart + i * framesPerParagraph,
      end: contentStart + (i + 1) * framesPerParagraph,
    }));
  }, [hasParagraphs, data.durationInFrames, fps, explanationParagraphs, hasOneLiner, hasInterviewTips]);

  // Interview tips phase
  const tipsStart = paragraphTiming
    ? paragraphTiming[paragraphTiming.length - 1]?.end ?? (data.durationInFrames || fps * 30) - fps * 8
    : (data.durationInFrames || fps * 30) - fps * 8;
  const tipsEnd = hasOneLiner ? (data.durationInFrames || fps * 30) - fps * 4 : (data.durationInFrames || fps * 30);
  const showTips = hasInterviewTips && frame >= tipsStart && frame < tipsEnd;

  // One-liner final overlay
  const oneLinerStart = (data.durationInFrames || fps * 30) - fps * 4;
  const showOneLiner = hasOneLiner && frame >= oneLinerStart;
  const oneLinerOpacity = interpolate(frame, [oneLinerStart, oneLinerStart + fps * 1], [0, 1], {
    easing: EASE_FADE, extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // Header badge entrance
  const badgeP = enterProgress(frame, 0, 20);
  // Explanation region fade
  const regionOpacity = fadeProgress(frame, Math.floor(appearFrame * 1.5), 30);
  // Fallback panel entrance
  const fallbackP = enterProgress(frame, appearFrame, 20);

  const sectionLabelStyle = {
    fontSize: '1.375rem',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    color: '#22B8CF',
  };

  return (
    <AbsoluteFill className={`${isDark ? 'bg-[#0f0f11]' : 'bg-slate-100'} p-8 flex flex-col gap-6 font-sans`}>
      {/* Top: left key-points + right visualisation (57% height) */}
      <div className="flex w-full flex-row gap-6" style={{ height: '57%' }}>
        {/* Left: question + key points */}
        <div className={`w-1/2 h-full ${isDark ? 'bg-[#18181b] border-[#27272a]' : 'bg-white border-slate-200'} rounded-3xl border p-8 flex flex-col overflow-hidden`}>
          <div
            className={`${isDark ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-cyan-50 text-cyan-600 border-cyan-100'} px-4 py-1.5 rounded-full w-max mb-5 border shrink-0`}
            style={{
              fontSize: '1.125rem',
              fontWeight: 600,
              opacity: badgeP,
              transform: `translateY(${interpolate(badgeP, [0, 1], [-8, 0])}px)`,
            }}
          >
            {data.title}
          </div>

          <h2
            className={`${isDark ? 'text-slate-100' : 'text-slate-800'} font-bold mb-6 leading-snug shrink-0`}
            style={{
              fontSize: data.question.length > 30 ? '2.25rem' : '2.5rem',
              opacity: badgeP,
              transform: `translateY(${interpolate(badgeP, [0, 1], [-6, 0])}px)`,
            }}
          >
            {data.question}
          </h2>

          <div className={`flex-1 flex flex-col min-h-0 ${isDark ? 'bg-[#1f1f23] border-[#27272a]' : 'bg-slate-50 border-slate-100'} rounded-2xl border p-5 overflow-hidden`}>
            <div className="flex items-center gap-2.5 shrink-0 mb-3">
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#22B8CF' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span style={sectionLabelStyle}>核心考点</span>
            </div>

            <ul className="flex-1 flex flex-col justify-start gap-2.5 overflow-hidden">
              {data.keyPoints.map((point, idx) => {
                const itemAppearFrame = appearFrame + idx * framePerPoint;
                const p = enterProgress(frame, itemAppearFrame, 30);
                return (
                  <li
                    key={idx}
                    className="flex items-start leading-relaxed"
                    style={{
                      fontSize: idx === 0 ? '2rem' : '1.75rem',
                      fontWeight: idx === 0 ? 700 : 400,
                      color: idx === 0 ? '#0f172a' : '#334155',
                      opacity: p,
                      transform: `translateX(${interpolate(p, [0, 1], [-24, 0])}px)`,
                    }}
                  >
                    <span className="mr-3 shrink-0 mt-1" style={{ fontSize: '1.25rem', color: isDark ? '#22d3ee' : '#22B8CF' }}>▸</span>
                    <span className={isDark ? 'text-slate-200' : ''}>{point}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Right: visualisation */}
        <div className={`w-1/2 h-full ${isDark ? 'bg-[#18181b] border-[#27272a]' : 'bg-white border-slate-200'} rounded-3xl border flex flex-col justify-center items-center overflow-hidden p-8`}>
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
                opacity: fallbackP,
                transform: `scale(${interpolate(fallbackP, [0, 1], [0.95, 1])})`,
              }}
            >
              <div className={`w-20 h-20 ${isDark ? 'bg-cyan-500/10 border-cyan-500/20' : 'bg-cyan-50 border-cyan-100'} rounded-3xl flex items-center justify-center mb-6 border`}>
                <svg className={`w-10 h-10 ${isDark ? 'text-cyan-400' : 'text-cyan-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className={`${isDark ? 'text-slate-100' : 'text-slate-800'} font-bold mb-5`} style={{ fontSize: '2.25rem' }}>
                {data.title.split('-').pop()?.trim() || data.title}
              </h3>
              <div className="w-14 h-1.5 bg-cyan-500 rounded-full mb-6" />
              <div className="w-full space-y-3">
                {data.keyPoints.slice(0, 3).map((p, i) => {
                  const keywordMatch = p.match(/^([^：:，,]+)[：:，,]/);
                  const keyword = keywordMatch ? keywordMatch[1] : `要点 ${i + 1}`;
                  const itemP = enterProgress(frame, appearFrame + i * fps * 0.5, 15);
                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-4 ${isDark ? 'bg-[#1f1f23] border-[#27272a]' : 'bg-slate-50 border-slate-100'} px-5 py-3.5 rounded-xl border`}
                      style={{
                        opacity: itemP,
                        transform: `translateX(${interpolate(itemP, [0, 1], [16, 0])}px)`,
                      }}
                    >
                      <div className={`w-9 h-9 rounded-full ${isDark ? 'bg-[#18181b] border-[#3f3f46] text-cyan-400' : 'bg-white border-slate-200 text-cyan-600'} border flex items-center justify-center font-bold shrink-0`} style={{ fontSize: '1.25rem' }}>
                        {i + 1}
                      </div>
                      <span className={`${isDark ? 'text-slate-300' : 'text-slate-700'} font-medium`} style={{ fontSize: '1.75rem' }}>{keyword}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom: explanation + tips + one-liner (43% height) */}
      <div className={`flex-1 ${isDark ? 'bg-[#18181b] border-[#27272a]' : 'bg-white border-slate-200'} rounded-3xl border px-8 py-6 flex flex-col overflow-hidden`}>
        {/* Section header — changes based on what's shown */}
        <div className="flex items-center gap-2.5 shrink-0 mb-4">
          <svg className="w-6 h-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#22B8CF' }}>
            {showTips ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            )}
          </svg>
          <span style={sectionLabelStyle}>
            {showTips ? '面试实战' : '深度解析'}
          </span>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-hidden relative">
          {/* Interview tips panel */}
          {showTips && (
            <div className="flex gap-3 h-full" style={{ opacity: regionOpacity }}>
              {data.interviewTips?.commonMistake && (
                <div className={`flex-1 ${isDark ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-100'} border rounded-2xl p-5 flex flex-col`}>
                  <span className={`${isDark ? 'text-red-400' : 'text-red-500'} font-bold text-sm mb-2`}>常见错误</span>
                  <span className={`${isDark ? 'text-red-200' : 'text-red-800'} text-base leading-relaxed`}>{data.interviewTips.commonMistake}</span>
                </div>
              )}
              {data.interviewTips?.followUp && (
                <div className={`flex-1 ${isDark ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-100'} border rounded-2xl p-5 flex flex-col`}>
                  <span className={`${isDark ? 'text-amber-400' : 'text-amber-500'} font-bold text-sm mb-2`}>面试追问</span>
                  <span className={`${isDark ? 'text-amber-200' : 'text-amber-800'} text-base leading-relaxed`}>{data.interviewTips.followUp}</span>
                </div>
              )}
              {data.interviewTips?.realWorld && (
                <div className={`flex-1 ${isDark ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-100'} border rounded-2xl p-5 flex flex-col`}>
                  <span className={`${isDark ? 'text-emerald-400' : 'text-emerald-500'} font-bold text-sm mb-2`}>实际应用</span>
                  <span className={`${isDark ? 'text-emerald-200' : 'text-emerald-800'} text-base leading-relaxed`}>{data.interviewTips.realWorld}</span>
                </div>
              )}
            </div>
          )}

          {/* Explanation: multi-paragraph fade-in or legacy single-text display */}
          {!showTips && explanationParagraphs.length > 0 && (
            <div
              className={`${isDark ? 'text-slate-300' : 'text-slate-700'} leading-relaxed tracking-wide flex flex-col gap-4`}
              style={{
                opacity: regionOpacity,
                fontSize: '1.75rem',
              }}
            >
              {hasParagraphs ? (
                explanationParagraphs.map((para, i) => {
                  const pStart = paragraphTiming?.[i]?.start ?? 0;
                  const pFade = fadeProgress(frame, Math.floor(pStart), 24);
                  return (
                    <div
                      key={i}
                      style={{
                        opacity: pFade,
                        transform: `translateY(${interpolate(pFade, [0, 1], [12, 0])}px)`,
                      }}
                    >
                      {para}
                    </div>
                  );
                })
              ) : (
                <div>{explanationParagraphs[0]}</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* One-liner final overlay */}
      {showOneLiner && (
        <div
          className={`absolute inset-0 z-50 ${isDark ? 'bg-[#0f0f11]/95' : 'bg-slate-100/95'} flex items-center justify-center`}
          style={{ opacity: oneLinerOpacity }}
        >
          <div className="max-w-3xl text-center px-16">
            <div className="text-cyan-500 text-sm font-bold uppercase tracking-widest mb-6">
              记住一点
            </div>
            <div className={`${isDark ? 'text-slate-100' : 'text-slate-800'} text-4xl font-bold leading-snug`}>
              {data.oneLiner}
            </div>
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
