export type ProviderId =
  | 'openrouter'
  | 'openai'
  | 'claude'
  | 'gemini'
  | 'deepseek'
  | 'qwen'
  | 'glm'
  | 'minimax'
  | 'apiyi'
  | 'custom'

export type ProviderKind = 'openai-compat' | 'anthropic'

export interface ProviderInfo {
  id: ProviderId
  name: string
  kind: ProviderKind
  defaultApiBase: string
  defaultModels: readonly string[]
}

export const PROVIDERS: Record<ProviderId, ProviderInfo> = {
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    kind: 'openai-compat',
    defaultApiBase: 'https://openrouter.ai/api/v1',
    defaultModels: [
      'openai/gpt-oss-120b:free',
      'meta-llama/llama-3.3-70b-instruct:free',
      'google/gemma-3-27b-it:free',
      'anthropic/claude-opus-4.5',
      'anthropic/claude-sonnet-4.5',
    ],
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    kind: 'openai-compat',
    defaultApiBase: 'https://api.openai.com/v1',
    defaultModels: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o1-mini'],
  },
  claude: {
    id: 'claude',
    name: 'Claude (Anthropic)',
    kind: 'anthropic',
    defaultApiBase: 'https://api.anthropic.com/v1',
    defaultModels: [
      'claude-opus-4-5',
      'claude-sonnet-4-5',
      'claude-haiku-4-5',
    ],
  },
  gemini: {
    id: 'gemini',
    name: 'Gemini',
    kind: 'openai-compat',
    defaultApiBase: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModels: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash'],
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    kind: 'openai-compat',
    defaultApiBase: 'https://api.deepseek.com/v1',
    defaultModels: ['deepseek-chat', 'deepseek-reasoner'],
  },
  qwen: {
    id: 'qwen',
    name: 'Qwen (DashScope)',
    kind: 'openai-compat',
    defaultApiBase: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModels: [
      'qwen-max',
      'qwen-plus',
      'qwen-turbo',
      'qwen3-coder-plus',
    ],
  },
  glm: {
    id: 'glm',
    name: 'GLM (Zhipu)',
    kind: 'openai-compat',
    defaultApiBase: 'https://open.bigmodel.cn/api/paas/v4',
    defaultModels: ['glm-4-plus', 'glm-4-air', 'glm-4-flash'],
  },
  minimax: {
    id: 'minimax',
    name: 'MiniMax',
    kind: 'openai-compat',
    defaultApiBase: 'https://api.minimaxi.com/v1',
    defaultModels: ['MiniMax-Text-01', 'abab6.5s-chat'],
  },
  apiyi: {
    id: 'apiyi',
    name: 'APIYI',
    kind: 'openai-compat',
    defaultApiBase: 'https://vip.apiyi.com/v1',
    defaultModels: [
      'gpt-4o',
      'gpt-4o-mini',
      'claude-sonnet-4-5',
      'gemini-2.5-pro',
    ],
  },
  custom: {
    id: 'custom',
    name: 'Custom',
    kind: 'openai-compat',
    defaultApiBase: 'http://localhost:1234/v1',
    defaultModels: [],
  },
}

export const PROVIDER_ORDER: readonly ProviderId[] = [
  'custom',
  'apiyi',
  'openrouter',
  'openai',
  'claude',
  'gemini',
  'deepseek',
  'qwen',
  'glm',
  'minimax',
]
