interface StatusProps {
  extension: string
}

export function Status({ extension }: StatusProps) {
  return (
    <div className="system-status">
      <div>CODE:473</div>
      <div>FILE:MAGI_SYS</div>
      <div>EXTENTION:{extension}</div>
      <div>EX_MODE:OFF</div>
      <div>PRIORITY:AAA</div>
    </div>
  )
}
