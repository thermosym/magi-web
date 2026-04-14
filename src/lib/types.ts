import { PROVIDERS, type ProviderId } from './providers'

export type WiseManName = 'melchior' | 'balthasar' | 'casper'

export const WISE_MEN: readonly WiseManName[] = [
  'melchior',
  'balthasar',
  'casper',
] as const

export type AnswerStatus = 'yes' | 'no' | 'conditional_yes' | 'error'

export interface WiseManConfig {
  provider: ProviderId
  apiBase: string
  apiKey: string
  model: string
  personality: string
}

export interface MagiConfig {
  wiseMen: Record<WiseManName, WiseManConfig>
}

export interface Question {
  id: number
  query: string
}

export interface WiseManAnswer {
  id: number
  status: AnswerStatus | null
  response: string
  conditions: string | null
  error: string | null
}

export const WISE_MAN_ORDER: Record<WiseManName, number> = {
  melchior: 1,
  balthasar: 2,
  casper: 3,
}

export const DEFAULT_PERSONALITIES: Record<WiseManName, string> = {
  melchior:
    'You are a scientist. Your goal is to further our understanding of the universe and advance our technological progress.',
  balthasar:
    'You are a mother. Your goal is to protect your children and ensure their well-being.',
  casper:
    'You are a woman. Your goal is to pursue love, dreams and desires.',
}

export function buildDefaultWiseManConfig(name: WiseManName): WiseManConfig {
  const defaultProvider: ProviderId = 'custom'
  const info = PROVIDERS[defaultProvider]
  return {
    provider: defaultProvider,
    apiBase: info.defaultApiBase,
    apiKey: '',
    model: info.defaultModels[0] ?? '',
    personality: DEFAULT_PERSONALITIES[name],
  }
}

export function isWiseManConfigured(config: WiseManConfig): boolean {
  if (config.provider.length === 0) return false
  if (config.apiBase.trim().length === 0) return false
  if (config.model.trim().length === 0) return false
  // custom provider (e.g. LM Studio) may run without an API key
  if (config.provider !== 'custom' && config.apiKey.trim().length === 0) {
    return false
  }
  return true
}
