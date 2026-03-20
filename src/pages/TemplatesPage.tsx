import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { SectionTitle } from '../components/SectionTitle'
import { useAcademicScope } from '../hooks/useAcademicScope'
import { omrService } from '../services/omrService'
import type { Template } from '../types/omr'
import { formatApiErrorMessage } from '../utils/display'
import { setSelectedExamId } from '../utils/domainSelection'

export function TemplatesPage() {
  const { unitId, classroomId, examId } = useParams()
  const { selectedUnit, selectedClassroom, selectedExam } = useAcademicScope()
  const [name, setName] = useState('Template ENEM A4')
  const [totalQuestions, setTotalQuestions] = useState('45')
  const [templates, setTemplates] = useState<Template[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (examId) {
      setSelectedExamId(examId)
    }
  }, [examId])

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const response = await omrService.getTemplates()
        setTemplates(response.items.filter((item) => item.examId === selectedExam?.id))
      } catch (loadError) {
        setError(formatApiErrorMessage('Nao foi possivel carregar os templates.', loadError))
      } finally {
        setIsLoading(false)
      }
    }

    void loadTemplates()
  }, [selectedExam?.id])

  useEffect(() => {
    if (selectedExam) {
      setTotalQuestions(String(selectedExam.totalQuestions))
    }
  }, [selectedExam])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedExam) {
      setError('Selecione uma prova ativa antes de criar o layout.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    setMessage(null)

    try {
      const response = await omrService.createTemplate({
        name,
        examId: selectedExam.id,
        totalQuestions: Number(totalQuestions),
      })

      setTemplates((current) => [response.item, ...current])
      setMessage(`Template ${response.item.name} criado e pronto para receber gabaritos.`)
    } catch (submitError) {
      setError(formatApiErrorMessage('Nao foi possivel criar o template.', submitError))
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
          { label: 'Layout' },
        ]}
      />

      <SectionTitle title="Modelos de cartao" subtitle="Defina os layouts que vao orientar a leitura OMR do exame atual." />

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
            <span>Nome do template</span>
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </label>

          <label className="field">
            <span>Total de questoes</span>
            <input
              type="number"
              min="1"
              value={totalQuestions}
              onChange={(event) => setTotalQuestions(event.target.value)}
            />
          </label>

          <div className="inline-actions">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Criar template'}
            </Button>
          </div>

          {message ? <p className="feedback feedback--success">{message}</p> : null}
          {error ? <p className="feedback feedback--error">{error}</p> : null}
        </form>
      </Card>

      <Card>
        <h3>Templates cadastrados</h3>
        {isLoading ? <p>Carregando templates...</p> : null}
        {!isLoading && !templates.length ? <p>Nenhum template cadastrado ainda.</p> : null}
        {!!templates.length ? (
          <ul>
            {templates.map((template) => (
              <li key={template.id}>
                {template.name} ({template.version}) - {template.totalQuestions} questoes
              </li>
            ))}
          </ul>
        ) : null}
      </Card>
    </section>
  )
}
