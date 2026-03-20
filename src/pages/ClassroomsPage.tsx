import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { SectionTitle } from '../components/SectionTitle'
import { academicService } from '../services/academicService'
import type { Classroom, Unit } from '../types/omr'
import { formatApiErrorMessage } from '../utils/display'
import { getSelectedClassroomId, getSelectedUnitId, setSelectedClassroomId, setSelectedExamId } from '../utils/domainSelection'

export function ClassroomsPage() {
  const [units, setUnits] = useState<Unit[]>([])
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [name, setName] = useState('Turma 3A')
  const [year, setYear] = useState('2026')
  const [selectedClassroomId, setSelectedClassroomIdState] = useState(getSelectedClassroomId())
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const selectedUnitId = getSelectedUnitId()
  const selectedUnit = units.find((item) => item.id === selectedUnitId)
  const filteredClassrooms = useMemo(
    () => classrooms.filter((item) => item.unitId === selectedUnitId),
    [classrooms, selectedUnitId],
  )

  useEffect(() => {
    const loadData = async () => {
      try {
        const [nextUnits, nextClassrooms] = await Promise.all([academicService.getUnits(), academicService.getClassrooms()])
        setUnits(nextUnits)
        setClassrooms(nextClassrooms)

        const activeClassroom = nextClassrooms.find((item) => item.id === getSelectedClassroomId())
        if (activeClassroom) {
          setSelectedClassroomIdState(activeClassroom.id)
        }
      } catch (loadError) {
        setError(formatApiErrorMessage('Não foi possível carregar as turmas.', loadError))
      } finally {
        setIsLoading(false)
      }
    }

    void loadData()
  }, [])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedUnitId) {
      setError('Selecione uma unidade antes de criar a turma.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    setMessage(null)

    try {
      const classroom = await academicService.createClassroom({ unitId: selectedUnitId, name, year })
      setClassrooms((current) => [classroom, ...current])
      setSelectedClassroomId(classroom.id)
      setSelectedClassroomIdState(classroom.id)
      setSelectedExamId('')
      setMessage(`Turma ${classroom.name} criada para a unidade ${selectedUnit?.name ?? ''}.`)
    } catch (submitError) {
      setError(formatApiErrorMessage('Não foi possível criar a turma.', submitError))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSelect = (classroomId: string) => {
    setSelectedClassroomId(classroomId)
    setSelectedClassroomIdState(classroomId)
    setSelectedExamId('')
    setMessage('Turma ativa atualizada. Agora voce pode criar ou selecionar uma prova.')
  }

  return (
    <section>
      <SectionTitle title="Turmas" subtitle="Organize as turmas dentro da unidade ativa e escolha o contexto de trabalho." />

      <Card>
        <h3>Unidade ativa</h3>
        <p>{selectedUnit?.name ?? 'Selecione uma unidade antes de continuar.'}</p>
      </Card>

      <Card>
        <form className="stack-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Nome da turma</span>
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </label>

          <label className="field">
            <span>Ano/Periodo</span>
            <input value={year} onChange={(event) => setYear(event.target.value)} />
          </label>

          <div className="inline-actions">
            <Button type="submit" disabled={isSubmitting || !selectedUnitId}>
              {isSubmitting ? 'Salvando...' : 'Criar turma'}
            </Button>
          </div>

          {message ? <p className="feedback feedback--success">{message}</p> : null}
          {error ? <p className="feedback feedback--error">{error}</p> : null}
        </form>
      </Card>

      <Card>
        <h3>Turmas da unidade</h3>
        {isLoading ? <p>Carregando turmas...</p> : null}
        {!isLoading && !filteredClassrooms.length ? <p>Nenhuma turma cadastrada para esta unidade.</p> : null}
        {!!filteredClassrooms.length ? (
          <div className="selection-list">
            {filteredClassrooms.map((classroom) => (
              <label key={classroom.id} className="selection-item">
                <input
                  type="radio"
                  name="selected-classroom"
                  checked={selectedClassroomId === classroom.id}
                  onChange={() => handleSelect(classroom.id)}
                />
                <span>
                  {classroom.name} - {classroom.year}
                </span>
              </label>
            ))}
          </div>
        ) : null}
      </Card>
    </section>
  )
}
