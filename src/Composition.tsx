import React from 'react';
import { AbsoluteFill, Audio } from 'remotion';
import { AnyProblemData } from './types/problem';
import { registry } from './plugins/registry';
import { GrammarTemplate } from './templates/GrammarTemplate';
import { JavaInterviewTemplate } from './templates/JavaInterviewTemplate';
import { LeetCodeTemplate } from './templates/LeetCodeTemplate';

interface Props {
  data: AnyProblemData;
  showWatermark?: boolean;
}

export const GenericExplainerVideo: React.FC<Props> = ({ data, showWatermark = false }) => {
  const plugin = registry.get(data.type);

  let TemplateNode: React.ReactElement;

  if (plugin) {
    const template =
      plugin.templates.find(t => t.id === data.templateId) ?? plugin.templates[0];
    const { Component, theme } = template;
    TemplateNode = React.createElement(Component, { data, theme });
  } else {
    if (data.type === 'grammar') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      TemplateNode = React.createElement(GrammarTemplate, { data: data as any });
    } else if (data.type === 'leetcode') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      TemplateNode = React.createElement(LeetCodeTemplate, { data: data as any });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      TemplateNode = React.createElement(JavaInterviewTemplate, { data: data as any });
    }
  }

  return (
    <AbsoluteFill className="bg-white">
      {data.audioUrl && <Audio src={data.audioUrl} />}
      {TemplateNode}
      {showWatermark && (
        <AbsoluteFill style={{ pointerEvents: 'none', zIndex: 9999 }}>
          <div style={{
            position: 'absolute', bottom: 32, right: 40,
            display: 'flex', alignItems: 'center',
            background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
            borderRadius: 8, padding: '6px 12px',
          }}>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 18, fontWeight: 700, letterSpacing: '-0.5px', fontFamily: 'system-ui, sans-serif' }}>
              ⚡ Problem Explainer
            </span>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
