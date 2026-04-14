import {
  WISE_MAN_ORDER,
  type AnswerStatus,
  type WiseManName,
} from '../lib/types'

interface WiseManProps {
  name: WiseManName
  status: AnswerStatus | null
  processing: boolean
  configured: boolean
  hasAnswer: boolean
  onClick: () => void
}

const STATUS_BACKGROUND: Record<AnswerStatus, string> = {
  yes: '#52e691',
  no: '#a41413',
  conditional_yes:
    'repeating-linear-gradient(56deg, rgb(82, 230, 145) 0px, rgb(82, 230, 145) 30px, #82cd68 30px, #82cd68 60px)',
  error: 'black',
}

const UNCONFIGURED_BG = '#f0a0a0'
const IDLE_READY_BG = '#3caee0'

export function WiseMan({
  name,
  status,
  processing,
  configured,
  hasAnswer,
  onClick,
}: WiseManProps) {
  const fullName = `${name.toUpperCase()} • ${WISE_MAN_ORDER[name]}`
  const innerClassName = processing ? 'inner flicker' : 'inner'

  let background: string
  let color: string | undefined
  let label: React.ReactNode
  if (!configured) {
    background = UNCONFIGURED_BG
    label = (
      <>
        {fullName}
        <br />
        待機
      </>
    )
  } else if (!hasAnswer || status === null) {
    background = IDLE_READY_BG
    label = fullName
  } else if (status === 'error') {
    background = '#000'
    color = '#a41413'
    label = fullName
  } else {
    background = STATUS_BACKGROUND[status]
    label = fullName
  }

  return (
    <button
      type="button"
      className={`wise-man ${name}`}
      onClick={onClick}
      aria-label={`Open ${name} details`}
    >
      <div className={innerClassName} style={{ background, color }}>
        {label}
      </div>
    </button>
  )
}
