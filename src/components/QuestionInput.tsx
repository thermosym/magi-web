import type { FormEvent } from 'react'

interface QuestionInputProps {
  query: string
  onQueryChange: (query: string) => void
  history: readonly string[]
  onSubmit: (query: string) => void
  onReset: () => void
  disabled?: boolean
  disabledReason?: string
}

export function QuestionInput({
  query,
  onQueryChange,
  history,
  onSubmit,
  onReset,
  disabled,
  disabledReason,
}: QuestionInputProps) {
  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (disabled) return
    const trimmed = query.trim()
    if (!trimmed) return
    onSubmit(trimmed)
  }

  return (
    <form className="input-container" onSubmit={handleSubmit}>
      <label htmlFor="query">question:</label>
      <input
        id="query"
        type="text"
        list="question-history"
        autoComplete="off"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder={
          disabled
            ? (disabledReason ?? 'configure all three wise men first')
            : 'ask the MAGI (press enter)'
        }
        disabled={disabled}
      />
      <button
        type="button"
        className="reset-btn"
        onClick={onReset}
        title="Clear current question and answers"
      >
        reset
      </button>
      <datalist id="question-history">
        {history.map((q) => (
          <option key={q} value={q} />
        ))}
      </datalist>
      <button
        type="submit"
        style={{ display: 'none' }}
        aria-hidden="true"
        tabIndex={-1}
      />
    </form>
  )
}
