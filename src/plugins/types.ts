import React from 'react';
import { AnyProblemData } from '../types/problem';

export interface SubtitleSegment {
  text: string;
  startMs: number;
  endMs: number;
}

export interface ThemeConfig {
  background: string;
  cardBg: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  borderColor: string;
  codeFont: string;
}

export interface TemplateProps {
  data: AnyProblemData;
  theme: ThemeConfig;
}

export interface EditorProps {
  initialData?: AnyProblemData;
  onChange?: (data: AnyProblemData) => void;
  onSubmit: (data: AnyProblemData) => void;
}

export interface VisualTemplate {
  id: string;
  name: string;
  theme: ThemeConfig;
  Component: React.ComponentType<TemplateProps>;
}

export interface ContentTypePlugin {
  id: string;
  displayName: string;
  icon: string;
  buildSystemPrompt: (language?: string) => string;
  parseResponse: (raw: string) => AnyProblemData;
  EditorComponent: React.ComponentType<EditorProps>;
  defaultTemplateId: string;
  templates: VisualTemplate[];
}
