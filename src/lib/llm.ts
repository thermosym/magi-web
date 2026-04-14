import { PROVIDERS, type ProviderId } from './providers'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LLMCallRequest {
  provider: ProviderId
  apiBase: string
  apiKey: string
  model: string
  messages: ChatMessage[]
  maxTokens?: number
  temperature?: number
  signal?: AbortSignal
}

interface OpenAICompletionResponse {
  choices?: Array<{
    message?: {
      content?: string
      reasoning_content?: string
    }
    finish_reason?: string
  }>
  error?: {
    message?: string
  }
}

interface AnthropicContentBlock {
  type: string
  text?: string
}

interface AnthropicMessagesResponse {
  content?: AnthropicContentBlock[]
  error?: {
    message?: string
    type?: string
  }
}

const MAX_ERROR_TEXT = 300
const CONTROL_CHARS = /[\r\n\0]/

function assertNoControlChars(value: string, field: string): void {
  if (CONTROL_CHARS.test(value)) {
    throw new Error(`Invalid ${field}: contains control characters`)
  }
}

function truncateErrorText(text: string): string {
  const safe = text || ''
  return safe.length > MAX_ERROR_TEXT
    ? `${safe.slice(0, MAX_ERROR_TEXT)}… (truncated)`
    : safe
}

function joinUrl(base: string, path: string): string {
  const trimmed = base.replace(/\/+$/, '')
  const suffix = path.startsWith('/') ? path : `/${path}`
  return `${trimmed}${suffix}`
}

function shouldDisableThinking(req: LLMCallRequest): boolean {
  // custom providers (LM Studio, Ollama, llama.cpp) accept chat_template_kwargs
  // and typically ignore unknown fields safely. Qwen3 family benefits from
  // explicitly disabling its thinking mode to avoid empty-content truncation.
  if (req.provider === 'custom') return true
  return req.model.toLowerCase().includes('qwen3')
}

async function openaiCompatChat(req: LLMCallRequest): Promise<string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (req.apiKey) {
    headers.Authorization = `Bearer ${req.apiKey}`
  }
  if (req.provider === 'openrouter') {
    headers['HTTP-Referer'] =
      typeof window !== 'undefined' ? window.location.origin : 'magi-web'
    headers['X-Title'] = 'MAGI System'
  }

  const body: Record<string, unknown> = {
    model: req.model,
    messages: req.messages,
    max_tokens: req.maxTokens ?? 4096,
    temperature: req.temperature ?? 0.7,
  }
  if (shouldDisableThinking(req)) {
    body.chat_template_kwargs = { enable_thinking: false }
  }

  const url = joinUrl(req.apiBase, '/chat/completions')

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: req.signal,
    referrerPolicy: 'no-referrer',
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(
      `${req.provider} request failed (${res.status}): ${truncateErrorText(text || res.statusText)}`,
    )
  }

  const data = (await res.json()) as OpenAICompletionResponse
  if (data.error?.message) {
    throw new Error(truncateErrorText(data.error.message))
  }

  const choice = data.choices?.[0]
  const content = choice?.message?.content
  const finishReason = choice?.finish_reason
  const reasoning = choice?.message?.reasoning_content

  if (typeof content === 'string' && content.length > 0) {
    return content
  }

  if (finishReason === 'length') {
    const hint = reasoning
      ? ` reasoning_content so far: ${truncateErrorText(reasoning.slice(0, 120))}`
      : ''
    throw new Error(
      `${req.provider} truncated by max_tokens before producing any content (reasoning model?).${hint}`,
    )
  }

  if (typeof content === 'string' && content.length === 0 && reasoning) {
    throw new Error(
      `${req.provider} returned only reasoning_content, no final content. finish_reason=${finishReason ?? 'unknown'}`,
    )
  }

  throw new Error(
    `${req.provider} returned an empty response (finish_reason=${finishReason ?? 'unknown'})`,
  )
}

interface AnthropicChatMessage {
  role: 'user' | 'assistant'
  content: string
}

function splitSystemAndMessages(messages: ChatMessage[]): {
  system: string
  rest: AnthropicChatMessage[]
} {
  const systemParts: string[] = []
  const rest: AnthropicChatMessage[] = []
  for (const m of messages) {
    if (m.role === 'system') {
      systemParts.push(m.content)
    } else {
      rest.push({ role: m.role, content: m.content })
    }
  }
  return { system: systemParts.join('\n\n'), rest }
}

async function anthropicChat(req: LLMCallRequest): Promise<string> {
  const { system, rest } = splitSystemAndMessages(req.messages)

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': req.apiKey,
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true',
  }

  const body = {
    model: req.model,
    max_tokens: req.maxTokens ?? 4096,
    temperature: req.temperature ?? 0.7,
    system: system || undefined,
    messages: rest,
  }

  const url = joinUrl(req.apiBase, '/messages')

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: req.signal,
    referrerPolicy: 'no-referrer',
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(
      `anthropic request failed (${res.status}): ${truncateErrorText(text || res.statusText)}`,
    )
  }

  const data = (await res.json()) as AnthropicMessagesResponse
  if (data.error?.message) {
    throw new Error(truncateErrorText(data.error.message))
  }

  const textBlocks = (data.content ?? [])
    .filter((block) => block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text as string)

  if (textBlocks.length === 0) {
    throw new Error('anthropic returned no text content')
  }
  return textBlocks.join('')
}

export async function chatCompletion(req: LLMCallRequest): Promise<string> {
  if (!req.apiBase) {
    throw new Error('API base URL is missing')
  }
  if (!req.model) {
    throw new Error('Model is not set')
  }

  assertNoControlChars(req.apiBase, 'apiBase')
  assertNoControlChars(req.model, 'model')
  if (req.apiKey) {
    assertNoControlChars(req.apiKey, 'apiKey')
  }

  const info = PROVIDERS[req.provider]
  if (!req.apiKey && req.provider !== 'custom') {
    throw new Error('API key is missing')
  }
  if (info.kind === 'anthropic') {
    if (!req.apiKey) {
      throw new Error('Anthropic requires an API key')
    }
    return anthropicChat(req)
  }
  return openaiCompatChat(req)
}
