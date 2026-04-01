import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { Button } from '../components/Button'
import { Cabecalho } from '../components/Cabecalho'
import { Card } from '../components/Card'
import { useAcademicScope } from '../hooks/useAcademicScope'
import { omrService } from '../services/omrService'
import type { AnswerKey, AnswerSheet, ProcessingJob, StudentResult, Template } from '../types/omr'
import { createEditorStateFromTemplate } from '../utils/cardTemplatePresets'
import { setSelectedExamId } from '../utils/domainSelection'
import { formatApiErrorMessage } from '../utils/display'

function getTemplateTimestamp(template: Pick<Template, 'createdAt' | 'updatedAt'>) {
  return new Date(template.updatedAt ?? template.createdAt).getTime()
}

type OperationalState = {
  templates: Template[]
  answerKeys: AnswerKey[]
  uploads: AnswerSheet[]
  jobs: ProcessingJob[]
  studentResults: StudentResult[]
}

type ChecklistItem = {
  id: string
  title: string
  description: string
  status: 'complete' | 'pending' | 'blocked'
  actionLabel: string
  actionTo: string
}

export function ExamDetailPage() {
  const { unitId, classroomId, examId } = useParams()
  const { units, classrooms, exams, students } = useAcademicScope()
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [isLoadingFlow, setIsLoadingFlow] = useState(true)
  const [operationalData, setOperationalData] = useState<OperationalState>({
    templates: [],
    answerKeys: [],
    uploads: [],
    jobs: [],
    studentResults: [],
  })
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const unit = units.find((item) => item.id === unitId)
  const classroom = classrooms.find((item) => item.id === classroomId)
  const exam = exams.find((item) => item.id === examId)
  const classroomStudents = students.filter((student) => student.classroomId === classroom?.id)

  useEffect(() => {
    if (examId) {
      setSelectedExamId(examId)
    }
  }, [examId])

  useEffect(() => {
    if (!exam?.id) {
      setOperationalData({ templates: [], answerKeys: [], uploads: [], jobs: [], studentResults: [] })
      setIsLoadingFlow(false)
      return
    }

    const loadOperationalData = async () => {
      setIsLoadingFlow(true)

      try {
        const [templatesResponse, answerKeysResponse, uploadsResponse, resultsResponse] = await Promise.all([
          omrService.getTemplates({ examId: exam.id }),
          omrService.getAnswerKeys({ examId: exam.id }),
          omrService.getUploads({ examId: exam.id }),
          omrService.getResults({ examId: exam.id }),
        ])

        setOperationalData({
          templates: templatesResponse.items,
          answerKeys: answerKeysResponse.items,
          uploads: uploadsResponse.items,
          jobs: resultsResponse.jobs,
          studentResults: resultsResponse.students,
        })
      } catch (loadError) {
        setError(formatApiErrorMessage('Nao foi possivel carregar o fluxo operacional da prova.', loadError))
      } finally {
        setIsLoadingFlow(false)
      }
    }

    void loadOperationalData()
  }, [exam?.id])

  const latestTemplate = useMemo(() => {
    const templatesWithDefinition = operationalData.templates.filter((item) => item.definition && item.visualTheme && item.presetId)
    const templateCandidates = templatesWithDefinition.length > 0 ? templatesWithDefinition : operationalData.templates
    return [...templateCandidates].sort((left, right) => getTemplateTimestamp(right) - getTemplateTimestamp(left))[0]
  }, [operationalData.templates])

  const latestJob = operationalData.jobs[operationalData.jobs.length - 1]
  const resolvedTotalQuestions = latestTemplate?.definition.totalQuestions ?? exam?.totalQuestions ?? 0
  const hasStudents = classroomStudents.length > 0
  const hasAnswerKey = operationalData.answerKeys.length > 0
  const hasUploads = operationalData.uploads.length > 0
  const hasProcessedJob = operationalData.jobs.length > 0
  const classAverage = operationalData.studentResults.length
    ? (
        operationalData.studentResults.reduce((total, studentResult) => total + studentResult.score, 0) /
        operationalData.studentResults.length
      ).toFixed(1).replace('.', ',')
    : '--'
  const studentPerformance = classroomStudents
    .map((student) => {
      const studentName = [student.firstName, student.middleName, student.lastName].filter(Boolean).join(' ')
      const result = operationalData.studentResults.find((item) => item.studentId === student.id)
      return {
        id: student.id,
        name: studentName,
        scoreLabel: result ? `${result.score.toFixed(0)}%` : '--',
        scoreValue: result?.score ?? 0,
        statusLabel: result ? `${result.correctAnswers}/${resolvedTotalQuestions || exam?.totalQuestions || 0} acertos` : 'Aguardando leitura',
        hasResult: Boolean(result),
      }
    })
    .sort((left, right) => right.scoreValue - left.scoreValue)

  const checklistItems: ChecklistItem[] = [
    {
      id: 'students',
      title: 'Alunos cadastrados',
      description: hasStudents ? `${classroomStudents.length} aluno(s) prontos para vinculo com upload.` : 'Cadastre os alunos da turma antes de enviar cartoes.',
      status: hasStudents ? 'complete' : 'blocked',
      actionLabel: 'Gerenciar alunos',
      actionTo: `/app/units/${unitId}/classrooms/${classroomId}/students`,
    },
    {
      id: 'template',
      title: 'Template salvo',
      description: latestTemplate ? `${latestTemplate.name} - ${latestTemplate.version}.` : 'Salve um layout operacional para esta prova.',
      status: latestTemplate ? 'complete' : 'pending',
      actionLabel: latestTemplate ? 'Editar template' : 'Criar template',
      actionTo: `/app/units/${unitId}/classrooms/${classroomId}/exams/${examId}/layout`,
    },
    {
      id: 'answerKey',
      title: 'Gabarito criado',
      description: hasAnswerKey ? `${operationalData.answerKeys.length} gabarito(s) vinculado(s) aos templates da prova.` : 'Crie um gabarito depois que o template principal estiver salvo.',
      status: hasAnswerKey ? 'complete' : latestTemplate ? 'pending' : 'blocked',
      actionLabel: 'Abrir gabaritos',
      actionTo: `/app/units/${unitId}/classrooms/${classroomId}/exams/${examId}/answer-key`,
    },
    {
      id: 'uploads',
      title: 'Uploads enviados',
      description: hasUploads ? `${operationalData.uploads.length} cartao(oes) enviado(s) para a prova.` : 'Envie uploads somente depois de confirmar alunos e gabarito.',
      status: hasUploads ? 'complete' : hasStudents && hasAnswerKey ? 'pending' : 'blocked',
      actionLabel: 'Abrir uploads',
      actionTo: `/app/units/${unitId}/classrooms/${classroomId}/exams/${examId}/uploads`,
    },
    {
      id: 'results',
      title: 'Ultimo processamento executado',
      description: hasProcessedJob
        ? `Ultimo job ${latestJob?.id} com status ${latestJob?.status}.`
        : 'Execute o primeiro processamento para validar a operacao completa.',
      status: hasProcessedJob ? 'complete' : hasUploads && hasAnswerKey ? 'pending' : 'blocked',
      actionLabel: 'Abrir resultados',
      actionTo: `/app/units/${unitId}/classrooms/${classroomId}/exams/${examId}/results`,
    },
  ]

  const handleGeneratePdf = async () => {
    if (!unit || !classroom || !exam) {
      setError('Selecione unidade, turma e prova antes de gerar o PDF.')
      setMessage(null)
      return
    }

    setIsGeneratingPdf(true)
    setError(null)
    setMessage(null)

    try {
      if (!latestTemplate) {
        setError('Salve um layout do cartao-resposta antes de gerar o PDF.')
        return
      }

      const { generateTemplateLayoutPdf } = await import('../utils/templateLayoutPdf')
      const savedState = createEditorStateFromTemplate(latestTemplate)
      const { pdfBytes, fileName } = await generateTemplateLayoutPdf({
        title: latestTemplate.name,
        examId: exam.id,
        examName: savedState.definition.header.examName || exam.name,
        classroomId: classroom.id,
        classroomName: classroom.name,
        unitName: unit.name,
        templateId: latestTemplate.id,
        state: savedState,
        students: classroomStudents.map((student) => ({
          id: student.id,
          name: [student.firstName, student.middleName, student.lastName].filter(Boolean).join(' '),
          classroomName: classroom.name,
          studentCode: student.studentCode,
        })),
      })

      const pdfBuffer = new Uint8Array(pdfBytes.byteLength)
      pdfBuffer.set(pdfBytes)
      const blob = new Blob([pdfBuffer], { type: 'application/pdf' })
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = fileName
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)

      setMessage(`PDF ${fileName} gerado com sucesso.`)
    } catch (generationError) {
      setError(formatApiErrorMessage('Nao foi possivel gerar o PDF do cartao.', generationError))
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  return (
    <section className="page-shell">
      <Cabecalho
        breadcrumb={
          <Breadcrumbs
            items={[
              { label: 'Unidades', to: '/app/units' },
              { label: unit?.name ?? 'Turmas', to: `/app/units/${unitId}` },
              { label: classroom?.name ?? 'Turma', to: `/app/units/${unitId}/classrooms/${classroomId}` },
              { label: 'Provas', to: `/app/units/${unitId}/classrooms/${classroomId}/exams` },
              { label: exam?.name ?? 'Prova' },
            ]}
          />
        }
        title={exam?.name ?? 'Prova'}
        subtitle="Use esta pagina como central operacional da prova: valide o contexto, confira o checklist e siga o proximo passo recomendado."
        actions={
          <div className="exam-header-actions">
            <Link to={`/app/units/${unitId}/classrooms/${classroomId}/exams`}>
              <Button variant="secondary">Voltar para provas</Button>
            </Link>
            <div className="exam-header-actions__primary">
              <Link to={`/app/units/${unitId}/classrooms/${classroomId}/exams/${examId}/results`}>
                <Button>Abrir resultados</Button>
              </Link>
              <Button className="exam-flow-card__button" onClick={() => void handleGeneratePdf()} disabled={isGeneratingPdf || !latestTemplate}>
                {isGeneratingPdf ? 'Gerando cartões...' : 'Gerar cartões'}
              </Button>
            </div>
          </div>
        }
      />

      <div className="exam-detail-layout">
        <div className="exam-detail-layout__main">
          <Card className="exam-flow-card">
            <div className="exam-flow-card__header">
              <p className="exam-flow-card__eyebrow">Ações do teste</p>
              <span className={`exam-status-pill${isLoadingFlow ? ' exam-status-pill--loading' : ''}`}>
                {isLoadingFlow ? 'Atualizando fluxo...' : 'Fluxo monitorado'}
              </span>
            </div>

            <div className="exam-flow-card__actions">
              <div className="exam-flow-card__group">
                <Link to={`/app/units/${unitId}/classrooms/${classroomId}/exams/${examId}/layout`}>
                  <Button className="exam-flow-card__button">Editar layout do teste</Button>
                </Link>

                <Link to={`/app/units/${unitId}/classrooms/${classroomId}/exams/${examId}/answer-key`}>
                  <Button className="exam-flow-card__button" variant="secondary">
                    Gabarito do teste
                  </Button>
                </Link>

                <Link to={`/app/units/${unitId}/classrooms/${classroomId}/exams/${examId}/uploads`}>
                  <Button className="exam-flow-card__button" variant="secondary">
                    Uploads
                  </Button>
                </Link>

                <Link to={`/app/units/${unitId}/classrooms/${classroomId}/exams/${examId}/results`}>
                  <Button className="exam-flow-card__button" variant="secondary">
                    Resultados
                  </Button>
                </Link>
              </div>
            </div>
          </Card>

          <Card className="exam-performance-card">
            <div className="exam-performance-card__header">
              <div>
                <p className="exam-performance-card__eyebrow">Desempenho da turma</p>
                <h3>Notas dos alunos nesta prova</h3>
              </div>
              <span className="exam-status-pill exam-status-pill--loading">
                {operationalData.studentResults.length ? `${operationalData.studentResults.length} resultado(s)` : 'Sem resultados ainda'}
              </span>
            </div>

            {studentPerformance.length ? (
              <div className="exam-performance-list">
                {studentPerformance.map((student) => (
                  <div key={student.id} className={`exam-performance-item${student.hasResult ? '' : ' exam-performance-item--pending'}`}>
                    <div className="exam-performance-item__identity">
                      <strong>{student.name}</strong>
                      <span>{student.statusLabel}</span>
                    </div>
                    <div className="exam-performance-item__bar" aria-hidden="true">
                      <span style={{ width: `${student.scoreValue}%` }} />
                    </div>
                    <strong className="exam-performance-item__score">{student.scoreLabel}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <div className="exam-performance-empty">
                <strong>Nenhum aluno vinculado à turma ainda.</strong>
                <p>Assim que houver alunos e resultados processados, esta área passa a mostrar o desempenho individual da prova.</p>
              </div>
            )}
          </Card>

          {message ? <p className="feedback feedback--success">{message}</p> : null}
          {error ? <p className="feedback feedback--error">{error}</p> : null}
        </div>

        <aside className="exam-detail-layout__aside">
          <Card className="exam-context-card">
            <div className="exam-context-card__header">
              <div>
                <p className="exam-context-card__eyebrow">Contexto do teste</p>
                <h3>{exam?.name ?? 'Prova'}</h3>
              </div>
            </div>

            <div className="exam-context-card__grid exam-context-card__grid--compact">
              <div className="exam-context-card__item">
                <span>Questões</span>
                <strong>{resolvedTotalQuestions}</strong>
              </div>
              <div className="exam-context-card__item">
                <span>Alunos</span>
                <strong>{classroomStudents.length}</strong>
              </div>
              <div className="exam-context-card__item">
                <span>Média da classe</span>
                <strong>{classAverage}</strong>
              </div>
              <div className="exam-context-card__item">
                <span>Pontuação do teste</span>
                <strong>{resolvedTotalQuestions} pts</strong>
              </div>
            </div>
          </Card>

          <Card className="exam-checklist-card">
            <div className="exam-checklist-card__header">
              <div>
                <p className="exam-checklist-card__eyebrow">Checklist da prova</p>
                <h3>Deixe o fluxo impossível de usar errado</h3>
              </div>
              <strong className="exam-checklist-card__progress">
                {checklistItems.filter((item) => item.status === 'complete').length}/{checklistItems.length}
              </strong>
            </div>

            <div className="exam-checklist-list">
              {checklistItems.map((item) => (
                <div key={item.id} className={`exam-checklist-item exam-checklist-item--${item.status}`}>
                  <div className="exam-checklist-item__status" aria-hidden="true">
                    {item.status === 'complete' ? 'OK' : item.status === 'blocked' ? '!' : '...'}
                  </div>
                  <div className="exam-checklist-item__copy">
                    <strong>{item.title}</strong>
                    <p>{item.description}</p>
                  </div>
                  <Link to={item.actionTo} className="exam-checklist-item__link">
                    <Button variant={item.status === 'complete' ? 'secondary' : 'primary'}>{item.actionLabel}</Button>
                  </Link>
                </div>
              ))}
            </div>
          </Card>
        </aside>
      </div>
    </section>
  )
}
