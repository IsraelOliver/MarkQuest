import type { ReactNode } from 'react'

type CabecalhoProps = {
  breadcrumb?: ReactNode
  title: string
  subtitle?: string
  actions?: ReactNode
}

export function Cabecalho({ breadcrumb, title, subtitle, actions }: CabecalhoProps) {
  return (
    <header className="page-header">
      {breadcrumb ? <div className="page-header__breadcrumb">{breadcrumb}</div> : null}
      <h1 className="page-header__title">{title}</h1>
      {subtitle ? <p className="page-header__subtitle">{subtitle}</p> : null}
      {actions ? <div className="page-header__actions">{actions}</div> : null}
    </header>
  )
}
