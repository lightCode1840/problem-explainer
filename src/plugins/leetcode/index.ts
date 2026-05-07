import React from 'react';
import { Braces } from 'lucide-react';
import { ContentTypePlugin, TemplateProps } from '../types';
import { buildLeetCodeSystemPrompt } from './prompt';
import { ProgrammingEditor } from '../../components/editor/ProgrammingEditor';
import { LeetCodeTemplate } from '../../templates/LeetCodeTemplate';
import { LeetCodeProblemData } from '../../types/problem';

const defaultTheme = {
  background: '#0f0f11',
  cardBg: '#18181b',
  textPrimary: '#f4f4f5',
  textSecondary: '#71717a',
  accent: '#22B8CF',
  borderColor: '#27272a',
  codeFont: 'ui-monospace, SFMono-Regular, Menlo, monospace',
};

const LeetCodeTemplateAdapter: React.FC<TemplateProps> = ({ data, isDark }) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  React.createElement(LeetCodeTemplate, { data: data as any, isDark });

export const leetcodePlugin: ContentTypePlugin = {
  id: 'leetcode',
  displayName: '算法图解',
  Icon: Braces,
  buildSystemPrompt: (language = 'javascript') => buildLeetCodeSystemPrompt(language),
  parseResponse: (raw: string): LeetCodeProblemData => {
    const parsed = JSON.parse(raw) as LeetCodeProblemData;
    if (!parsed.id) parsed.id = `lc-${Date.now()}`;
    return parsed;
  },
  EditorComponent: ProgrammingEditor,
  defaultTemplateId: 'default',
  templates: [
    {
      id: 'default',
      name: '默认',
      theme: defaultTheme,
      Component: LeetCodeTemplateAdapter,
    },
  ],
};
