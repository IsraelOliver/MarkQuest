import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { SectionTitle } from '../components/SectionTitle'
import { useAcademicScope } from '../hooks/useAcademicScope'
import { setSelectedExamId } from '../utils/domainSelection'

export function ExamDetailPage() {
  const { unitId, classroomId, examId } = useParams()
  const { units, classrooms, exams } = useAcademicScope()
  const [isStatsVisible, setIsStatsVisible] = useState(false)

  const unit = units.find((item) => item.id === unitId)
  const classroom = classrooms.find((item) => item.id === classroomId)
  const exam = exams.find((item) => item.id === examId)
  const classAverage = '7,8'

  useEffect(() => {
    if (examId) {
      setSelectedExamId(examId)
    }
  }, [examId])

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
              <Button className="exam-flow-card__button">Layout do teste</Button>
            </Link>

            <Link to={`/app/units/${unitId}/classrooms/${classroomId}/exams/${examId}/answer-key`}>
              <Button className="exam-flow-card__button" variant="secondary">
                Gabarito do teste
              </Button>
            </Link>
          </div>

          <div className="exam-flow-card__summary">
            <Button
              className="exam-flow-card__button"
              variant={isStatsVisible ? 'primary' : 'ghost'}
              onClick={() => setIsStatsVisible((current) => !current)}
              type="button"
            >
              Estatisticas do teste
            </Button>

            <span className="exam-flow-card__divider" aria-hidden="true" />

            <div className="exam-flow-card__info">
              <span className="exam-flow-card__label">Media da classe</span>
              <strong className="exam-flow-card__value">{classAverage}</strong>
            </div>
          </div>
        </div>
      </Card>

      {isStatsVisible ? (
        <Card className="exam-stats-card">
          <h3>Estatisticas do teste</h3>
          <p>Conteudo em definicao.</p>
        </Card>
      ) : null}
    </section>
  )
}
