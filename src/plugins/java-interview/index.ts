import React from 'react';
import { ContentTypePlugin, TemplateProps } from '../types';
import { buildJavaInterviewSystemPrompt } from './prompt';
import { ProblemEditor } from '../../components/editor/ProblemEditor';
import { JavaInterviewTemplate } from '../../templates/JavaInterviewTemplate';
import { JavaInterviewProblemData } from '../../types/problem';

const defaultTheme = {
  background: '#0f0f11',
  cardBg: '#18181b',
  textPrimary: '#f4f4f5',
  textSecondary: '#71717a',
  accent: '#6366f1',
  borderColor: '#27272a',
  codeFont: 'ui-monospace, monospace',
};

const JavaInterviewTemplateAdapter: React.FC<TemplateProps> = ({ data }) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  React.createElement(JavaInterviewTemplate, { data: data as any });

export const javaInterviewPlugin: ContentTypePlugin = {
  id: 'java_interview',
  displayName: '八股 / 面试题',
  icon: '☕',
  buildSystemPrompt: () => buildJavaInterviewSystemPrompt(),
  parseResponse: (raw: string): JavaInterviewProblemData => {
    const parsed = JSON.parse(raw) as JavaInterviewProblemData;
    if (!parsed.id) parsed.id = `ji-${Date.now()}`;
    return parsed;
  },
  EditorComponent: ProblemEditor,
  defaultTemplateId: 'dark-tech',
  templates: [
    {
      id: 'dark-tech',
      name: '深色科技风',
      theme: defaultTheme,
      Component: JavaInterviewTemplateAdapter,
    },
  ],
};
