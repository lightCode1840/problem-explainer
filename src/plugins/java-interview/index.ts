import React from 'react';
import { FileText } from 'lucide-react';
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
  accent: '#22B8CF',
  borderColor: '#27272a',
  codeFont: 'ui-monospace, monospace',
};

const JavaInterviewTemplateAdapter: React.FC<TemplateProps> = ({ data, isDark }) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  React.createElement(JavaInterviewTemplate, { data: data as any, isDark });

export const javaInterviewPlugin: ContentTypePlugin = {
  id: 'java_interview',
  displayName: '面试题解',
  Icon: FileText,
  buildSystemPrompt: () => buildJavaInterviewSystemPrompt(),
  parseResponse: (raw: string): JavaInterviewProblemData => {
    const parsed = JSON.parse(raw) as JavaInterviewProblemData;
    if (!parsed.id) parsed.id = `ji-${Date.now()}`;
    return parsed;
  },
  EditorComponent: ProblemEditor,
  defaultTemplateId: 'default',
  templates: [
    {
      id: 'default',
      name: '默认',
      theme: defaultTheme,
      Component: JavaInterviewTemplateAdapter,
    },
  ],
};
