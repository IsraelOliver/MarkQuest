import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { SectionTitle } from '../components/SectionTitle'
import { academicService } from '../services/academicService'
import { MAX_QUESTIONS } from '../utils/questionLimits'
import type { Classroom, Exam } from '../types/omr'
import { formatApiErrorMessage } from '../utils/display'
import { getSelectedClassroomId, getSelectedExamId, setSelectedExamId } from '../utils/domainSelection'

export function ExamsPage() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [exams, setExams] = useState<Exam[]>([])
  const [title, setTitle] = useState('Simulado 1')
  const [subject, setSubject] = useState('Matematica')
  const [totalQuestions, setTotalQuestions] = useState('45')
  const [selectedExamId, setSelectedExamIdState] = useState(getSelectedExamId())
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const selectedClassroomId = getSelectedClassroomId()
  const selectedClassroom = classrooms.find((item) => item.id === selectedClassroomId)
  const filteredExams = useMemo(
    () => exams.filter((item) => item.classroomId === selectedClassroomId),
    [exams, selectedClassroomId],
  )

  useEffect(() => {
    const loadData = async () => {
      try {
        const [nextClassrooms, nextExams] = await Promise.all([academicService.getClassrooms(), academicService.getExams()])
        setClassrooms(nextClassrooms)
        setExams(nextExams)

        const activeExam = nextExams.find((item) => item.id === getSelectedExamId())
        if (activeExam) {
          setSelectedExamIdState(activeExam.id)
        }
      } catch (loadError) {
        setError(formatApiErrorMessage('Não foi possível carregar as provas.', loadError))
      } finally {
        setIsLoading(false)
      }
    }

    void loadData()
  }, [])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedClassroomId) {
      setError('Selecione uma turma antes de criar a prova.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    setMessage(null)

    try {
      const exam = await academicService.createExam({
        classroomId: selectedClassroomId,
        title,
        subject,
        totalQuestions: Number(totalQuestions),
      })

      setExams((current) => [exam, ...current])
      setSelectedExamId(exam.id)
      setSelectedExamIdState(exam.id)
      setMessage(`Prova ${exam.name} criada e definida como prova ativa do fluxo.`)
    } catch (submitError) {
      setError(formatApiErrorMessage('Não foi possível criar a prova.', submitError))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSelect = (examId: string) => {
    setSelectedExamId(examId)
    setSelectedExamIdState(examId)
    setMessage('Prova ativa atualizada. Os módulos de layout, gabarito, upload e leitura usarão esta prova.')
  }

  return (
    <section>
      <SectionTitle title="Provas" subtitle="Crie as provas dentro da turma ativa e escolha qual delas será usada no fluxo OMR." />

      <Card>
        <h3>Turma ativa</h3>
        <p>{selectedClassroom ? `${selectedClassroom.name} - ${selectedClassroom.year}` : 'Selecione uma turma antes de continuar.'}</p>
      </Card>

      <Card>
        <form className="stack-form" onSubmit={handleSubmit}>
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
            <Button type="submit" disabled={isSubmitting || !selectedClassroomId}>
              {isSubmitting ? 'Salvando...' : 'Criar prova'}
            </Button>
          </div>

          {message ? <p className="feedback feedback--success">{message}</p> : null}
          {error ? <p className="feedback feedback--error">{error}</p> : null}
        </form>
      </Card>

      <Card>
        <h3>Provas da turma</h3>
        {isLoading ? <p>Carregando provas...</p> : null}
        {!isLoading && !filteredExams.length ? <p>Nenhuma prova cadastrada para esta turma.</p> : null}
        {!!filteredExams.length ? (
          <div className="selection-list">
            {filteredExams.map((exam) => (
              <label key={exam.id} className="selection-item">
                <input type="radio" name="selected-exam" checked={selectedExamId === exam.id} onChange={() => handleSelect(exam.id)} />
                <span>
                  {exam.name} - {exam.subject} - {exam.totalQuestions} questões
                </span>
              </label>
            ))}
          </div>
        ) : null}
      </Card>
    </section>
  )
}
