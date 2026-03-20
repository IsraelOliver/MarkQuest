import { Button } from './Button'

export function Topbar() {
  return (
    <header className="topbar">
      <div>
        <p className="topbar__eyebrow">Painel operacional</p>
        <h1>MarkQuest OMR</h1>
      </div>
      <div className="topbar__actions">
        <Button variant="secondary">Exportar</Button>
        <Button>Novo processamento</Button>
      </div>
    </header>
  )
}
