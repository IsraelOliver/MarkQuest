import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { ApiErrorState } from '../components/ApiErrorState'
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

  const selectedTemplate = useMemo(
    () => data.templates.find((template) => template.id === selectedTemplateId) ?? null,
    [data.templates, selectedTemplateId],
  )

  const availableAnswerKeys = useMemo(() => {
    if (!selectedTemplateId) return []
    return data.answerKeys.filter((item) => item.templateId === selectedTemplateId)
  }, [data.answerKeys, selectedTemplateId])

  const selectedAnswerKey = useMemo(
    () => availableAnswerKeys.find((item) => item.id === selectedAnswerKeyId) ?? null,
    [availableAnswerKeys, selectedAnswerKeyId],
  )

  const selectedUploads = useMemo(
    () => data.uploads.filter((upload) => selectedUploadIds.includes(upload.id)),
    [data.uploads, selectedUploadIds],
  )

  const latestJob = data.jobs[0] ?? null
  const hasLoadedData =
    data.uploads.length > 0 ||
    data.templates.length > 0 ||
    data.answerKeys.length > 0 ||
    data.jobs.length > 0 ||
    data.omr.length > 0 ||
    data.students.length > 0
  const loadFailedWithoutData = Boolean(error && !hasLoadedData)

  useEffect(() => {
    if (examId) {
      setSelectedExamId(examId)
    }
  }, [examId])

  const loadAll = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [uploads, templates, answerKeys, results] = await Promise.all([
        omrService.getUploads({ examId: selectedExam?.id }),
        omrService.getTemplates({ examId: selectedExam?.id }),
        omrService.getAnswerKeys({ examId: selectedExam?.id }),
        omrService.getResults({ examId: selectedExam?.id }),
      ])

      setData({
        uploads: uploads.items,
        templates: templates.items,
        answerKeys: answerKeys.items,
        jobs: [...results.jobs].reverse(),
        omr: results.omr,
        students: results.students,
      })

      setSelectedTemplateId((current) => current || templates.items[0]?.id || '')
    } catch (loadError) {
      setError(formatApiErrorMessage('Nao foi possivel carregar os resultados.', loadError))
    } finally {
      setIsLoading(false)
    }
  }, [selectedExam?.id])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  useEffect(() => {
    if (!selectedTemplateId) {
      setSelectedAnswerKeyId('')
      return
    }

    const matchingAnswerKey = availableAnswerKeys.find((item) => item.id === selectedAnswerKeyId)
    if (matchingAnswerKey) return

    setSelectedAnswerKeyId(availableAnswerKeys[0]?.id || '')
  }, [availableAnswerKeys, selectedAnswerKeyId, selectedTemplateId])

  const toggleUpload = (uploadId: string) => {
    setSelectedUploadIds((current) =>
      current.includes(uploadId) ? current.filter((item) => item !== uploadId) : [...current, uploadId],
    )
  }

  const refreshResults = async () => {
    const results = await omrService.getResults({ examId: selectedExam?.id })

    setData((current) => ({
      ...current,
      jobs: [...results.jobs].reverse(),
      omr: results.omr,
      students: results.students,
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

    if (!selectedTemplateId) {
      setError('Selecione um template antes de processar os uploads.')
      return
    }

    if (!selectedAnswerKeyId) {
      setError('Selecione um gabarito compativel com o template antes de processar os uploads.')
      return
    }

    setIsSubmitting(true)
    setMessage(null)
    setError(null)

    try {
      const response = await omrService.processUpload({
        examId: selectedExam.id,
        sheetIds: selectedUploadIds,
        templateId: selectedTemplateId,
        answerKeyId: selectedAnswerKeyId,
      })

      await refreshResults()
      setSelectedUploadIds([])
      setMessage(`Job ${response.job.id} enviado com status ${response.job.status}.`)
    } catch (submitError) {
      setError(formatApiErrorMessage('Nao foi possivel processar os uploads.', submitError))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="page-shell">
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
        subtitle="Defina exatamente o template e o gabarito ativos, selecione o lote e acompanhe o processamento com mais contexto."
      />

      <div className="inline-actions page-actions">
        <Link to={`/app/units/${unitId}/classrooms/${classroomId}/exams/${examId}`}>
          <Button variant="secondary">Voltar para a prova</Button>
        </Link>
      </div>

      <Card className="results-context-card">
        <div className="results-context-card__header">
          <div>
            <p className="results-context-card__eyebrow">Contexto ativo</p>
            <h3>{selectedExam?.name ?? 'Prova'}</h3>
          </div>
          <div className="results-context-card__stats">
            <span>{data.uploads.length} uploads</span>
            <span>{data.jobs.length} jobs</span>
            <span>{data.students.length} resultados</span>
          </div>
        </div>
        <p>
          {selectedUnit?.name ?? 'Sem unidade'} / {selectedClassroom?.name ?? 'Sem turma'} / {selectedExam?.name ?? 'Sem prova'}
        </p>
      </Card>

      {!isLoading && loadFailedWithoutData ? <ApiErrorState message={error ?? 'Nao foi possivel carregar os resultados.'} onRetry={loadAll} /> : null}

      {!loadFailedWithoutData ? <div className="results-layout">
        <div className="results-layout__main">
          <Card className="results-run-card">
            <div className="results-run-card__header">
              <div>
                <p className="results-run-card__eyebrow">Execucao atual</p>
                <h3>Escolha exatamente o contrato da leitura</h3>
              </div>
              <Button type="button" variant="secondary" onClick={() => void refreshResults()}>
                Atualizar resultados
              </Button>
            </div>

            <form className="stack-form" onSubmit={handleSubmit}>
              <label className="field">
                <span>Template ativo</span>
                <select value={selectedTemplateId} onChange={(event) => setSelectedTemplateId(event.target.value)}>
                  <option value="">Selecionar template</option>
                  {data.templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} - {template.version} - {template.totalQuestions} questoes
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Gabarito ativo</span>
                <select value={selectedAnswerKeyId} onChange={(event) => setSelectedAnswerKeyId(event.target.value)} disabled={!selectedTemplateId}>
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
              </div>

              {message ? <p className="feedback feedback--success">{message}</p> : null}
              {error ? <p className="feedback feedback--error">{error}</p> : null}
            </form>
          </Card>

          <div className="results-summary-grid">
            <Card className="results-summary-card">
              <span>Template selecionado</span>
              <strong>{selectedTemplate ? `${selectedTemplate.name} (${selectedTemplate.version})` : 'Selecione um template'}</strong>
              <p>{selectedTemplate ? `${selectedTemplate.totalQuestions} questoes e ${selectedTemplate.definition.choicesPerQuestion} alternativas base.` : 'Sem template definido para a execucao.'}</p>
            </Card>
            <Card className="results-summary-card">
              <span>Gabarito selecionado</span>
              <strong>{selectedAnswerKey ? selectedAnswerKey.version : 'Selecione um gabarito'}</strong>
              <p>{selectedAnswerKey ? `${selectedAnswerKey.answers.length} respostas vinculadas ao template ativo.` : 'Sem gabarito definido para a execucao.'}</p>
            </Card>
            <Card className="results-summary-card">
              <span>Lote atual</span>
              <strong>{selectedUploads.length ? `${selectedUploads.length} uploads selecionados` : 'Nenhum upload selecionado'}</strong>
              <p>{selectedUploads.length ? selectedUploads.map((upload) => upload.studentName).slice(0, 3).join(', ') : 'Monte o lote antes de iniciar o processamento.'}</p>
            </Card>
          </div>

          <SectionTitle title="Jobs recentes" />
          {isLoading ? <p>Carregando dados operacionais...</p> : null}
          {!isLoading && !!data.jobs.length ? (
            <Table
              data={data.jobs}
              columns={[
                { key: 'id', header: 'Job' },
                { key: 'status', header: 'Status' },
                { key: 'templateVersion', header: 'Template' },
                { key: 'answerKeyVersion', header: 'Gabarito' },
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
        </div>

        <aside className="results-layout__aside">
          <Card className="results-latest-job-card">
            <p className="results-latest-job-card__eyebrow">Ultimo processamento</p>
            <h3>{latestJob ? latestJob.id : 'Nenhum job ainda'}</h3>
            <div className="results-latest-job-card__details">
              <div>
                <span>Status</span>
                <strong>{latestJob?.status ?? '-'}</strong>
              </div>
              <div>
                <span>Template</span>
                <strong>{latestJob?.templateVersion ?? '-'}</strong>
              </div>
              <div>
                <span>Gabarito</span>
                <strong>{latestJob?.answerKeyVersion ?? '-'}</strong>
              </div>
              <div>
                <span>Arquivos</span>
                <strong>{latestJob ? latestJob.sheetIds.length : 0}</strong>
              </div>
            </div>
          </Card>
        </aside>
      </div> : null}
    </section>
  )
}
