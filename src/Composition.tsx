import React from 'react';
import { AbsoluteFill, Audio } from 'remotion';
import { AnyProblemData } from './types/problem';
import { GrammarTemplate } from './templates/GrammarTemplate';
import { JavaInterviewTemplate } from './templates/JavaInterviewTemplate';
import { LeetCodeTemplate } from './templates/LeetCodeTemplate';

// Video-only routing — avoids importing the plugin registry to keep editor
// components out of the Remotion render bundle.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const templateMap: Record<string, React.ComponentType<{ data: any }>> = {
  grammar: GrammarTemplate,
  java_interview: JavaInterviewTemplate,
  leetcode: LeetCodeTemplate,
};

interface Props {
  data: AnyProblemData;
  showWatermark?: boolean;
}

export const GenericExplainerVideo: React.FC<Props> = ({ data, showWatermark = false }) => {
  const TemplateComponent = templateMap[data.type] ?? templateMap['java_interview'];

  return (
    <AbsoluteFill>
      {data.audioUrl && <Audio src={data.audioUrl} />}
      <TemplateComponent data={data} />
      {showWatermark && (
        <AbsoluteFill style={{ pointerEvents: 'none', zIndex: 9999 }}>
          <div style={{
            position: 'absolute', bottom: 32, right: 40,
            display: 'flex', alignItems: 'center',
            background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
            borderRadius: 8, padding: '6px 14px',
          }}>
            <span style={{
              color: 'rgba(255,255,255,0.75)', fontSize: 20, fontWeight: 700,
              letterSpacing: '-0.3px', fontFamily: 'system-ui, sans-serif',
            }}>
              Problem Explainer
            </span>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
