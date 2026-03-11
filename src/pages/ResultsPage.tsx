import { SectionTitle } from '../components/SectionTitle'
import { Table } from '../components/Table'
import { omrResultsMock, studentResultsMock } from '../data/omrMock'
import { API_ENDPOINTS } from '../services/apiClient'

export function ResultsPage() {
  return (
    <section>
      <SectionTitle
        title="Resultados de leitura"
        subtitle={`Dados simulados para integração futura com ${API_ENDPOINTS.results}.`}
      />

      <SectionTitle title="Resultados OMR" />
      <Table
        data={omrResultsMock}
        columns={[
          { key: 'answerSheetId', header: 'Cartão' },
          { key: 'confidence', header: 'Confiança', render: (item) => `${(item.confidence * 100).toFixed(1)}%` },
          { key: 'warnings', header: 'Alertas', render: (item) => (item.warnings.length ? item.warnings.join(', ') : 'Nenhum') },
        ]}
      />

      <SectionTitle title="Resultados por aluno" />
      <Table
        data={studentResultsMock}
        columns={[
          { key: 'studentName', header: 'Aluno' },
          { key: 'score', header: 'Nota' },
          { key: 'correctAnswers', header: 'Acertos' },
          { key: 'incorrectAnswers', header: 'Erros' },
        ]}
      />
    </section>
  )
}
