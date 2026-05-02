import React, { createContext, useContext, useState } from 'react';
import { ContentTypePlugin } from '../plugins/types';
import { registry } from '../plugins/registry';

interface PluginStore {
  activePlugin: ContentTypePlugin;
  setActivePluginId: (id: string) => void;
  allPlugins: ContentTypePlugin[];
}

const PluginContext = createContext<PluginStore | null>(null);

export function PluginProvider({ children }: { children: React.ReactNode }) {
  const allPlugins = registry.getAll();
  const [activePlugin, setActivePlugin] = useState<ContentTypePlugin>(allPlugins[0]);

  const setActivePluginId = (id: string) => {
    const plugin = registry.get(id);
    if (plugin) setActivePlugin(plugin);
  };

  return (
    <PluginContext.Provider value={{ activePlugin, setActivePluginId, allPlugins }}>
      {children}
    </PluginContext.Provider>
  );
}

export function usePluginStore(): PluginStore {
  const ctx = useContext(PluginContext);
  if (!ctx) throw new Error('usePluginStore must be used within PluginProvider');
  return ctx;
}
