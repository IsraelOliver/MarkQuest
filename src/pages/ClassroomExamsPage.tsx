import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiErrorState } from '../components/ApiErrorState'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { Button } from '../components/Button'
import { Cabecalho } from '../components/Cabecalho'
import { Card } from '../components/Card'
import { useAcademicScope } from '../hooks/useAcademicScope'
import { academicService } from '../services/academicService'
import { formatApiErrorMessage } from '../utils/display'
import { setSelectedExamId } from '../utils/domainSelection'
import { MAX_QUESTIONS } from '../utils/questionLimits'

export function ClassroomExamsPage() {
  const navigate = useNavigate()
  const { unitId, classroomId } = useParams()
  const { isLoading, error: scopeError, units, classrooms, exams, students, refresh } = useAcademicScope()
  const [title, setTitle] = useState('Simulado 1')
  const [subject, setSubject] = useState('Matematica')
  const [totalQuestions, setTotalQuestions] = useState('45')
  const [editingExamId, setEditingExamId] = useState('')
  const [showExamForm, setShowExamForm] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const unit = units.find((item) => item.id === unitId)
  const classroom = classrooms.find((item) => item.id === classroomId)
  const classroomStudents = students.filter((item) => item.classroomId === classroomId)
  const classroomExams = useMemo(() => exams.filter((item) => item.classroomId === classroomId), [classroomId, exams])
  const loadFailedWithoutData = Boolean(scopeError && !classroomExams.length)

  const resetForm = () => {
    setTitle('Simulado 1')
    setSubject('Matematica')
    setTotalQuestions('45')
    setEditingExamId('')
    setShowExamForm(false)
  }

  const handleEdit = (examId: string) => {
    const exam = classroomExams.find((item) => item.id === examId)
    if (!exam) return
    setEditingExamId(exam.id)
    setTitle(exam.name)
    setSubject(exam.subject)
    setTotalQuestions(String(exam.totalQuestions))
    setShowExamForm(true)
    setMessage(null)
    setError(null)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!classroomId) {
      setError('Turma inválida para cadastro de prova.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    setMessage(null)

    try {
      if (editingExamId) {
        await academicService.updateExam(editingExamId, {
          classroomId,
          title,
          subject,
          totalQuestions: Number(totalQuestions),
        })
        setMessage('Prova atualizada com sucesso.')
      } else {
        await academicService.createExam({
          classroomId,
          title,
          subject,
          totalQuestions: Number(totalQuestions),
        })
        setMessage('Prova criada com sucesso.')
      }

      resetForm()
      await refresh()
    } catch (submitError) {
      setError(formatApiErrorMessage('Não foi possível salvar a prova.', submitError))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (examId: string) => {
    setError(null)
    setMessage(null)

    try {
      await academicService.deleteExam(examId)
      if (editingExamId === examId) resetForm()
      await refresh()
      setMessage('Prova excluída com sucesso.')
    } catch (deleteError) {
      setError(formatApiErrorMessage('Não foi possível excluir a prova.', deleteError))
    }
  }

  const handleOpenExam = (examId: string) => {
    setSelectedExamId(examId)
    navigate(`/app/units/${unitId}/classrooms/${classroomId}/exams/${examId}`)
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
              { label: 'Provas' },
            ]}
          />
        }
        title="Provas"
        subtitle="Cadastre e organize as provas desta turma. O foco central desta tela é a grade de provas."
        actions={
          <>
            <Link to={`/app/units/${unitId}/classrooms/${classroomId}`}>
              <Button variant="secondary">Voltar para a turma</Button>
            </Link>
            <Button onClick={() => setShowExamForm((current) => !current)}>{showExamForm ? 'Fechar criacao' : '+ Nova prova'}</Button>
          </>
        }
      />

      {showExamForm ? (
        <Card>
          <form className="stack-form" onSubmit={handleSubmit}>
            <h3>{editingExamId ? 'Editar prova' : 'Nova prova'}</h3>

            <label className="field">
              <span>Titulo da prova</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>

            <label className="field">
              <span>Disciplina</span>
              <input value={subject} onChange={(event) => setSubject(event.target.value)} />
            </label>

            <label className="field">
              <span>Total de questões</span>
                <input value={totalQuestions} type="number" min="1" max={MAX_QUESTIONS} onChange={(event) => setTotalQuestions(event.target.value)} />
            </label>

            <div className="inline-actions">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : editingExamId ? 'Salvar alteracoes' : 'Criar prova'}
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

      {isLoading ? <p>Carregando provas da turma...</p> : null}
      {!isLoading && loadFailedWithoutData ? (
        <ApiErrorState message={scopeError ?? 'Nao foi possivel carregar as provas.'} onRetry={refresh} />
      ) : null}
      {!isLoading && !scopeError && !classroomExams.length ? (
        <Card>
          <p>Nenhuma prova cadastrada nesta turma ainda.</p>
        </Card>
      ) : null}

      <div className="entity-grid">
        {classroomExams.map((exam) => (
          <Card key={exam.id} className="entity-card">
            <button type="button" className="entity-card__action" onClick={() => handleOpenExam(exam.id)}>
              <p className="entity-card__eyebrow">Prova</p>
              <h3>{exam.name}</h3>
              <p className="entity-card__meta">{exam.subject}</p>
              <div className="entity-card__stats">
                <span>{exam.totalQuestions} questões</span>
                <span>{classroomStudents.length} aluno(s)</span>
              </div>
            </button>
            <div className="inline-actions">
              <Button type="button" variant="secondary" onClick={() => handleEdit(exam.id)}>
                Editar
              </Button>
              <Button type="button" variant="ghost" onClick={() => void handleDelete(exam.id)}>
                Excluir
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </section>
  )
}
