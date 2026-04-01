import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { Button } from '../components/Button'
import { Cabecalho } from '../components/Cabecalho'
import { Card } from '../components/Card'
import { academicService } from '../services/academicService'
import type { Classroom, Unit, UnitKind } from '../types/omr'
import { formatApiErrorMessage } from '../utils/display'
import { setSelectedClassroomId, setSelectedExamId, setSelectedUnitId } from '../utils/domainSelection'

export function UnitsPage() {
  const [units, setUnits] = useState<Unit[]>([])
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [name, setName] = useState('MAG Educacional')
  const [kind, setKind] = useState<UnitKind>('course')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [nextUnits, nextClassrooms] = await Promise.all([academicService.getUnits(), academicService.getClassrooms()])
        setUnits(nextUnits)
        setClassrooms(nextClassrooms)
        setShowCreateForm(nextUnits.length === 0)
      } catch (loadError) {
        setError(formatApiErrorMessage('Não foi possível carregar as unidades.', loadError))
      } finally {
        setIsLoading(false)
      }
    }

    void loadData()
  }, [])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setMessage(null)

    try {
      const unit = await academicService.createUnit({ name, kind })
      setUnits((current) => [unit, ...current])
      setSelectedUnitId(unit.id)
      setSelectedClassroomId('')
      setSelectedExamId('')
      setShowCreateForm(false)
      setMessage(`Unidade ${unit.name} criada com sucesso.`)
    } catch (submitError) {
      setError(formatApiErrorMessage('Não foi possível criar a unidade.', submitError))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="page-shell">
      <Cabecalho
        breadcrumb={<Breadcrumbs items={[{ label: 'Unidades' }]} />}
        title="Unidades"
        subtitle="Escolha uma unidade para navegar pelas turmas e provas que pertencem a ela."
        actions={!showCreateForm ? <Button onClick={() => setShowCreateForm(true)}>+ Criar Nova Unidade</Button> : undefined}
      />

      {showCreateForm ? (
        <Card>
          <form className="stack-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Nome da unidade</span>
              <input value={name} onChange={(event) => setName(event.target.value)} />
            </label>

            <label className="field">
              <span>Tipo</span>
              <select value={kind} onChange={(event) => setKind(event.target.value as UnitKind)}>
                <option value="course">Curso</option>
                <option value="school">Escola</option>
                <option value="other">Outro</option>
              </select>
            </label>

            <div className="inline-actions">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : 'Salvar unidade'}
              </Button>
              {units.length ? (
                <Button type="button" variant="secondary" onClick={() => setShowCreateForm(false)}>
                  Cancelar
                </Button>
              ) : null}
            </div>

            {message ? <p className="feedback feedback--success">{message}</p> : null}
            {error ? <p className="feedback feedback--error">{error}</p> : null}
          </form>
        </Card>
      ) : null}

      {isLoading ? <p>Carregando unidades...</p> : null}
      {!isLoading && !units.length ? (
        <Card>
          <p>Nenhuma unidade cadastrada ainda.</p>
          <Button onClick={() => setShowCreateForm(true)}>+ Criar Nova Unidade</Button>
        </Card>
      ) : null}

      <div className="entity-grid">
        {units.map((unit) => {
          const totalClassrooms = classrooms.filter((item) => item.unitId === unit.id).length

          return (
            <Link
              key={unit.id}
              to={`/app/units/${unit.id}`}
              className="entity-link"
              onClick={() => {
                setSelectedUnitId(unit.id)
                setSelectedClassroomId('')
                setSelectedExamId('')
              }}
            >
              <Card className="entity-card">
                <p className="entity-card__eyebrow">Unidade</p>
                <h3>{unit.name}</h3>
                <p className="entity-card__meta">{unit.kind}</p>
                <div className="entity-card__stats">
                  <span>{totalClassrooms} turma(s)</span>
                </div>
              </Card>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
