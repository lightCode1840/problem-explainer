import React from 'react';
import { AbsoluteFill, Audio } from 'remotion';
import { AnyProblemData } from './types/problem';
import { GrammarTemplate } from './templates/GrammarTemplate';
import { JavaInterviewTemplate } from './templates/JavaInterviewTemplate';
import { LeetCodeTemplate } from './templates/LeetCodeTemplate';

interface Props {
  data: AnyProblemData;
}

export const GenericExplainerVideo: React.FC<Props> = ({ data }) => {
  return (
    <AbsoluteFill className="bg-white">
      {/* 统一挂载动态生成的配音音频 */}
      {data.audioUrl && <Audio src={data.audioUrl} />}
      
      {data.type === 'grammar' && <GrammarTemplate data={data} />}
      {data.type === 'java_interview' && <JavaInterviewTemplate data={data} />}
      {data.type === 'leetcode' && <LeetCodeTemplate data={data} />}
    </AbsoluteFill>
  );
};
