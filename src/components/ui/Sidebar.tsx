import React from 'react';
import { Workflow, Clock, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { ContentTypePlugin } from '../../plugins/types';

type SidebarSection = string;

interface SidebarProps {
  plugins: ContentTypePlugin[];
  activeSection: SidebarSection;
  onSelect: (section: SidebarSection) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ plugins, activeSection, onSelect, collapsed, onToggleCollapse }) => {
  return (
    <>
      {/* Sidebar — icon-only when collapsed, icon+text when expanded */}
      <aside className={`fixed left-0 top-16 bottom-0 z-40 flex flex-col py-2 gap-0.5
        bg-white dark:bg-zinc-950 border-r border-gray-200 dark:border-zinc-800
        transition-all duration-300 ease-in-out
        ${collapsed ? 'w-14 items-center' : 'w-44 items-stretch px-2'}`}>

        {/* Collapse toggle */}
        <button
          onClick={onToggleCollapse}
          className={`flex items-center rounded-lg mb-1 shrink-0
            text-gray-400 dark:text-zinc-500 hover:bg-gray-100 dark:hover:bg-zinc-800
            hover:text-gray-600 dark:hover:text-zinc-300 transition-colors
            ${collapsed ? 'w-10 h-8 justify-center mx-auto' : 'h-8 px-2 gap-2'}`}
          aria-label={collapsed ? '展开侧边栏' : '收起侧边栏'}
        >
          {collapsed ? <PanelLeftOpen size={16} strokeWidth={1.75} /> : <PanelLeftClose size={16} strokeWidth={1.75} />}
          {!collapsed && <span className="text-xs font-medium">收起</span>}
        </button>

        {plugins.map(plugin => (
          <SidebarButton
            key={plugin.id}
            label={plugin.displayName}
            active={activeSection === plugin.id}
            onClick={() => onSelect(plugin.id)}
            collapsed={collapsed}
          >
            <plugin.Icon size={20} strokeWidth={1.75} />
          </SidebarButton>
        ))}

        {/* Separator */}
        <div className={`h-px bg-gray-200 dark:bg-zinc-800 my-1.5 transition-all ${collapsed ? 'w-6 mx-auto' : 'w-full'}`} />

        <SidebarButton
          label="批量流水线"
          active={activeSection === 'batch'}
          onClick={() => onSelect('batch')}
          collapsed={collapsed}
        >
          <Workflow size={20} strokeWidth={1.75} />
        </SidebarButton>

        <div className="flex-1" />

        <SidebarButton
          label="历史记录"
          active={activeSection === 'history'}
          onClick={() => onSelect('history')}
          collapsed={collapsed}
        >
          <Clock size={20} strokeWidth={1.75} />
        </SidebarButton>
      </aside>
    </>
  );
};

interface SidebarButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  collapsed: boolean;
}

const SidebarButton: React.FC<SidebarButtonProps> = ({ label, active, onClick, children, collapsed }) => (
  <button
    onClick={onClick}
    aria-label={label}
    className={`group relative flex items-center rounded-xl
      transition-all duration-150 ease-out
      ${active
        ? 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-500/10'
        : 'text-gray-400 dark:text-zinc-500 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-600 dark:hover:text-zinc-300'
      }
      ${collapsed ? 'w-10 h-10 justify-center' : 'w-full h-10 px-2.5 gap-3'}`}
  >
    {/* Active pill indicator */}
    <span
      className={`absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full bg-cyan-500
        transition-all duration-200 ease-out
        ${active
          ? 'h-8 w-0.5'
          : 'h-0 w-0 group-hover:h-3 group-hover:w-0.5 group-hover:bg-gray-300 dark:group-hover:bg-zinc-600'
        }`}
    />

    {/* Icon */}
    <span className="relative z-10 transition-transform duration-150 ease-out
      group-hover:scale-105 group-active:scale-95 shrink-0">
      {children}
    </span>

    {/* Label — inline when expanded, tooltip when collapsed */}
    {!collapsed ? (
      <span className="text-xs font-medium text-inherit truncate">{label}</span>
    ) : (
      <span className="absolute left-full ml-2 px-2.5 py-1 rounded-md text-[11px] font-medium
        whitespace-nowrap bg-gray-900/95 dark:bg-zinc-100 text-white dark:text-zinc-900
        opacity-0 group-hover:opacity-100 pointer-events-none z-50
        transition-opacity duration-100 delay-300
        shadow-md shadow-black/15 dark:shadow-black/10">
        {label}
      </span>
    )}
  </button>
);
