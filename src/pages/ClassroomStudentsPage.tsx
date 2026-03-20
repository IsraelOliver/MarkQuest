import { useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { SectionTitle } from '../components/SectionTitle'
import { useAcademicScope } from '../hooks/useAcademicScope'
import { academicService } from '../services/academicService'
import { formatApiErrorMessage } from '../utils/display'

export function ClassroomStudentsPage() {
  const { unitId, classroomId } = useParams()
  const { units, classrooms, students, refresh } = useAcademicScope()
  const [firstName, setFirstName] = useState('Ana')
  const [middleName, setMiddleName] = useState('Maria')
  const [lastName, setLastName] = useState('Souza')
  const [studentCode, setStudentCode] = useState('ST-1001')
  const [editingStudentId, setEditingStudentId] = useState('')
  const [importFileName, setImportFileName] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSavingStudent, setIsSavingStudent] = useState(false)

  const unit = units.find((item) => item.id === unitId)
  const classroom = classrooms.find((item) => item.id === classroomId)
  const classroomStudents = useMemo(() => students.filter((item) => item.classroomId === classroomId), [classroomId, students])

  const resetStudentForm = () => {
    setFirstName('Ana')
    setMiddleName('Maria')
    setLastName('Souza')
    setStudentCode('ST-1001')
    setEditingStudentId('')
  }

  const handleEditStudent = (studentId: string) => {
    const student = classroomStudents.find((item) => item.id === studentId)
    if (!student) return
    setEditingStudentId(student.id)
    setFirstName(student.firstName)
    setMiddleName(student.middleName)
    setLastName(student.lastName)
    setStudentCode(student.studentCode)
    setMessage(null)
    setError(null)
  }

  const handleSubmitStudent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!classroomId) {
      setError('Turma invalida para cadastro de aluno.')
      return
    }

    setIsSavingStudent(true)
    setError(null)
    setMessage(null)

    try {
      if (editingStudentId) {
        await academicService.updateStudent(editingStudentId, {
          classroomId,
          firstName,
          middleName,
          lastName,
          studentCode,
        })
        setMessage('Aluno atualizado com sucesso.')
      } else {
        await academicService.createStudent({
          classroomId,
          firstName,
          middleName,
          lastName,
          studentCode,
        })
        setMessage('Aluno cadastrado com sucesso.')
      }

      resetStudentForm()
      await refresh()
    } catch (submitError) {
      setError(formatApiErrorMessage('Nao foi possivel salvar o aluno.', submitError))
    } finally {
      setIsSavingStudent(false)
    }
  }

  const handleDeleteStudent = async (studentId: string) => {
    setError(null)
    setMessage(null)

    try {
      await academicService.deleteStudent(studentId)
      if (editingStudentId === studentId) resetStudentForm()
      await refresh()
      setMessage('Aluno excluido com sucesso.')
    } catch (deleteError) {
      setError(formatApiErrorMessage('Nao foi possivel excluir o aluno.', deleteError))
    }
  }

  const handleImportFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    setImportFileName(file?.name ?? '')
  }

  return (
    <section>
      <Breadcrumbs
        items={[
          { label: 'Unidades', to: '/app/units' },
          { label: unit?.name ?? 'Turmas', to: `/app/units/${unitId}` },
          { label: classroom?.name ?? 'Turma', to: `/app/units/${unitId}/classrooms/${classroomId}` },
          { label: 'Alunos' },
        ]}
      />

      <SectionTitle title="Alunos" subtitle="Cadastre, edite e importe a lista de alunos vinculados a esta turma." />

      <div className="inline-actions page-actions">
        <Link to={`/app/units/${unitId}/classrooms/${classroomId}`}>
          <Button variant="secondary">Voltar para a turma</Button>
        </Link>
      </div>

      <div className="students-layout">
        <aside className="students-layout__left">
          <Card>
            <form className="stack-form" onSubmit={handleSubmitStudent}>
              <h3>{editingStudentId ? 'Editar aluno' : 'Novo aluno'}</h3>

              <label className="field">
                <span>Nome</span>
                <input value={firstName} onChange={(event) => setFirstName(event.target.value)} />
              </label>

              <label className="field">
                <span>Nome do meio</span>
                <input value={middleName} onChange={(event) => setMiddleName(event.target.value)} />
              </label>

              <label className="field">
                <span>Ultimo nome</span>
                <input value={lastName} onChange={(event) => setLastName(event.target.value)} />
              </label>

              <label className="field">
                <span>ID do aluno</span>
                <input value={studentCode} onChange={(event) => setStudentCode(event.target.value)} />
              </label>

              <div className="inline-actions">
                <Button type="submit" disabled={isSavingStudent}>
                  {isSavingStudent ? 'Salvando...' : editingStudentId ? 'Salvar aluno' : 'Cadastrar aluno'}
                </Button>
                <Button type="button" variant="secondary" onClick={resetStudentForm}>
                  Cancelar
                </Button>
              </div>

              {message ? <p className="feedback feedback--success">{message}</p> : null}
              {error ? <p className="feedback feedback--error">{error}</p> : null}
            </form>
          </Card>
        </aside>

        <div className="students-layout__center">
          <Card>
            <h3>Lista de alunos</h3>
            {classroomStudents.length ? (
              <div className="student-list student-list--dense">
                {classroomStudents.map((student) => (
                  <button key={student.id} type="button" className="student-row" onClick={() => handleEditStudent(student.id)}>
                    <span className="student-row__name">
                      {[student.firstName, student.middleName, student.lastName].filter(Boolean).join(' ')}
                    </span>
                    <span className="student-row__code">{student.studentCode}</span>
                    <span className="student-row__hint">Clique para editar</span>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={(event) => {
                        event.stopPropagation()
                        void handleDeleteStudent(student.id)
                      }}
                    >
                      Excluir
                    </Button>
                  </button>
                ))}
              </div>
            ) : (
              <p>Nenhum aluno cadastrado nesta turma ainda.</p>
            )}
          </Card>
        </div>

        <aside className="students-layout__right">
          <Card>
            <h3>Importar lista</h3>
            <p className="muted-text">Envie uma planilha Excel com a lista de alunos. A importacao automatica sera a proxima etapa.</p>
            <label className="field">
              <span>Arquivo Excel</span>
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImportFile} />
            </label>
            <p className="muted-text">{importFileName ? `Selecionado: ${importFileName}` : 'Nenhum arquivo selecionado.'}</p>
          </Card>
        </aside>
      </div>
    </section>
  )
}
