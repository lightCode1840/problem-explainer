import { ContentTypePlugin } from './types';

const plugins = new Map<string, ContentTypePlugin>();

export const registry = {
  register(plugin: ContentTypePlugin): void {
    plugins.set(plugin.id, plugin);
  },
  get(id: string): ContentTypePlugin | undefined {
    return plugins.get(id);
  },
  getAll(): ContentTypePlugin[] {
    return Array.from(plugins.values());
  },
};
