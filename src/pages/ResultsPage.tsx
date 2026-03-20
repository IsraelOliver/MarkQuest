import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { SectionTitle } from '../components/SectionTitle'
import { Table } from '../components/Table'
import { useAcademicScope } from '../hooks/useAcademicScope'
import { omrService } from '../services/omrService'
import type { AnswerKey, AnswerSheet, OMRResult, ProcessingJob, StudentResult, Template } from '../types/omr'
import { formatApiErrorMessage } from '../utils/display'
import { setSelectedExamId } from '../utils/domainSelection'

type ResultsState = {
  uploads: AnswerSheet[]
  templates: Template[]
  answerKeys: AnswerKey[]
  jobs: ProcessingJob[]
  omr: OMRResult[]
  students: StudentResult[]
}

export function ResultsPage() {
  const { unitId, classroomId, examId } = useParams()
  const { selectedUnit, selectedClassroom, selectedExam } = useAcademicScope()
  const [data, setData] = useState<ResultsState>({
    uploads: [],
    templates: [],
    answerKeys: [],
    jobs: [],
    omr: [],
    students: [],
  })
  const [selectedUploadIds, setSelectedUploadIds] = useState<string[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [selectedAnswerKeyId, setSelectedAnswerKeyId] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const availableAnswerKeys = useMemo(() => {
    if (!selectedTemplateId) return data.answerKeys
    return data.answerKeys.filter((item) => item.templateId === selectedTemplateId)
  }, [data.answerKeys, selectedTemplateId])

  useEffect(() => {
    if (examId) {
      setSelectedExamId(examId)
    }
  }, [examId])

  useEffect(() => {
    const loadAll = async () => {
      setIsLoading(true)
      try {
        const [uploads, templates, answerKeys, results] = await Promise.all([
          omrService.getUploads(),
          omrService.getTemplates(),
          omrService.getAnswerKeys(),
          omrService.getResults(),
        ])

        const filteredJobs = results.jobs.filter((item) => item.examId === selectedExam?.id)
        const activeJobIds = new Set(filteredJobs.map((item) => item.id))

        setData({
          uploads: uploads.items.filter((item) => item.examId === selectedExam?.id),
          templates: templates.items.filter((item) => item.examId === selectedExam?.id),
          answerKeys: answerKeys.items.filter((item) => item.examId === selectedExam?.id),
          jobs: filteredJobs,
          omr: results.omr.filter((item) => activeJobIds.has(item.jobId)),
          students: results.students.filter((item) => item.examId === selectedExam?.id),
        })

        setSelectedTemplateId((current) => current || templates.items[0]?.id || '')
        setSelectedAnswerKeyId((current) => current || answerKeys.items[0]?.id || '')
      } catch (loadError) {
        setError(formatApiErrorMessage('Nao foi possivel carregar os resultados.', loadError))
      } finally {
        setIsLoading(false)
      }
    }

    void loadAll()
  }, [selectedExam?.id])

  useEffect(() => {
    if (!selectedTemplateId) return

    const matchingAnswerKey = availableAnswerKeys.find((item) => item.id === selectedAnswerKeyId)
    if (matchingAnswerKey) return

    setSelectedAnswerKeyId(availableAnswerKeys[0]?.id || '')
  }, [availableAnswerKeys, data.answerKeys, selectedAnswerKeyId, selectedTemplateId])

  const toggleUpload = (uploadId: string) => {
    setSelectedUploadIds((current) =>
      current.includes(uploadId) ? current.filter((item) => item !== uploadId) : [...current, uploadId],
    )
  }

  const refreshResults = async () => {
    const results = await omrService.getResults()
    const filteredJobs = results.jobs.filter((item) => item.examId === selectedExam?.id)
    const activeJobIds = new Set(filteredJobs.map((item) => item.id))

    setData((current) => ({
      ...current,
      jobs: filteredJobs,
      omr: results.omr.filter((item) => activeJobIds.has(item.jobId)),
      students: results.students.filter((item) => item.examId === selectedExam?.id),
    }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedUploadIds.length) {
      setError('Selecione pelo menos um upload para processar.')
      return
    }

    if (!selectedExam) {
      setError('Selecione uma prova ativa antes de processar os uploads.')
      return
    }

    setIsSubmitting(true)
    setMessage(null)
    setError(null)

    try {
      const response = await omrService.processUpload({
        examId: selectedExam.id,
        sheetIds: selectedUploadIds,
        templateId: selectedTemplateId || undefined,
        answerKeyId: selectedAnswerKeyId || undefined,
      })

      await refreshResults()
      setSelectedUploadIds([])
      setMessage(`Job ${response.job.id} enviado com status ${response.job.status}. Atualize para acompanhar a leitura.`)
    } catch (submitError) {
      setError(formatApiErrorMessage('Nao foi possivel processar os uploads.', submitError))
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
          { label: 'Resultados' },
        ]}
      />

      <SectionTitle
        title="Resultados de leitura"
        subtitle="Selecione uploads, defina template e gabarito e acompanhe os resultados do processamento."
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
            <span>Template</span>
            <select value={selectedTemplateId} onChange={(event) => setSelectedTemplateId(event.target.value)}>
              <option value="">Selecionar template</option>
              {data.templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} - {template.totalQuestions} questoes
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Gabarito</span>
            <select value={selectedAnswerKeyId} onChange={(event) => setSelectedAnswerKeyId(event.target.value)}>
              <option value="">Selecionar gabarito</option>
              {availableAnswerKeys.map((answerKey) => (
                <option key={answerKey.id} value={answerKey.id}>
                  {answerKey.version} - {answerKey.answers.length} respostas
                </option>
              ))}
            </select>
          </label>

          <div className="field">
            <span>Uploads disponiveis</span>
            <div className="selection-list">
              {data.uploads.map((upload) => (
                <label key={upload.id} className="selection-item">
                  <input
                    type="checkbox"
                    checked={selectedUploadIds.includes(upload.id)}
                    onChange={() => toggleUpload(upload.id)}
                  />
                  <span>
                    {upload.fileName} - {upload.studentName}
                  </span>
                </label>
              ))}
              {!data.uploads.length ? <p className="muted-text">Nenhum upload disponivel para processamento.</p> : null}
            </div>
          </div>

          <div className="inline-actions">
            <Button type="submit" disabled={isSubmitting || isLoading || !data.uploads.length}>
              {isSubmitting ? 'Processando...' : 'Processar uploads'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => void refreshResults()}>
              Atualizar resultados
            </Button>
          </div>

          {message ? <p className="feedback feedback--success">{message}</p> : null}
          {error ? <p className="feedback feedback--error">{error}</p> : null}
        </form>
      </Card>

      <SectionTitle title="Jobs recentes" />
      {isLoading ? <p>Carregando dados operacionais...</p> : null}
      {!isLoading && !!data.jobs.length ? (
        <Table
          data={data.jobs}
          columns={[
            { key: 'id', header: 'Job' },
            { key: 'status', header: 'Status' },
            { key: 'createdAt', header: 'Criado em' },
            { key: 'finishedAt', header: 'Finalizado em', render: (item) => item.finishedAt ?? '-' },
          ]}
        />
      ) : null}
      {!isLoading && !data.jobs.length ? <Card><p>Nenhum job processado ainda.</p></Card> : null}

      <SectionTitle title="Resultados OMR" />
      {!!data.omr.length ? (
        <Table
          data={data.omr}
          columns={[
            { key: 'answerSheetId', header: 'Cartao' },
            { key: 'confidence', header: 'Confianca', render: (item) => `${(item.confidence * 100).toFixed(1)}%` },
            { key: 'warnings', header: 'Alertas', render: (item) => (item.warnings.length ? item.warnings.join(', ') : 'Nenhum') },
          ]}
        />
      ) : null}
      {!isLoading && !data.omr.length ? <Card><p>Nenhum resultado OMR disponivel ainda.</p></Card> : null}

      <SectionTitle title="Resultados por aluno" />
      {!!data.students.length ? (
        <Table
          data={data.students}
          columns={[
            { key: 'studentName', header: 'Aluno' },
            { key: 'score', header: 'Nota' },
            { key: 'correctAnswers', header: 'Acertos' },
            { key: 'incorrectAnswers', header: 'Erros' },
            { key: 'blankAnswers', header: 'Brancos' },
          ]}
        />
      ) : null}
      {!isLoading && !data.students.length ? <Card><p>Nenhum resultado por aluno disponivel ainda.</p></Card> : null}
    </section>
  )
}
