import { Link } from 'react-router-dom'
import { Button } from '../components/Button'
import { Card } from '../components/Card'

export function LandingPage() {
  return (
    <main className="landing landing--saas">
      <section className="landing__hero">
        <span className="landing__badge">SaaS para leitura de cartões-resposta</span>
        <h1>Automatize a correção de provas com OMR profissional</h1>
        <p>
          Faça upload de cartões, processe leituras em lote e acompanhe resultados com uma interface limpa,
          moderna e pronta para escalar.
        </p>
        <div className="landing__actions">
          <Link to="/app/dashboard">
            <Button>Entrar no dashboard</Button>
          </Link>
          <Link to="/app/uploads">
            <Button variant="secondary">Testar upload</Button>
          </Link>
        </div>
      </section>

      <section className="landing__highlights">
        <Card>
          <h3>Leitura inteligente</h3>
          <p>Pipeline OMR com rastreamento de confiança por cartão.</p>
        </Card>
        <Card>
          <h3>Fluxo em lote</h3>
          <p>Envie múltiplos cartões e monitore jobs de processamento.</p>
        </Card>
        <Card>
          <h3>Resultados acionáveis</h3>
          <p>Visualize notas, acertos e alertas em tabelas organizadas.</p>
        </Card>
      </section>
    </main>
  )
}
