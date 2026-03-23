import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { SectionTitle } from '../components/SectionTitle'
import { useAcademicScope } from '../hooks/useAcademicScope'
import { omrService } from '../services/omrService'
import type { Template } from '../types/omr'
import { createEditorStateFromTemplate } from '../utils/cardTemplatePresets'
import { setSelectedExamId } from '../utils/domainSelection'
import { formatApiErrorMessage } from '../utils/display'

function getTemplateTimestamp(template: Pick<Template, 'createdAt' | 'updatedAt'>) {
  return new Date(template.updatedAt ?? template.createdAt).getTime()
}

export function ExamDetailPage() {
  const { unitId, classroomId, examId } = useParams()
  const { units, classrooms, exams, students } = useAcademicScope()
  const [isStatsVisible, setIsStatsVisible] = useState(false)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const unit = units.find((item) => item.id === unitId)
  const classroom = classrooms.find((item) => item.id === classroomId)
  const exam = exams.find((item) => item.id === examId)
  const classAverage = '7,8'

  useEffect(() => {
    if (examId) {
      setSelectedExamId(examId)
    }
  }, [examId])

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
      const response = await omrService.getTemplates()
      const examTemplates = response.items.filter((item) => item.examId === exam.id)
      const templatesWithDefinition = examTemplates.filter((item) => item.definition && item.visualTheme && item.presetId)
      const templateCandidates = templatesWithDefinition.length > 0 ? templatesWithDefinition : examTemplates
      const latestTemplate = [...templateCandidates].sort((left, right) => getTemplateTimestamp(right) - getTemplateTimestamp(left))[0]

      if (!latestTemplate) {
        setError('Salve um layout do cartão-resposta antes de gerar o PDF.')
        return
      }

      const { generateTemplateLayoutPdf } = await import('../utils/templateLayoutPdf')
      const savedState = createEditorStateFromTemplate(latestTemplate)
      const classroomStudents = students.filter((student) => student.classroomId === classroom.id)
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
      setError(formatApiErrorMessage('Não foi possível gerar o PDF do cartão.', generationError))
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  return (
    <section>
      <Breadcrumbs
        items={[
          { label: 'Unidades', to: '/app/units' },
          { label: unit?.name ?? 'Turmas', to: `/app/units/${unitId}` },
          { label: classroom?.name ?? 'Turma', to: `/app/units/${unitId}/classrooms/${classroomId}` },
          { label: 'Provas', to: `/app/units/${unitId}/classrooms/${classroomId}/exams` },
          { label: exam?.name ?? 'Prova' },
        ]}
      />

      <SectionTitle
        title={exam?.name ?? 'Prova'}
        subtitle="Entre no fluxo de provas da turma. A lista de alunos fica fixada na lateral para consulta rápida."
      />

      <div className="inline-actions page-actions">
        <Link to={`/app/units/${unitId}/classrooms/${classroomId}/exams`}>
          <Button variant="secondary">Voltar para provas</Button>
        </Link>
      </div>

      <Card className="exam-flow-card">
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

            <Button className="exam-flow-card__button" onClick={() => void handleGeneratePdf()} disabled={isGeneratingPdf}>
              {isGeneratingPdf ? 'Gerando PDF...' : 'Gerar PDF'}
            </Button>
          </div>

          <div className="exam-flow-card__summary">
            <Button
              className="exam-flow-card__button"
              variant={isStatsVisible ? 'primary' : 'ghost'}
              onClick={() => setIsStatsVisible((current) => !current)}
              type="button"
            >
              Estatísticas do teste
            </Button>

            <span className="exam-flow-card__divider" aria-hidden="true" />

            <div className="exam-flow-card__info">
              <span className="exam-flow-card__label">Média da classe</span>
              <strong className="exam-flow-card__value">{classAverage}</strong>
            </div>
          </div>
        </div>
      </Card>

      {message ? <p className="feedback feedback--success">{message}</p> : null}
      {error ? <p className="feedback feedback--error">{error}</p> : null}

      {isStatsVisible ? (
        <Card className="exam-stats-card">
          <h3>Estatísticas do teste</h3>
          <p>Conteúdo em definição.</p>
        </Card>
      ) : null}
    </section>
  )
}
