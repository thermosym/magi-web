import type { AnswerStatus } from '../lib/types'

interface ResponseProps {
  status: AnswerStatus | null
  processing: boolean
}

const STATUS_TEXT: Record<AnswerStatus, string> = {
  yes: '合 意',
  no: '拒 絶',
  conditional_yes: '状 態',
  error: '誤 差',
}

interface StatusStyle {
  background: string
  text: string
}

const STATUS_STYLE: Record<AnswerStatus, StatusStyle> = {
  yes: { background: '#52e691', text: '#000' },
  no: { background: '#a41413', text: '#fff' },
  conditional_yes: { background: '#ff8d00', text: '#000' },
  error: { background: '#000', text: '#a41413' },
}

const IDLE_STYLE: StatusStyle = { background: '#3caee0', text: '#000' }
const IDLE_TEXT = '待 機'

export function Response({ status, processing }: ResponseProps) {
  const className = processing ? 'response flicker' : 'response'
  const { background, text } = status ? STATUS_STYLE[status] : IDLE_STYLE
  const label = status ? STATUS_TEXT[status] : IDLE_TEXT

  return (
    <div
      className={className}
      style={{ color: text, background, borderColor: background }}
    >
      <div className="inner" style={{ borderColor: text }}>
        {label}
      </div>
    </div>
  )
}
