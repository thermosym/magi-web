import { useEffect, useMemo } from 'react'
import {
  PROVIDERS,
  PROVIDER_ORDER,
  type ProviderId,
} from '../lib/providers'
import {
  WISE_MAN_ORDER,
  type WiseManAnswer,
  type WiseManConfig,
  type WiseManName,
} from '../lib/types'

interface WiseManModalProps {
  name: WiseManName
  config: WiseManConfig
  answer: WiseManAnswer
  question: string
  onClose: () => void
  onConfigChange: (patch: Partial<WiseManConfig>) => void
}

const CUSTOM_MODEL_SENTINEL = '__custom__'

function isProviderId(value: string): value is ProviderId {
  return Object.prototype.hasOwnProperty.call(PROVIDERS, value)
}

export function WiseManModal({
  name,
  config,
  answer,
  question,
  onClose,
  onConfigChange,
}: WiseManModalProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const provider = PROVIDERS[config.provider]
  const fullName = `${name.toUpperCase()} • ${WISE_MAN_ORDER[name]}`

  const modelOptions = useMemo(() => {
    const defaults = [...provider.defaultModels]
    const seen = new Set(defaults)
    if (config.model && !seen.has(config.model)) {
      defaults.unshift(config.model)
    }
    return defaults
  }, [provider, config.model])

  const modelSelectValue = modelOptions.includes(config.model)
    ? config.model
    : CUSTOM_MODEL_SENTINEL

  function handleProviderChange(nextId: ProviderId) {
    const next = PROVIDERS[nextId]
    onConfigChange({
      provider: nextId,
      apiBase: next.defaultApiBase,
      model: next.defaultModels[0] ?? '',
    })
  }

  function handleModelSelectChange(value: string) {
    if (value === CUSTOM_MODEL_SENTINEL) {
      onConfigChange({ model: '' })
      return
    }
    onConfigChange({ model: value })
  }

  const apiBaseDisabled = config.provider !== 'custom'

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="modal" role="dialog" aria-label={`${name} details`}>
        <div className="modal-header">
          <div className="modal-title">{fullName}</div>
          <button
            type="button"
            className="close"
            onClick={onClose}
            aria-label="Close"
          >
            X
          </button>
        </div>
        <div className="modal-body">
          <div className="modal-row">
            <div className="modal-col">
              <div className="modal-section-label">provider:</div>
              <select
                className="modal-select"
                value={config.provider}
                onChange={(e) => {
                  const value = e.target.value
                  if (isProviderId(value)) {
                    handleProviderChange(value)
                  }
                }}
              >
                {PROVIDER_ORDER.map((id) => (
                  <option key={id} value={id}>
                    {PROVIDERS[id].name}
                  </option>
                ))}
              </select>
            </div>
            <div className="modal-col">
              <div className="modal-section-label">apiBase:</div>
              <input
                type="text"
                className="modal-input"
                value={config.apiBase}
                disabled={apiBaseDisabled}
                onChange={(e) => onConfigChange({ apiBase: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>

          <Section label="apiKey">
            <input
              type="password"
              className="modal-input"
              value={config.apiKey}
              autoComplete="off"
              onChange={(e) => onConfigChange({ apiKey: e.target.value })}
              placeholder={
                config.provider === 'custom'
                  ? 'leave blank if the endpoint requires no key'
                  : 'paste your API key'
              }
            />
          </Section>

          <Section label="model">
            <select
              className="modal-select"
              value={modelSelectValue}
              onChange={(e) => handleModelSelectChange(e.target.value)}
            >
              {modelOptions.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
              <option value={CUSTOM_MODEL_SENTINEL}>Custom...</option>
            </select>
            {modelSelectValue === CUSTOM_MODEL_SENTINEL && (
              <input
                type="text"
                className="modal-input"
                value={config.model}
                placeholder="type a model id"
                onChange={(e) => onConfigChange({ model: e.target.value })}
                style={{ marginTop: 6 }}
              />
            )}
          </Section>

          <Section label="personality">
            <textarea
              className="modal-input"
              rows={3}
              value={config.personality}
              onChange={(e) => onConfigChange({ personality: e.target.value })}
            />
          </Section>

          <Section label="question">
            <div className="modal-section-value">{question || '(none)'}</div>
          </Section>

          <Section label="status">
            <div className="modal-section-value">
              {answer.status ?? '(pending)'}
            </div>
          </Section>

          {answer.error && (
            <Section label="error">
              <div className="modal-section-value">{answer.error}</div>
            </Section>
          )}

          {answer.conditions &&
            answer.conditions.trim() !== answer.response.trim() && (
              <Section label="conditions">
                <div className="modal-section-value">{answer.conditions}</div>
              </Section>
            )}

          <Section label="full response">
            <div className="modal-section-value">
              {answer.response || '(no response yet)'}
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}

interface SectionProps {
  label: string
  children: React.ReactNode
}

function Section({ label, children }: SectionProps) {
  return (
    <div>
      <div className="modal-section-label">{label}:</div>
      {children}
    </div>
  )
}
