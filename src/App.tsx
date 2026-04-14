import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { Header } from './components/Header'
import { Magi } from './components/Magi'
import { QuestionInput } from './components/QuestionInput'
import { Response } from './components/Response'
import { Status } from './components/Status'
import { WiseMan } from './components/WiseMan'
import { WiseManModal } from './components/WiseManModal'
import { aggregateStatus, askWiseMan } from './lib/magi'
import {
  addToHistory,
  loadConfig,
  loadHistory,
  saveConfig,
  saveHistory,
  updateWiseMan,
} from './lib/storage'
import {
  WISE_MEN,
  isWiseManConfigured,
  type AnswerStatus,
  type MagiConfig,
  type WiseManAnswer,
  type WiseManConfig,
  type WiseManName,
} from './lib/types'

interface AppState {
  questionId: number
  query: string
  submittedQuery: string
  answeredId: number
  answers: Record<WiseManName, WiseManAnswer>
  responseStatus: AnswerStatus | null
}

type Action =
  | { type: 'set-query'; query: string }
  | { type: 'submit'; query: string }
  | { type: 'wise-answered'; name: WiseManName; answer: WiseManAnswer }
  | { type: 'reset' }

function emptyAnswer(id: number): WiseManAnswer {
  return {
    id,
    status: null,
    response: '',
    conditions: null,
    error: null,
  }
}

function initialState(): AppState {
  const id = 0
  return {
    questionId: id,
    query: '',
    submittedQuery: '',
    answeredId: id,
    answers: {
      melchior: emptyAnswer(id),
      balthasar: emptyAnswer(id),
      casper: emptyAnswer(id),
    },
    responseStatus: null,
  }
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'set-query':
      return { ...state, query: action.query }
    case 'submit': {
      const id = state.questionId + 1
      return {
        ...state,
        questionId: id,
        submittedQuery: action.query,
        answeredId: state.answeredId,
        answers: {
          melchior: emptyAnswer(state.answeredId),
          balthasar: emptyAnswer(state.answeredId),
          casper: emptyAnswer(state.answeredId),
        },
      }
    }
    case 'wise-answered': {
      if (action.answer.id !== state.questionId) return state
      const answers = { ...state.answers, [action.name]: action.answer }
      const allDone = WISE_MEN.every((n) => answers[n].id === state.questionId)
      return {
        ...state,
        answers,
        answeredId: allDone ? state.questionId : state.answeredId,
        responseStatus: allDone
          ? aggregateStatus(WISE_MEN.map((n) => answers[n]))
          : state.responseStatus,
      }
    }
    case 'reset': {
      const id = state.questionId + 1
      return {
        ...state,
        questionId: id,
        answeredId: id,
        query: '',
        submittedQuery: '',
        answers: {
          melchior: emptyAnswer(id),
          balthasar: emptyAnswer(id),
          casper: emptyAnswer(id),
        },
        responseStatus: null,
      }
    }
    default:
      return state
  }
}

export default function App() {
  const [config, setConfig] = useState<MagiConfig>(() => loadConfig())
  const [history, setHistory] = useState<string[]>(() => loadHistory())
  const [state, dispatch] = useReducer(reducer, undefined, initialState)
  const [openModal, setOpenModal] = useState<WiseManName | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const questionIdRef = useRef(state.questionId)

  useEffect(() => {
    questionIdRef.current = state.questionId
  }, [state.questionId])

  useEffect(() => {
    saveConfig(config)
  }, [config])

  useEffect(() => {
    saveHistory(history)
  }, [history])

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  const setWiseManConfig = useCallback(
    (name: WiseManName, patch: Partial<WiseManConfig>) =>
      setConfig((prev) => updateWiseMan(prev, name, patch)),
    [],
  )

  const setQuery = useCallback(
    (query: string) => dispatch({ type: 'set-query', query }),
    [],
  )

  const handleReset = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    dispatch({ type: 'reset' })
  }, [])

  const allConfigured = WISE_MEN.every((n) =>
    isWiseManConfigured(config.wiseMen[n]),
  )

  const responseProcessing = state.questionId !== state.answeredId

  const handleSubmit = useCallback(
    async (query: string) => {
      if (!allConfigured) return

      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      dispatch({ type: 'submit', query })
      setHistory((prev) => addToHistory(prev, query))
      const nextId = questionIdRef.current + 1
      questionIdRef.current = nextId

      await Promise.all(
        WISE_MEN.map(async (name) => {
          const answer = await askWiseMan({
            questionId: nextId,
            query,
            config: config.wiseMen[name],
            signal: controller.signal,
          })
          if (controller.signal.aborted) return
          dispatch({ type: 'wise-answered', name, answer })
        }),
      )
    },
    [allConfigured, config],
  )
  const extension = state.responseStatus === null ? '3023' : '7312'
  const extensionLabel = responseProcessing ? '????' : extension

  const inputDisabled = !allConfigured || responseProcessing
  const inputDisabledReason = !allConfigured
    ? 'click each wise man to configure its provider, apiKey and model'
    : 'processing previous question...'

  return (
    <div className="system">
      <Magi>
        <Header side="left" title="質 問" />
        <Header side="right" title="解 決" />
        <Status extension={extensionLabel} />
        {WISE_MEN.map((name) => {
          const answer = state.answers[name]
          const wm = config.wiseMen[name]
          const configured = isWiseManConfigured(wm)
          const hasAnswer = answer.status !== null
          const processing = answer.id !== state.questionId
          return (
            <WiseMan
              key={name}
              name={name}
              status={answer.status}
              processing={processing}
              configured={configured}
              hasAnswer={hasAnswer}
              onClick={() => setOpenModal(name)}
            />
          )
        })}
        <Response
          status={state.responseStatus}
          processing={responseProcessing}
        />
      </Magi>

      <QuestionInput
        query={state.query}
        onQueryChange={setQuery}
        history={history}
        onSubmit={handleSubmit}
        onReset={handleReset}
        disabled={inputDisabled}
        disabledReason={inputDisabledReason}
      />

      <p className="notice">
        API keys are stored only in this browser&apos;s localStorage. Do not use
        this app on shared computers.{' '}
        <a
          className="repo-link"
          href="https://github.com/thermosym/magi-web"
          target="_blank"
          rel="noreferrer noopener"
        >
          [ source on github ]
        </a>
      </p>

      {openModal && (
        <WiseManModal
          name={openModal}
          config={config.wiseMen[openModal]}
          answer={state.answers[openModal]}
          question={state.submittedQuery}
          onClose={() => setOpenModal(null)}
          onConfigChange={(patch) => setWiseManConfig(openModal, patch)}
        />
      )}
    </div>
  )
}
