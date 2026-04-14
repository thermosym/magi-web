import {
  WISE_MEN,
  buildDefaultWiseManConfig,
  type MagiConfig,
  type WiseManConfig,
  type WiseManName,
} from './types'
import { PROVIDERS, type ProviderId } from './providers'

const STORAGE_KEY = 'magi.config.v2'
const HISTORY_KEY = 'magi.history.v1'
const MAX_HISTORY = 50

function buildDefaultConfig(): MagiConfig {
  const wiseMen = WISE_MEN.reduce(
    (acc, name) => {
      acc[name] = buildDefaultWiseManConfig(name)
      return acc
    },
    {} as Record<WiseManName, WiseManConfig>,
  )
  return { wiseMen }
}

function isProviderId(value: unknown): value is ProviderId {
  return typeof value === 'string' && value in PROVIDERS
}

const MAX_PERSONALITY_LENGTH = 2000
const MAX_API_BASE_LENGTH = 500
const MAX_API_KEY_LENGTH = 500
const MAX_MODEL_LENGTH = 200

function isValidWiseMan(value: unknown): value is WiseManConfig {
  if (!value || typeof value !== 'object') return false
  const wm = value as Partial<WiseManConfig>
  return (
    isProviderId(wm.provider) &&
    typeof wm.apiBase === 'string' &&
    wm.apiBase.length <= MAX_API_BASE_LENGTH &&
    typeof wm.apiKey === 'string' &&
    wm.apiKey.length <= MAX_API_KEY_LENGTH &&
    typeof wm.model === 'string' &&
    wm.model.length <= MAX_MODEL_LENGTH &&
    typeof wm.personality === 'string' &&
    wm.personality.length <= MAX_PERSONALITY_LENGTH
  )
}

function isValidConfig(value: unknown): value is MagiConfig {
  if (!value || typeof value !== 'object') return false
  const cfg = value as Partial<MagiConfig>
  if (!cfg.wiseMen || typeof cfg.wiseMen !== 'object') return false
  return WISE_MEN.every((name) => isValidWiseMan(cfg.wiseMen?.[name]))
}

export function loadConfig(): MagiConfig {
  if (typeof localStorage === 'undefined') return buildDefaultConfig()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return buildDefaultConfig()
    const parsed: unknown = JSON.parse(raw)
    if (!isValidConfig(parsed)) return buildDefaultConfig()
    return parsed
  } catch {
    return buildDefaultConfig()
  }
}

export function saveConfig(config: MagiConfig): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

export function updateWiseMan(
  config: MagiConfig,
  name: WiseManName,
  patch: Partial<WiseManConfig>,
): MagiConfig {
  return {
    ...config,
    wiseMen: {
      ...config.wiseMen,
      [name]: { ...config.wiseMen[name], ...patch },
    },
  }
}

export function loadHistory(): string[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((v): v is string => typeof v === 'string')
  } catch {
    return []
  }
}

export function saveHistory(history: readonly string[]): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
}

export function addToHistory(
  history: readonly string[],
  query: string,
): string[] {
  const trimmed = query.trim()
  if (!trimmed) return [...history]
  const filtered = history.filter((q) => q !== trimmed)
  const updated = [trimmed, ...filtered]
  return updated.slice(0, MAX_HISTORY)
}
