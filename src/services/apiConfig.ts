const CONFIG_KEY = 'pex_api_config';

export interface ApiConfig {
  apiKey: string;
  baseURL: string;
  preset: 'deepseek' | 'openai' | 'custom';
}

export const PRESETS: Record<ApiConfig['preset'], { label: string; baseURL: string }> = {
  deepseek: { label: 'DeepSeek', baseURL: 'https://api.deepseek.com' },
  openai: { label: 'OpenAI', baseURL: 'https://api.openai.com/v1' },
  custom: { label: '自定义', baseURL: '' },
};

export function getApiConfig(): Partial<ApiConfig> {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    return raw ? (JSON.parse(raw) as ApiConfig) : {};
  } catch {
    return {};
  }
}

export function saveApiConfig(config: ApiConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export function hasApiConfig(): boolean {
  const config = getApiConfig();
  return !!(config.apiKey?.trim());
}

export function getApiConfigForRequest(): { apiKey?: string; baseURL?: string } {
  const config = getApiConfig();
  return {
    ...(config.apiKey ? { apiKey: config.apiKey } : {}),
    ...(config.baseURL ? { baseURL: config.baseURL } : {}),
  };
}
