import { ThemeConfig } from '../plugins/types';

export const THEMES: Record<string, ThemeConfig & { name: string }> = {
  'dark-code': {
    name: '深色代码风',
    background: '#0f0f11',
    cardBg: '#18181b',
    textPrimary: '#f4f4f5',
    textSecondary: '#71717a',
    accent: '#6366f1',
    borderColor: '#27272a',
    codeFont: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  },
  'light-clean': {
    name: '极简白底',
    background: '#ffffff',
    cardBg: '#f9fafb',
    textPrimary: '#111827',
    textSecondary: '#6b7280',
    accent: '#4f46e5',
    borderColor: '#e5e7eb',
    codeFont: 'ui-monospace, monospace',
  },
  'blue-tech': {
    name: 'B站讲课风',
    background: '#0d1117',
    cardBg: '#161b22',
    textPrimary: '#e6edf3',
    textSecondary: '#8b949e',
    accent: '#58a6ff',
    borderColor: '#30363d',
    codeFont: 'ui-monospace, monospace',
  },
};
