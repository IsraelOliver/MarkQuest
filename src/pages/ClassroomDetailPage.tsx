import { Link, useParams } from 'react-router-dom'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { SectionTitle } from '../components/SectionTitle'
import { useAcademicScope } from '../hooks/useAcademicScope'
import { setSelectedClassroomId, setSelectedExamId, setSelectedUnitId } from '../utils/domainSelection'

export function ClassroomDetailPage() {
  const { unitId, classroomId } = useParams()
  const { units, classrooms, exams, students } = useAcademicScope()

  const unit = units.find((item) => item.id === unitId)
  const classroom = classrooms.find((item) => item.id === classroomId)
  const classroomExams = exams.filter((item) => item.classroomId === classroomId)
  const classroomStudents = students.filter((item) => item.classroomId === classroomId)

  const handleActivateClassroom = () => {
    if (!unitId || !classroomId) return
    setSelectedUnitId(unitId)
    setSelectedClassroomId(classroomId)
    setSelectedExamId('')
  }

  return (
    <section>
      <Breadcrumbs
        items={[
          { label: 'Unidades', to: '/app/units' },
          { label: unit?.name ?? 'Turmas', to: `/app/units/${unitId}` },
          { label: classroom?.name ?? 'Turma' },
        ]}
      />

      <SectionTitle
        title={classroom ? classroom.name : 'Turma'}
        subtitle="Entre no fluxo de provas da turma. A lista de alunos fica fixada na lateral para consulta rápida."
      />

      <div className="inline-actions page-actions">
        <Link to={`/app/units/${unitId}`}>
          <Button variant="secondary">Voltar para a unidade</Button>
        </Link>
        <Button onClick={handleActivateClassroom}>Definir turma ativa</Button>
      </div>

      <div className="detail-layout detail-layout--classroom">
        <div className="detail-layout__main">
          <div className="entity-grid entity-grid--single">
            <Link to={`/app/units/${unitId}/classrooms/${classroomId}/exams`} className="entity-link">
              <Card className="entity-card">
                <p className="entity-card__eyebrow">Turma</p>
                <h3>Provas</h3>
                <p className="entity-card__meta">Gerencie as provas e abra a prova ativa para layout, gabarito, upload e leitura.</p>
                <div className="entity-card__stats">
                  <span>{classroomExams.length} prova(s)</span>
                  <span>{classroomStudents.length} aluno(s)</span>
                </div>
              </Card>
            </Link>
          </div>
        </div>

        <aside className="detail-layout__aside">
          <Card>
            <h3>Resumo da turma</h3>
            <p>
              {unit?.name ?? 'Sem unidade'} / {classroom?.name ?? 'Sem turma'}
            </p>
            <p className="muted-text">{classroomStudents.length} aluno(s) cadastrados nesta turma.</p>
          </Card>

          <Card>
            <div className="sidebar-card__header">
              <h3>Alunos da turma</h3>
              <Link to={`/app/units/${unitId}/classrooms/${classroomId}/students`}>
                <Button type="button" variant="secondary">Editar</Button>
              </Link>
            </div>

            {classroomStudents.length ? (
              <div className="student-list">
                {classroomStudents.map((student) => (
                  <div key={student.id} className="student-list__item student-list__item--compact">
                    <strong>{[student.firstName, student.middleName, student.lastName].filter(Boolean).join(' ')}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p>Nenhum aluno cadastrado nesta turma ainda.</p>
            )}
          </Card>
        </aside>
      </div>
    </section>
  )
}
