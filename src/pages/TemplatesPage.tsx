import { Card } from '../components/Card'
import { SectionTitle } from '../components/SectionTitle'
import { templatesMock } from '../data/omrMock'
import { API_ENDPOINTS } from '../services/apiClient'

export function TemplatesPage() {
  return (
    <section>
      <SectionTitle
        title="Modelos de cartão"
        subtitle={`Cadastro preparado para ${API_ENDPOINTS.templates}.`}
      />

      <Card>
        <h3>Templates mockados</h3>
        <ul>
          {templatesMock.map((template) => (
            <li key={template.id}>
              {template.name} ({template.version}) — {template.totalQuestions} questões
            </li>
          ))}
        </ul>
      </Card>
    </section>
  )
}
