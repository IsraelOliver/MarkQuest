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

const mathDiagnosticStatusLabels = {
  match: 'Corresponde',
  mismatch: 'Divergente',
  blank: 'Em branco',
  ambiguous: 'Ambigua',
  missingAnswerKey: 'Sem gabarito',
} as const

const mathGeometrySourceLabels = {
  operationalCellGrid: 'Malha operacional',
  persistedOperationalGeometry: 'Geometria persistida',
  derivedRuntimeGeometry: 'Geometria derivada',
  fallbackDiagnosticGeometry: 'Fallback diagnostico',
} as const

const uploadReportStatusLabels = {
  processed: 'Processado',
  failed: 'Falhou',
} as const

type ResultsBadgeTone = 'success' | 'warning' | 'critical' | 'neutral' | 'info'

type ResultsBadge = {
  label: string
  tone: ResultsBadgeTone
}

function formatTechnicalValue(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined || value === '') return 'Nao informado'
  if (typeof value === 'boolean') return value ? 'Sim' : 'Nao'
  return String(value)
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined) return 'Nao informado'
  return `${(value * 100).toFixed(1)}%`
}

function toTextArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item : item === null || item === undefined ? '' : String(item)))
      .filter(Boolean)
  }

  if (typeof value === 'string') {
    return value ? [value] : []
  }

  if (value === null || value === undefined) {
    return []
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return [String(value)]
  }

  return []
}

function toNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return []

  return value
    .map((item) => {
      if (typeof item === 'number' && Number.isFinite(item)) return item
      if (typeof item === 'string') {
        const parsed = Number(item)
        return Number.isFinite(parsed) ? parsed : null
      }

      return null
    })
    .filter((item): item is number => item !== null)
}

function formatTechnicalError(error: unknown) {
  if (!error) return 'Nenhum erro tecnico.'
  if (typeof error === 'string') return error
  if (typeof error === 'object') {
    const record = error as { name?: unknown; message?: unknown }
    const name = typeof record.name === 'string' ? record.name : null
    const message = typeof record.message === 'string' ? record.message : null

    if (name && message) return `${name}: ${message}`
    if (message) return message
    if (name) return name
  }

  return 'Erro tecnico nao detalhado.'
}

function getUploadReportStatusBadge(status: keyof typeof uploadReportStatusLabels): ResultsBadge {
  return {
    label: uploadReportStatusLabels[status],
    tone: status === 'processed' ? 'success' : 'critical',
  }
}

function getConfidenceBadge(confidenceAverage: number | undefined): ResultsBadge {
  if (confidenceAverage === undefined) {
    return { label: 'Confianca nao informada', tone: 'info' }
  }

  if (confidenceAverage >= 0.8) {
    return { label: `Confianca ${formatPercent(confidenceAverage)}`, tone: 'success' }
  }

  if (confidenceAverage >= 0.68) {
    return { label: `Confianca ${formatPercent(confidenceAverage)}`, tone: 'warning' }
  }

  return { label: `Confianca ${formatPercent(confidenceAverage)}`, tone: 'critical' }
}

function getBlankQuestionsBadge(blankQuestionsCount: number | undefined): ResultsBadge {
  if (!blankQuestionsCount) {
    return { label: 'Sem brancos', tone: 'success' }
  }

  return {
    label: `${blankQuestionsCount} em branco`,
    tone: blankQuestionsCount >= 3 ? 'warning' : 'info',
  }
}

function getMultipleMarkedBadge(multipleMarkedQuestionsCount: number | undefined): ResultsBadge {
  if (!multipleMarkedQuestionsCount) {
    return { label: 'Sem multiplas marcacoes', tone: 'success' }
  }

  return {
    label: `${multipleMarkedQuestionsCount} multiplas marcacoes`,
    tone: 'critical',
  }
}

function getLowConfidenceBadge(lowConfidenceWarning: string | null | undefined): ResultsBadge {
  if (lowConfidenceWarning) {
    return { label: 'Baixa confianca', tone: 'critical' }
  }

  return { label: 'Sem baixa confianca', tone: 'success' }
}

function getWarningBadge(hasWarnings: boolean): ResultsBadge {
  return hasWarnings
    ? { label: 'Warnings presentes', tone: 'warning' }
    : { label: 'Sem warnings', tone: 'success' }
}

function getTechnicalErrorBadge(hasError: boolean): ResultsBadge {
  return hasError
    ? { label: 'Erro tecnico', tone: 'critical' }
    : { label: 'Sem erro tecnico', tone: 'success' }
}

function getMathDiagnosticStatusBadge(status: keyof typeof mathDiagnosticStatusLabels): ResultsBadge {
  if (status === 'match') return { label: mathDiagnosticStatusLabels[status], tone: 'success' }
  if (status === 'blank' || status === 'missingAnswerKey') {
    return { label: mathDiagnosticStatusLabels[status], tone: 'warning' }
  }

  return { label: mathDiagnosticStatusLabels[status], tone: 'critical' }
}

function getMathConfidenceBadge(confidence: number): ResultsBadge {
  if (confidence >= 0.8) return { label: `Confianca ${formatPercent(confidence)}`, tone: 'success' }
  if (confidence >= 0.68) return { label: `Confianca ${formatPercent(confidence)}`, tone: 'warning' }
  return { label: `Confianca ${formatPercent(confidence)}`, tone: 'critical' }
}

function getMathBlankColumnsBadge(blankColumnsCount: number): ResultsBadge {
  if (!blankColumnsCount) return { label: 'Sem colunas em branco', tone: 'success' }
  return {
    label: `${blankColumnsCount} coluna(s) em branco`,
    tone: 'warning',
  }
}

function getMathMultipleMarkedColumnsBadge(multipleMarkedColumnsCount: number): ResultsBadge {
  if (!multipleMarkedColumnsCount) return { label: 'Sem ambiguidade', tone: 'success' }
  return {
    label: `${multipleMarkedColumnsCount} coluna(s) ambiguas`,
    tone: 'critical',
  }
}

function summarizeWarnings(warnings: string[]) {
  if (!warnings.length) {
    return {
      summary: 'Nenhum',
      details: warnings,
    }
  }

  const blankWarnings = warnings.filter((warning) => /em branco|blank/i.test(warning))
  const otherWarningsCount = warnings.length - blankWarnings.length

  if (blankWarnings.length && otherWarningsCount === 0) {
    return {
      summary: `${blankWarnings.length} questoes em branco`,
      details: warnings,
    }
  }

  if (blankWarnings.length && otherWarningsCount > 0) {
    return {
      summary: `${blankWarnings.length} questoes em branco e ${otherWarningsCount} outro(s) alerta(s)`,
      details: warnings,
    }
  }

  if (warnings.length === 1) {
    return {
      summary: warnings[0],
      details: warnings,
    }
  }

  return {
    summary: `${warnings.length} alertas tecnicos`,
    details: warnings,
  }
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
  const [showAllTechnicalReports, setShowAllTechnicalReports] = useState(false)
  const [showAllMathDiagnostics, setShowAllMathDiagnostics] = useState(false)
  const [expandedOmrWarnings, setExpandedOmrWarnings] = useState<Record<string, boolean>>({})

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
  const uploadReportEntries = useMemo(
    () =>
      data.jobs.flatMap((job) =>
        (job.uploadReports ?? []).map((report) => ({
          jobId: job.id,
          report,
        })),
      ),
    [data.jobs],
  )
  const mathDiagnosticEntries = useMemo(
    () =>
      data.jobs.flatMap((job) =>
        (job.uploadReports ?? []).flatMap((report) =>
          (report.mathReadReports ?? []).map((mathReport) => ({
            jobId: job.id,
            uploadId: report.uploadId,
            fileName: report.fileName,
            report: mathReport,
          })),
        ),
      ),
    [data.jobs],
  )
  const visibleUploadReportEntries = useMemo(
    () => (showAllTechnicalReports ? uploadReportEntries : uploadReportEntries.slice(0, 2)),
    [showAllTechnicalReports, uploadReportEntries],
  )
  const visibleMathDiagnosticEntries = useMemo(
    () => (showAllMathDiagnostics ? mathDiagnosticEntries : mathDiagnosticEntries.slice(0, 1)),
    [mathDiagnosticEntries, showAllMathDiagnostics],
  )
  const hiddenUploadReportCount = Math.max(uploadReportEntries.length - visibleUploadReportEntries.length, 0)
  const hiddenMathDiagnosticCount = Math.max(mathDiagnosticEntries.length - visibleMathDiagnosticEntries.length, 0)
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

  const toggleOmrWarnings = (answerSheetId: string) => {
    setExpandedOmrWarnings((current) => ({
      ...current,
      [answerSheetId]: !current[answerSheetId],
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
          <Card className="results-guidance-card">
            <p className="results-guidance-card__eyebrow">Teste fisico controlado</p>
            <p>
              Para validar fisicamente: imprima 1 cartao, marque algumas questoes objetivas e a questao 33 tipo B,
              escaneie em boa qualidade e processe o arquivo. Confira confianca, warnings, paginas rasterizadas e o
              diagnostico tipo B antes de confiar na nota. A leitura tipo B ainda e apenas diagnostica e nao altera a
              nota final.
            </p>
          </Card>

          <div className="results-top-grid">
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
          </div>

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

          <SectionTitle
            title="Painel tecnico do processamento"
            subtitle="Resumo do uploadReport para validar rasterizacao, confianca e ajustes aplicados em cada arquivo."
          />
          {!isLoading && !uploadReportEntries.length ? (
            <Card className="results-technical-empty">
              <p>Nenhum uploadReport tecnico disponivel neste momento.</p>
            </Card>
          ) : null}
          {!!uploadReportEntries.length ? (
            <div className="results-technical-list">
              {visibleUploadReportEntries.map(({ jobId, report }) => {
                const rasterizedPagesLabel = report.rasterizedPages?.length
                  ? report.rasterizedPages.map((page) => page.pageNumber).join(', ')
                  : 'Nao informado'
                const technicalWarnings = toTextArray(report.warning)
                const lowConfidenceWarnings = toTextArray(report.lowConfidenceWarning)
                const reportErrorMessage = formatTechnicalError(report.error)
                const technicalBadges = [
                  getUploadReportStatusBadge(report.status),
                  getConfidenceBadge(report.confidenceAverage),
                  getLowConfidenceBadge(report.lowConfidenceWarning),
                  getBlankQuestionsBadge(report.blankQuestionsCount),
                  getMultipleMarkedBadge(report.multipleMarkedQuestionsCount),
                  getWarningBadge(technicalWarnings.length > 0 || lowConfidenceWarnings.length > 0),
                  getTechnicalErrorBadge(Boolean(report.error)),
                ]

                return (
                  <Card key={`${jobId}-${report.uploadId}`} className="results-technical-card">
                    <div className="results-technical-card__header">
                      <div>
                        <p className="results-technical-card__eyebrow">Job {jobId}</p>
                        <h3>{report.fileName}</h3>
                      </div>
                      <span className={`results-technical-card__status results-technical-card__status--${report.status}`}>
                        {uploadReportStatusLabels[report.status]}
                      </span>
                    </div>

                    <div className="results-technical-card__badges">
                      {technicalBadges.map((badge) => (
                        <span
                          key={`${jobId}-${report.uploadId}-${badge.label}`}
                          className={`results-badge results-badge--${badge.tone}`}
                        >
                          {badge.label}
                        </span>
                      ))}
                    </div>

                    <div className="results-technical-card__grid">
                      <div>
                        <span>Tipo original</span>
                        <strong>{formatTechnicalValue(report.originalMimeType ?? report.mimeType)}</strong>
                      </div>
                      <div>
                        <span>Tipo processado</span>
                        <strong>{formatTechnicalValue(report.processedMimeType)}</strong>
                      </div>
                      <div>
                        <span>Era PDF</span>
                        <strong>{formatTechnicalValue(report.originalFileWasPdf)}</strong>
                      </div>
                      <div>
                        <span>Total de paginas do PDF</span>
                        <strong>{formatTechnicalValue(report.pdfPageCount)}</strong>
                      </div>
                      <div>
                        <span>Paginas rasterizadas</span>
                        <strong>{rasterizedPagesLabel}</strong>
                      </div>
                      <div>
                        <span>DPI de rasterizacao</span>
                        <strong>{formatTechnicalValue(report.rasterizationDpi)}</strong>
                      </div>
                      <div>
                        <span>Largura x altura</span>
                        <strong>{report.width && report.height ? `${report.width} x ${report.height}` : 'Nao informado'}</strong>
                      </div>
                      <div>
                        <span>Rotacao automatica</span>
                        <strong>{formatTechnicalValue(report.autoRotationAngle)}</strong>
                      </div>
                      <div>
                        <span>Confianca media</span>
                        <strong>{report.confidenceAverage !== undefined ? `${(report.confidenceAverage * 100).toFixed(1)}%` : 'Nao informado'}</strong>
                      </div>
                      <div>
                        <span>Baixa confianca</span>
                        <strong>{report.lowConfidenceWarning ? 'Sim' : 'Nao'}</strong>
                      </div>
                      <div>
                        <span>Questoes em branco</span>
                        <strong>{formatTechnicalValue(report.blankQuestionsCount)}</strong>
                      </div>
                      <div>
                        <span>Multiplas marcacoes</span>
                        <strong>{formatTechnicalValue(report.multipleMarkedQuestionsCount)}</strong>
                      </div>
                      <div>
                        <span>Crop aplicado</span>
                        <strong>{formatTechnicalValue(report.cropApplied)}</strong>
                      </div>
                      <div>
                        <span>Fallback de crop</span>
                        <strong>{formatTechnicalValue(report.cropFallbackUsed)}</strong>
                      </div>
                      <div>
                        <span>Deslocamento medio</span>
                        <strong>{formatTechnicalValue(report.displacementAverage)}</strong>
                      </div>
                      <div>
                        <span>Maior deslocamento</span>
                        <strong>{formatTechnicalValue(report.maxDisplacementDetected)}</strong>
                      </div>
                      <div>
                        <span>Correcao espacial</span>
                        <strong>{formatTechnicalValue(report.spatialCorrectionApplied)}</strong>
                      </div>
                    </div>

                    <div className="results-technical-card__details">
                      <div>
                        <span>Aviso de baixa confianca</span>
                        <p>{lowConfidenceWarnings.length ? lowConfidenceWarnings.join(' | ') : 'Nao informado'}</p>
                      </div>
                      <div>
                        <span>Aviso tecnico</span>
                        <p>{technicalWarnings.length ? technicalWarnings.join(' | ') : 'Nenhum'}</p>
                      </div>
                      <div>
                        <span>Erro tecnico</span>
                        <p>{reportErrorMessage}</p>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          ) : null}
          {uploadReportEntries.length > 2 ? (
            <div className="results-expand-actions">
              <button
                type="button"
                className="results-expand-button"
                onClick={() => setShowAllTechnicalReports((current) => !current)}
              >
                {showAllTechnicalReports
                  ? 'Ocultar jobs anteriores'
                  : `Ver jobs anteriores (${hiddenUploadReportCount})`}
              </button>
            </div>
          ) : null}

          <SectionTitle
            title="Diagnostico tipo B"
            subtitle="Leitura tecnica das questoes matematicas, sem alterar nota nem o resultado final."
          />
          {!isLoading && !mathDiagnosticEntries.length ? (
            <Card className="results-math-diagnostic-empty">
              <p>Nenhum diagnostico tipo B disponivel neste momento.</p>
            </Card>
          ) : null}
          {!!mathDiagnosticEntries.length ? (
            <div className="results-math-diagnostic-list">
              {visibleMathDiagnosticEntries.map((entry) => {
                const statusLabel = mathDiagnosticStatusLabels[entry.report.diagnosticStatus]
                const geometryLabel = mathGeometrySourceLabels[entry.report.geometrySource]
                const blankColumns = toNumberArray(entry.report.blankColumns)
                const multipleMarkedColumns = toNumberArray(entry.report.multipleMarkedColumns)
                const blankColumnsLabel = blankColumns.length ? blankColumns.join(', ') : 'Nenhuma'
                const multipleColumnsLabel = multipleMarkedColumns.length
                  ? multipleMarkedColumns.join(', ')
                  : 'Nenhuma'
                const warnings = [...toTextArray(entry.report.diagnosticWarnings), ...toTextArray(entry.report.warnings)]
                const reportErrorMessage = formatTechnicalError(entry.report.error)
                const diagnosticBadges = [
                  getMathDiagnosticStatusBadge(entry.report.diagnosticStatus),
                  getMathConfidenceBadge(entry.report.confidence),
                  getMathBlankColumnsBadge(blankColumns.length),
                  getMathMultipleMarkedColumnsBadge(multipleMarkedColumns.length),
                  getWarningBadge(warnings.length > 0),
                  getTechnicalErrorBadge(Boolean(entry.report.error)),
                ]

                return (
                  <Card
                    key={`${entry.jobId}-${entry.uploadId}-${entry.report.questionNumber}-${entry.report.pageNumber}`}
                    className="results-math-diagnostic-card"
                  >
                    <div className="results-math-diagnostic-card__header">
                      <div>
                        <p className="results-math-diagnostic-card__eyebrow">
                          Job {entry.jobId} · Upload {entry.fileName}
                        </p>
                        <h3>Questao {entry.report.questionNumber} · Pagina {entry.report.pageNumber}</h3>
                      </div>
                      <span
                        className={`results-math-diagnostic-card__status results-math-diagnostic-card__status--${entry.report.diagnosticStatus}`}
                      >
                        {statusLabel}
                      </span>
                    </div>

                    <div className="results-math-diagnostic-card__badges">
                      {diagnosticBadges.map((badge) => (
                        <span
                          key={`${entry.jobId}-${entry.uploadId}-${entry.report.questionNumber}-${badge.label}`}
                          className={`results-badge results-badge--${badge.tone}`}
                        >
                          {badge.label}
                        </span>
                      ))}
                    </div>

                    <div className="results-math-diagnostic-card__grid">
                      <div>
                        <span>Lida</span>
                        <strong>{entry.report.detectedAnswer || '—'}</strong>
                      </div>
                      <div>
                        <span>Esperada</span>
                        <strong>{entry.report.expectedAnswer || '—'}</strong>
                      </div>
                      <div>
                        <span>Status</span>
                        <strong>{statusLabel}</strong>
                      </div>
                      <div>
                        <span>Match</span>
                        <strong>{entry.report.diagnosticMatch === null ? 'Nao comparado' : entry.report.diagnosticMatch ? 'Sim' : 'Nao'}</strong>
                      </div>
                      <div>
                        <span>Confianca</span>
                        <strong>{(entry.report.confidence * 100).toFixed(1)}%</strong>
                      </div>
                      <div>
                        <span>Geometria</span>
                        <strong>{geometryLabel}</strong>
                      </div>
                      <div>
                        <span>Colunas em branco</span>
                        <strong>{blankColumnsLabel}</strong>
                      </div>
                      <div>
                        <span>Multiplas marcacoes</span>
                        <strong>{multipleColumnsLabel}</strong>
                      </div>
                    </div>

                    <div className="results-math-diagnostic-card__details">
                      <div>
                        <span>Avisos</span>
                        <p>{warnings.length ? warnings.join(' | ') : 'Nenhum'}</p>
                      </div>
                      <div>
                        <span>Erro tecnico</span>
                        <p>{reportErrorMessage}</p>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          ) : null}
          {mathDiagnosticEntries.length > 1 ? (
            <div className="results-expand-actions">
              <button
                type="button"
                className="results-expand-button"
                onClick={() => setShowAllMathDiagnostics((current) => !current)}
              >
                {showAllMathDiagnostics
                  ? 'Ocultar historico tipo B'
                  : `Ver historico tipo B (${hiddenMathDiagnosticCount})`}
              </button>
            </div>
          ) : null}

          <SectionTitle title="Resultados OMR" />
          {!!data.omr.length ? (
            <Table
              data={data.omr}
              columns={[
                { key: 'answerSheetId', header: 'Cartao' },
                { key: 'confidence', header: 'Confianca', render: (item) => `${(item.confidence * 100).toFixed(1)}%` },
                {
                  key: 'warnings',
                  header: 'Alertas',
                  render: (item) => {
                    const warnings = toTextArray(item.warnings)
                    const warningSummary = summarizeWarnings(warnings)
                    const isExpanded = Boolean(expandedOmrWarnings[item.answerSheetId])

                    if (!warnings.length) {
                      return 'Nenhum'
                    }

                    return (
                      <div className="results-warning-summary">
                        <span>{warningSummary.summary}</span>
                        <button
                          type="button"
                          className="results-inline-button"
                          onClick={() => toggleOmrWarnings(item.answerSheetId)}
                        >
                          {isExpanded ? 'Ocultar detalhes' : 'Ver detalhes'}
                        </button>
                        {isExpanded ? (
                          <div className="results-warning-summary__details">
                            {warningSummary.details.map((warning, index) => (
                              <p key={`${item.answerSheetId}-${index}`}>{warning}</p>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    )
                  },
                },
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
      </div> : null}
    </section>
  )
}
