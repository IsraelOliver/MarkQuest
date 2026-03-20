import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { SectionTitle } from '../components/SectionTitle'
import { useAcademicScope } from '../hooks/useAcademicScope'
import { academicService } from '../services/academicService'
import { formatApiErrorMessage } from '../utils/display'
import { getSelectedUnitId, setSelectedClassroomId, setSelectedExamId, setSelectedUnitId } from '../utils/domainSelection'

export function UnitDetailPage() {
  const { unitId } = useParams()
  const { isLoading, units, classrooms, exams, students, refresh } = useAcademicScope()
  const [name, setName] = useState('Turma 3A')
  const [year, setYear] = useState('2026')
  const [editingClassroomId, setEditingClassroomId] = useState('')
  const [showClassroomForm, setShowClassroomForm] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const unit = units.find((item) => item.id === unitId)
  const unitClassrooms = useMemo(() => classrooms.filter((item) => item.unitId === unitId), [classrooms, unitId])

  const resetForm = () => {
    setName('Turma 3A')
    setYear('2026')
    setEditingClassroomId('')
    setShowClassroomForm(false)
  }

  const handleActivateUnit = () => {
    if (!unitId) return
    setSelectedUnitId(unitId)
    setSelectedClassroomId('')
    setSelectedExamId('')
  }

  const handleEdit = (classroomId: string) => {
    const classroom = unitClassrooms.find((item) => item.id === classroomId)
    if (!classroom) return

    setEditingClassroomId(classroom.id)
    setName(classroom.name)
    setYear(classroom.year)
    setShowClassroomForm(true)
    setMessage(null)
    setError(null)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!unitId) {
      setError('Unidade invalida para cadastro de turma.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    setMessage(null)

    try {
      if (editingClassroomId) {
        await academicService.updateClassroom(editingClassroomId, { unitId, name, year })
        setMessage('Turma atualizada com sucesso.')
      } else {
        await academicService.createClassroom({ unitId, name, year })
        setMessage('Turma criada com sucesso.')
      }

      resetForm()
      await refresh()
    } catch (submitError) {
      setError(formatApiErrorMessage('Nao foi possivel salvar a turma.', submitError))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (classroomId: string) => {
    setError(null)
    setMessage(null)

    try {
      await academicService.deleteClassroom(classroomId)
      if (editingClassroomId === classroomId) {
        resetForm()
      }
      await refresh()
      setMessage('Turma excluida com sucesso.')
    } catch (deleteError) {
      setError(formatApiErrorMessage('Nao foi possivel excluir a turma.', deleteError))
    }
  }

  return (
    <section>
      <Breadcrumbs
        items={[
          { label: 'Unidades', to: '/app/units' },
          { label: unit?.name ?? 'Turmas' },
        ]}
      />

      <SectionTitle
        title={unit ? unit.name : 'Unidade'}
        subtitle="Gerencie as turmas da unidade e entre em uma delas para seguir para as provas."
      />

      <div className="inline-actions page-actions">
        <Link to="/app/units">
          <Button variant="secondary">Voltar para unidades</Button>
        </Link>
        {unitId && getSelectedUnitId() !== unitId ? <Button onClick={handleActivateUnit}>Definir como unidade ativa</Button> : null}
        <Button onClick={() => setShowClassroomForm((current) => !current)}>
          {showClassroomForm ? 'Fechar criacao' : '+ Nova turma'}
        </Button>
      </div>

      <div className="detail-layout">
        <div className="detail-layout__main">
          {isLoading ? <p>Carregando turmas da unidade...</p> : null}
          {!isLoading && !unitClassrooms.length ? (
            <Card>
              <p>Nenhuma turma cadastrada nesta unidade ainda.</p>
            </Card>
          ) : null}

          <div className="entity-grid">
            {unitClassrooms.map((classroom) => {
              const classroomExams = exams.filter((item) => item.classroomId === classroom.id)
              const classroomStudents = students.filter((item) => item.classroomId === classroom.id)

              return (
                <Card key={classroom.id} className="entity-card">
                  <Link to={`/app/units/${unitId}/classrooms/${classroom.id}`} className="entity-link">
                    <p className="entity-card__eyebrow">Turma</p>
                    <h3>{classroom.name}</h3>
                    <p className="entity-card__meta">{classroom.year}</p>
                    <div className="entity-card__stats">
                      <span>{classroomExams.length} prova(s)</span>
                      <span>{classroomStudents.length} aluno(s)</span>
                    </div>
                  </Link>
                  <div className="inline-actions">
                    <Button type="button" variant="secondary" onClick={() => handleEdit(classroom.id)}>
                      Editar
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => void handleDelete(classroom.id)}>
                      Excluir
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>

        <aside className="detail-layout__aside">
          {showClassroomForm ? (
            <Card>
              <form className="stack-form" onSubmit={handleSubmit}>
                <h3>{editingClassroomId ? 'Editar turma' : 'Nova turma'}</h3>

                <label className="field">
                  <span>Nome da turma</span>
                  <input value={name} onChange={(event) => setName(event.target.value)} />
                </label>

                <label className="field">
                  <span>Ano/Periodo</span>
                  <input value={year} onChange={(event) => setYear(event.target.value)} />
                </label>

                <div className="inline-actions">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Salvando...' : editingClassroomId ? 'Salvar alteracoes' : 'Criar turma'}
                  </Button>
                  <Button type="button" variant="secondary" onClick={resetForm}>
                    Cancelar
                  </Button>
                </div>

                {message ? <p className="feedback feedback--success">{message}</p> : null}
                {error ? <p className="feedback feedback--error">{error}</p> : null}
              </form>
            </Card>
          ) : null}
        </aside>
      </div>
    </section>
  )
}
