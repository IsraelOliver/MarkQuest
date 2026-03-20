import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { SectionTitle } from '../components/SectionTitle'
import { useAcademicScope } from '../hooks/useAcademicScope'
import { omrService } from '../services/omrService'
import type { AnswerKey, Template } from '../types/omr'
import { formatApiErrorMessage } from '../utils/display'
import { setSelectedExamId } from '../utils/domainSelection'

export function AnswerKeysPage() {
  const { unitId, classroomId, examId } = useParams()
  const { selectedUnit, selectedClassroom, selectedExam } = useAcademicScope()
  const [templates, setTemplates] = useState<Template[]>([])
  const [answerKeys, setAnswerKeys] = useState<AnswerKey[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [name, setName] = useState('Gabarito Oficial A')
  const [answers, setAnswers] = useState('A,C,D,B,E')
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
    const loadData = async () => {
      try {
        const [templatesResponse, answerKeysResponse] = await Promise.all([
          omrService.getTemplates(),
          omrService.getAnswerKeys(),
        ])

        const filteredTemplates = templatesResponse.items.filter((item) => item.examId === selectedExam?.id)
        const filteredAnswerKeys = answerKeysResponse.items.filter((item) => item.examId === selectedExam?.id)

        setTemplates(filteredTemplates)
        setAnswerKeys(filteredAnswerKeys)
        setSelectedTemplateId((current) => current || filteredTemplates[0]?.id || '')
      } catch (loadError) {
        setError(formatApiErrorMessage('Não foi possível carregar os gabaritos.', loadError))
      } finally {
        setIsLoading(false)
      }
    }

    void loadData()
  }, [selectedExam?.id])

  useEffect(() => {
    const selectedTemplate = templates.find((template) => template.id === selectedTemplateId)
    if (!selectedTemplate) return

    const answerCount = answers
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean).length

    if (answerCount === selectedTemplate.totalQuestions) return

    setAnswers(Array.from({ length: selectedTemplate.totalQuestions }, () => 'A').join(','))
  }, [answers, selectedTemplateId, templates])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedExam) {
      setError('Selecione uma prova ativa antes de criar o gabarito.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    setMessage(null)

    try {
      const normalizedAnswers = answers
        .split(',')
        .map((item) => item.trim().toUpperCase())
        .filter(Boolean)

      const response = await omrService.createAnswerKey({
        name,
        examId: selectedExam.id,
        templateId: selectedTemplateId,
        answers: normalizedAnswers,
      })

      setAnswerKeys((current) => [response.item, ...current])
      setMessage(`Gabarito ${response.item.version} criado e vinculado ao template selecionado.`)
    } catch (submitError) {
      setError(formatApiErrorMessage('Não foi possível criar o gabarito.', submitError))
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
          { label: 'Gabarito' },
        ]}
      />

      <SectionTitle title="Gabaritos" subtitle="Monte a sequência correta de respostas para cada template cadastrado." />

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
            <span>Nome do gabarito</span>
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </label>

          <label className="field">
            <span>Template</span>
            <select value={selectedTemplateId} onChange={(event) => setSelectedTemplateId(event.target.value)}>
              <option value="">Selecione um template</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} - {template.totalQuestions} questões
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Respostas</span>
            <textarea
              rows={4}
              value={answers}
              onChange={(event) => setAnswers(event.target.value)}
              placeholder="A,B,C,D,E"
            />
          </label>

          <div className="inline-actions">
            <Button type="submit" disabled={isSubmitting || !selectedTemplateId}>
              {isSubmitting ? 'Salvando...' : 'Criar gabarito'}
            </Button>
          </div>

          {message ? <p className="feedback feedback--success">{message}</p> : null}
          {error ? <p className="feedback feedback--error">{error}</p> : null}
        </form>
      </Card>

      <Card>
        <h3>Gabaritos cadastrados</h3>
        {isLoading ? <p>Carregando gabaritos...</p> : null}
        {!isLoading && !answerKeys.length ? <p>Nenhum gabarito cadastrado ainda.</p> : null}
        {!!answerKeys.length ? (
          <ul>
            {answerKeys.map((key) => (
              <li key={key.id}>
                {key.version} - {key.answers.length} respostas
              </li>
            ))}
          </ul>
        ) : null}
      </Card>
    </section>
  )
}
