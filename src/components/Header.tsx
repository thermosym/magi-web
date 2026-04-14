interface HeaderProps {
  side: 'left' | 'right'
  title: string
}

export function Header({ side, title }: HeaderProps) {
  return (
    <div className={`header ${side}`}>
      <hr />
      <hr />
      <span>{title}</span>
      <hr />
      <hr />
    </div>
  )
}
