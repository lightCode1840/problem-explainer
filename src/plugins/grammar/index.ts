import React from 'react';
import { ContentTypePlugin, TemplateProps } from '../types';
import { buildGrammarSystemPrompt } from './prompt';
import { GrammarEditor } from '../../components/editor/GrammarEditor';
import { GrammarTemplate } from '../../templates/GrammarTemplate';
import { GrammarProblemData } from '../../types/problem';

const defaultTheme = {
  background: '#ffffff',
  cardBg: '#f9fafb',
  textPrimary: '#111827',
  textSecondary: '#6b7280',
  accent: '#4f46e5',
  borderColor: '#e5e7eb',
  codeFont: 'ui-monospace, monospace',
};

const GrammarTemplateAdapter: React.FC<TemplateProps> = ({ data }) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  React.createElement(GrammarTemplate, { data: data as any });

export const grammarPlugin: ContentTypePlugin = {
  id: 'grammar',
  displayName: '英语语法题',
  icon: '📝',
  buildSystemPrompt: () => buildGrammarSystemPrompt(),
  parseResponse: (raw: string): GrammarProblemData => {
    const parsed = JSON.parse(raw) as GrammarProblemData;
    if (!parsed.id) parsed.id = `gr-${Date.now()}`;
    return parsed;
  },
  EditorComponent: GrammarEditor,
  defaultTemplateId: 'light-clean',
  templates: [
    {
      id: 'light-clean',
      name: '清爽白底',
      theme: defaultTheme,
      Component: GrammarTemplateAdapter,
    },
  ],
};
