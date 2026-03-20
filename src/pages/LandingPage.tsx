import { Link } from 'react-router-dom'
import { Button } from '../components/Button'
import { Card } from '../components/Card'

export function LandingPage() {
  return (
    <main className="landing landing--saas">
      <section className="landing__hero">
        <span className="landing__badge">Leitura OMR para operacao academica</span>
        <h1>Automatize a correcao de provas com um fluxo claro, rastreavel e pronto para producao</h1>
        <p>
          Envie cartoes, organize templates e gabaritos, processe lotes completos e acompanhe os resultados em uma
          interface pensada para operacao diaria.
        </p>
        <div className="landing__actions">
          <Link to="/app/dashboard">
            <Button>Abrir painel</Button>
          </Link>
          <Link to="/app/results">
            <Button variant="secondary">Processar lote</Button>
          </Link>
        </div>
      </section>

      <section className="landing__highlights">
        <Card>
          <h3>Fila operacional</h3>
          <p>Uploads, templates, gabaritos e jobs conectados no mesmo fluxo.</p>
        </Card>
        <Card>
          <h3>Leitura com contexto</h3>
          <p>Confidencia, alertas e desempenho por aluno organizados em uma unica visao.</p>
        </Card>
        <Card>
          <h3>Pronto para evoluir</h3>
          <p>Base integrada ao backend para ampliar validacoes, relatorios e automacoes.</p>
        </Card>
      </section>
    </main>
  )
}
