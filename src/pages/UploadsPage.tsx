import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { SectionTitle } from '../components/SectionTitle'
import { useAcademicScope } from '../hooks/useAcademicScope'
import { omrService } from '../services/omrService'
import type { AnswerSheet } from '../types/omr'
import { formatApiErrorMessage } from '../utils/display'
import { setSelectedExamId } from '../utils/domainSelection'

export function UploadsPage() {
  const { unitId, classroomId, examId } = useParams()
  const { selectedUnit, selectedClassroom, selectedExam } = useAcademicScope()
  const [studentId, setStudentId] = useState('student-001')
  const [files, setFiles] = useState<File[]>([])
  const [uploads, setUploads] = useState<AnswerSheet[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (examId) {
      setSelectedExamId(examId)
    }
  }, [examId])

  useEffect(() => {
    const loadUploads = async () => {
      try {
        const response = await omrService.getUploads()
        setUploads(response.items.filter((item) => item.examId === selectedExam?.id))
      } catch (loadError) {
        setError(formatApiErrorMessage('Nao foi possivel carregar os uploads.', loadError))
      } finally {
        setIsLoading(false)
      }
    }

    void loadUploads()
  }, [selectedExam?.id])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!files.length) {
      setError('Selecione pelo menos um arquivo para enviar.')
      return
    }

    if (!selectedExam) {
      setError('Selecione uma prova ativa antes de enviar os arquivos.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    setMessage(null)

    try {
      const response = await omrService.createUpload({
        examId: selectedExam.id,
        studentId,
        files,
      })

      setUploads((current) => [...response.items, ...current])
      setFiles([])
      setMessage(`${response.totalFiles} arquivo(s) enviado(s) com sucesso para processamento.`)
    } catch (submitError) {
      setError(formatApiErrorMessage('Nao foi possivel enviar os arquivos.', submitError))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section>
      <Breadcrumbs
        items={[
          { label: 'Unidades', to: '/app/units' },
          { label: selectedUnit?.name ?? 'Turmas', to: `/app/units/${unitId}` },
          { label: selectedClassroom?.name ?? 'Turma', to: `/app/units/${unitId}/classrooms/${classroomId}` },
          { label: 'Provas', to: `/app/units/${unitId}/classrooms/${classroomId}/exams` },
          { label: selectedExam?.name ?? 'Prova', to: `/app/units/${unitId}/classrooms/${classroomId}/exams/${examId}` },
          { label: 'Uploads' },
        ]}
      />

      <SectionTitle
        title="Upload de cartoes-resposta"
        subtitle="Envie os arquivos do lote e acompanhe imediatamente o que entrou na fila de leitura."
      />

      <div className="inline-actions page-actions">
        <Link to={`/app/units/${unitId}/classrooms/${classroomId}/exams/${examId}`}>
          <Button variant="secondary">Voltar para a prova</Button>
        </Link>
      </div>

      <Card>
        <h3>Contexto ativo</h3>
        <p>
          {selectedUnit?.name ?? 'Sem unidade'} / {selectedClassroom?.name ?? 'Sem turma'} / {selectedExam?.name ?? 'Sem prova'}
        </p>
      </Card>

      <Card>
        <form className="stack-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Exame</span>
            <input value={selectedExam?.name ?? 'Selecione uma prova em Provas'} disabled />
          </label>

          <label className="field">
            <span>Aluno</span>
            <input value={studentId} onChange={(event) => setStudentId(event.target.value)} placeholder="student-001" />
          </label>

          <label className="field">
            <span>Arquivos</span>
            <input
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
            />
          </label>

          <div className="inline-actions">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Enviando...' : 'Enviar arquivos'}
            </Button>
            <span className="muted-text">{files.length ? `${files.length} arquivo(s) selecionado(s)` : 'Nenhum arquivo selecionado'}</span>
          </div>

          {message ? <p className="feedback feedback--success">{message}</p> : null}
          {error ? <p className="feedback feedback--error">{error}</p> : null}
        </form>
      </Card>

      <Card>
        <h3>Exame selecionado</h3>
        <p>{selectedExam?.name ?? 'Nenhuma prova selecionada'}</p>
      </Card>

      <Card>
        <h3>Ultimos arquivos no lote</h3>
        {isLoading ? <p>Carregando uploads...</p> : null}
        {!isLoading && !uploads.length ? <p>Nenhum upload enviado ainda.</p> : null}
        {!!uploads.length ? (
          <ul>
            {uploads.map((sheet) => (
              <li key={sheet.id}>
                {sheet.fileName} - {sheet.studentName}
              </li>
            ))}
          </ul>
        ) : null}
      </Card>
    </section>
  )
}
