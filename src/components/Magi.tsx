import type { ReactNode } from 'react'

interface MagiProps {
  children: ReactNode
}

export function Magi({ children }: MagiProps) {
  return (
    <div className="magi">
      <div className="connection casper-balthasar" />
      <div className="connection casper-melchior" />
      <div className="connection balthasar-melchior" />
      {children}
      <div className="title">MAGI</div>
    </div>
  )
}
