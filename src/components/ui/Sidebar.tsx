import React from 'react';
import { ContentTypePlugin } from '../../plugins/types';

type SidebarSection = string;

interface SidebarProps {
  plugins: ContentTypePlugin[];
  activeSection: SidebarSection;
  onSelect: (section: SidebarSection) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ plugins, activeSection, onSelect }) => {
  return (
    <aside className="fixed left-0 top-16 bottom-0 w-16 z-40 flex flex-col items-center py-3 gap-1
      bg-white dark:bg-zinc-950 border-r border-gray-200 dark:border-zinc-800">
      {plugins.map(plugin => (
        <SidebarButton
          key={plugin.id}
          label={plugin.displayName}
          active={activeSection === plugin.id}
          onClick={() => onSelect(plugin.id)}
        >
          <span className="text-lg leading-none">{plugin.icon}</span>
        </SidebarButton>
      ))}

      <SidebarButton
        label="批量流水线"
        active={activeSection === 'batch'}
        onClick={() => onSelect('batch')}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      </SidebarButton>

      <div className="flex-1" />

      <SidebarButton
        label="历史记录"
        active={activeSection === 'history'}
        onClick={() => onSelect('history')}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </SidebarButton>
    </aside>
  );
};

interface SidebarButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

const SidebarButton: React.FC<SidebarButtonProps> = ({ label, active, onClick, children }) => (
  <button
    onClick={onClick}
    title={label}
    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors group relative
      ${active
        ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400'
        : 'text-gray-400 dark:text-zinc-500 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-600 dark:hover:text-zinc-300'
      }`}
  >
    {children}
    <span className="absolute left-12 px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap
      bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-900
      opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
      {label}
    </span>
  </button>
);
