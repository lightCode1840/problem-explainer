import { ThemeConfig } from '../plugins/types';

export const THEMES: Record<string, ThemeConfig & { name: string }> = {
  'dark-code': {
    name: '极简暗色',
    background: '#0B0B0D',
    cardBg: '#141416',
    textPrimary: '#EDEDEF',
    textSecondary: '#6E6E77',
    accent: '#22B8CF',
    borderColor: '#232326',
    codeFont: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  },
  'light-clean': {
    name: '极简亮色',
    background: '#F7F7F8',
    cardBg: '#FFFFFF',
    textPrimary: '#18181B',
    textSecondary: '#71717A',
    accent: '#0891B2',
    borderColor: '#E4E4E7',
    codeFont: 'ui-monospace, monospace',
  },
  'blue-tech': {
    name: '经典蓝',
    background: '#0d1117',
    cardBg: '#161b22',
    textPrimary: '#e6edf3',
    textSecondary: '#8b949e',
    accent: '#58a6ff',
    borderColor: '#30363d',
    codeFont: 'ui-monospace, monospace',
  },
};
