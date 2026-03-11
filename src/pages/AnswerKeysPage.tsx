import { Card } from '../components/Card'
import { SectionTitle } from '../components/SectionTitle'
import { answerKeysMock } from '../data/omrMock'
import { API_ENDPOINTS } from '../services/apiClient'

export function AnswerKeysPage() {
  return (
    <section>
      <SectionTitle title="Gabaritos" subtitle={`Criação preparada para ${API_ENDPOINTS.answerKeys}.`} />

      <Card>
        <h3>Gabaritos mockados</h3>
        <ul>
          {answerKeysMock.map((key) => (
            <li key={key.id}>
              {key.id} — versão {key.version} — {key.answers.length} respostas
            </li>
          ))}
        </ul>
      </Card>
    </section>
  )
}
