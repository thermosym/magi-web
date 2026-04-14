import { chatCompletion, type ChatMessage } from './llm'
import type { ProviderId } from './providers'
import type { AnswerStatus, WiseManAnswer, WiseManConfig } from './types'

interface CallCtx {
  provider: ProviderId
  apiBase: string
  apiKey: string
  model: string
  signal?: AbortSignal
}

const APPENDED_USER_INSTRUCTION =
  'try your best to answer yes or no. If really not sure then conditional_yes. if you are panic then error. use my original language to give reasons.'

function buildSystemPrompt(personality: string): string {
  return [
    'You are one of three MAGI supercomputers, tasked with answering questions from the user of the MAGI system.',
    "Each MAGI supercomputer embodies one of the three core fragments of its creator's (Naoko Akagi's) personality.",
    `In your case: ${personality}`,
    'You answer questions in accordance with your personality.',
    'Your answers are rather concise.',
    '',
    'After your answer, on its own final line, output exactly one status tag describing your answer:',
    '  STATUS: YES             — your answer is a definite yes',
    '  STATUS: NO              — your answer is a definite no',
    '  STATUS: CONDITIONAL_YES — your answer is yes only under specific conditions that you explain above',
    '  STATUS: ERROR           — you cannot answer (panic, refusal, insufficient information)',
    'The STATUS line must be the last line, exactly in that format, with no other text after it.',
  ].join('\n')
}

const STATUS_PATTERN =
  /^\s*STATUS\s*:\s*(YES|NO|CONDITIONAL[_\s]?YES|ERROR)\b(.*)$/i

export interface ParsedAnswer {
  body: string
  status: AnswerStatus
  conditions: string | null
  parseError: string | null
}

function normalizeTag(raw: string): AnswerStatus {
  const v = raw.toUpperCase().replace(/\s+/g, '_')
  if (v === 'YES') return 'yes'
  if (v === 'NO') return 'no'
  if (v === 'ERROR') return 'error'
  return 'conditional_yes'
}

function cleanTrailing(trailing: string): string {
  // strip leading separators like " - ", " — ", " : ", " > " etc.
  return trailing.replace(/^[\s\-–—:>·•]+/, '').trim()
}

export function parseWiseManReply(reply: string): ParsedAnswer {
  const lines = reply.split(/\r?\n/)

  let tagIndex = -1
  let tagStatus: AnswerStatus | null = null
  let tagTrailing = ''

  for (let i = lines.length - 1; i >= 0; i--) {
    const m = STATUS_PATTERN.exec(lines[i])
    if (m) {
      tagIndex = i
      tagStatus = normalizeTag(m[1])
      tagTrailing = cleanTrailing(m[2] ?? '')
      break
    }
  }

  if (tagIndex === -1 || tagStatus === null) {
    return {
      body: reply.trim(),
      status: 'error',
      conditions: null,
      parseError: 'model did not output a STATUS tag',
    }
  }

  const body = lines.slice(0, tagIndex).join('\n').trim()

  let conditions: string | null = null
  if (tagStatus === 'conditional_yes') {
    conditions = tagTrailing.length > 0 ? tagTrailing : body || null
  }

  return { body, status: tagStatus, conditions, parseError: null }
}

function configToCtx(config: WiseManConfig, signal?: AbortSignal): CallCtx {
  return {
    provider: config.provider,
    apiBase: config.apiBase,
    apiKey: config.apiKey,
    model: config.model,
    signal,
  }
}

export interface AskWiseManInput {
  questionId: number
  query: string
  config: WiseManConfig
  signal?: AbortSignal
}

export async function askWiseMan(
  input: AskWiseManInput,
): Promise<WiseManAnswer> {
  const ctx = configToCtx(input.config, input.signal)

  const userContent = `${input.query}\n\n${APPENDED_USER_INSTRUCTION}`

  const messages: ChatMessage[] = [
    { role: 'system', content: buildSystemPrompt(input.config.personality) },
    { role: 'user', content: userContent },
  ]

  try {
    const reply = await chatCompletion({ ...ctx, messages })
    const parsed = parseWiseManReply(reply)
    return {
      id: input.questionId,
      status: parsed.status,
      response: parsed.body,
      conditions: parsed.conditions,
      error: parsed.parseError,
    }
  } catch (error: unknown) {
    return {
      id: input.questionId,
      status: 'error',
      response: '',
      conditions: null,
      error: getErrorMessage(error),
    }
  }
}

export function aggregateStatus(
  answers: readonly WiseManAnswer[],
): AnswerStatus {
  const statuses = answers
    .map((a) => a.status)
    .filter((s): s is AnswerStatus => s !== null)
  if (statuses.length === 0) return 'error'
  if (statuses.some((s) => s === 'error')) return 'error'
  if (statuses.some((s) => s === 'no')) return 'no'
  if (statuses.some((s) => s === 'conditional_yes')) return 'conditional_yes'
  if (statuses.every((s) => s === 'yes')) return 'yes'
  return 'error'
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'Unknown error'
}
