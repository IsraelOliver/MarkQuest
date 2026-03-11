import { Card } from '../components/Card'
import { SectionTitle } from '../components/SectionTitle'
import { UploadArea } from '../components/UploadArea'
import { answerSheetsMock, examsMock } from '../data/omrMock'
import { API_ENDPOINTS } from '../services/apiClient'

export function UploadsPage() {
  return (
    <section>
      <SectionTitle
        title="Upload de cartões-resposta"
        subtitle={`Integração planejada com endpoint ${API_ENDPOINTS.uploads}.`}
      />

      <UploadArea title="Adicionar cartões para processamento" helperText="JPG, PNG ou PDF • até 100 arquivos por lote" />

      <Card>
        <h3>Exame selecionado</h3>
        <p>{examsMock[0].name}</p>
      </Card>

      <Card>
        <h3>Últimos arquivos no lote</h3>
        <ul>
          {answerSheetsMock.map((sheet) => (
            <li key={sheet.id}>
              {sheet.fileName} — {sheet.studentName}
            </li>
          ))}
        </ul>
      </Card>
    </section>
  )
}
