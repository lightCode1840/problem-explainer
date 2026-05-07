import React from 'react';
import { Globe } from 'lucide-react';
import { ContentTypePlugin, TemplateProps } from '../types';
import { buildGrammarSystemPrompt } from './prompt';
import { GrammarEditor } from '../../components/editor/GrammarEditor';
import { GrammarTemplate } from '../../templates/GrammarTemplate';
import { GrammarProblemData } from '../../types/problem';

const defaultTheme = {
  background: '#0f0f11',
  cardBg: '#18181b',
  textPrimary: '#f4f4f5',
  textSecondary: '#71717a',
  accent: '#0891B2',
  borderColor: '#27272a',
  codeFont: 'ui-monospace, monospace',
};

const GrammarTemplateAdapter: React.FC<TemplateProps> = ({ data, isDark }) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  React.createElement(GrammarTemplate, { data: data as any, isDark });

export const grammarPlugin: ContentTypePlugin = {
  id: 'grammar',
  displayName: '英语语法题',
  Icon: Globe,
  buildSystemPrompt: () => buildGrammarSystemPrompt(),
  parseResponse: (raw: string): GrammarProblemData => {
    const parsed = JSON.parse(raw) as GrammarProblemData;
    if (!parsed.id) parsed.id = `gr-${Date.now()}`;
    return parsed;
  },
  EditorComponent: GrammarEditor,
  defaultTemplateId: 'default',
  templates: [
    {
      id: 'default',
      name: '默认',
      theme: defaultTheme,
      Component: GrammarTemplateAdapter,
    },
  ],
};
