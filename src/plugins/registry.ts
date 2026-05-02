import { ContentTypePlugin } from './types';
import { leetcodePlugin } from './leetcode';
import { grammarPlugin } from './grammar';
import { javaInterviewPlugin } from './java-interview';

const plugins = new Map<string, ContentTypePlugin>();

function register(plugin: ContentTypePlugin): void {
  plugins.set(plugin.id, plugin);
}

register(javaInterviewPlugin);
register(grammarPlugin);
register(leetcodePlugin);

export const registry = {
  register,
  get(id: string): ContentTypePlugin | undefined {
    return plugins.get(id);
  },
  getAll(): ContentTypePlugin[] {
    return Array.from(plugins.values());
  },
};
