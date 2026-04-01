import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { SectionTitle } from '../components/SectionTitle'
import { useAcademicScope } from '../hooks/useAcademicScope'
import { omrService } from '../services/omrService'
import type { AnswerSheet } from '../types/omr'
import { formatApiErrorMessage } from '../utils/display'
import { setSelectedExamId } from '../utils/domainSelection'

export function UploadsPage() {
  const { unitId, classroomId, examId } = useParams()
  const { selectedUnit, selectedClassroom, selectedExam, students } = useAcademicScope()
  const filteredStudents = students.filter((student) => student.classroomId === selectedClassroom?.id)
  const [studentId, setStudentId] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [uploads, setUploads] = useState<AnswerSheet[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (examId) {
      setSelectedExamId(examId)
    }
  }, [examId])

  useEffect(() => {
    const loadUploads = async () => {
      try {
        const response = await omrService.getUploads({ examId: selectedExam?.id })
        setUploads(response.items)
      } catch (loadError) {
        setError(formatApiErrorMessage('Nao foi possivel carregar os uploads.', loadError))
      } finally {
        setIsLoading(false)
      }
    }

    void loadUploads()
  }, [selectedExam?.id])

  useEffect(() => {
    if (!filteredStudents.length) {
      setStudentId('')
      return
    }

    setStudentId((current) => (filteredStudents.some((student) => student.id === current) ? current : filteredStudents[0].id))
  }, [filteredStudents])

  const selectedStudent = filteredStudents.find((student) => student.id === studentId)
  const uploadsForSelectedStudent = useMemo(
    () => uploads.filter((upload) => upload.studentId === studentId),
    [studentId, uploads],
  )

  const totalUploadsLabel = uploads.length === 1 ? '1 cartao enviado' : `${uploads.length} cartoes enviados`
  const studentUploadsLabel =
    uploadsForSelectedStudent.length === 1 ? '1 arquivo deste aluno' : `${uploadsForSelectedStudent.length} arquivos deste aluno`

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!files.length) {
      setError('Selecione pelo menos um arquivo para enviar.')
      return
    }

    if (!selectedExam) {
      setError('Selecione uma prova ativa antes de enviar os arquivos.')
      return
    }

    if (!studentId) {
      setError('Selecione um aluno da turma ativa antes de enviar os arquivos.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    setMessage(null)

    try {
      const response = await omrService.createUpload({
        examId: selectedExam.id,
        studentId,
        files,
      })

      setUploads((current) => [...response.items, ...current])
      setFiles([])
      setMessage(`${response.totalFiles} arquivo(s) enviado(s) com sucesso para ${selectedStudent ? `${selectedStudent.firstName} ${selectedStudent.lastName}`.trim() : 'o aluno selecionado'}.`)
    } catch (submitError) {
      setError(formatApiErrorMessage('Nao foi possivel enviar os arquivos.', submitError))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="page-shell">
      <Breadcrumbs
        items={[
          { label: 'Unidades', to: '/app/units' },
          { label: selectedUnit?.name ?? 'Turmas', to: `/app/units/${unitId}` },
          { label: selectedClassroom?.name ?? 'Turma', to: `/app/units/${unitId}/classrooms/${classroomId}` },
          { label: 'Provas', to: `/app/units/${unitId}/classrooms/${classroomId}/exams` },
          { label: selectedExam?.name ?? 'Prova', to: `/app/units/${unitId}/classrooms/${classroomId}/exams/${examId}` },
          { label: 'Uploads' },
        ]}
      />

      <SectionTitle
        title="Upload de cartoes-resposta"
        subtitle="Trabalhe por aluno: selecione quem vai receber o lote, envie os arquivos e acompanhe o historico sem sair da prova."
      />

      <div className="inline-actions page-actions">
        <Link to={`/app/units/${unitId}/classrooms/${classroomId}/exams/${examId}`}>
          <Button variant="secondary">Voltar para a prova</Button>
        </Link>
      </div>

      <Card className="upload-context-card">
        <div className="upload-context-card__header">
          <div>
            <p className="upload-context-card__eyebrow">Contexto ativo</p>
            <h3>{selectedExam?.name ?? 'Prova'}</h3>
          </div>
          <div className="upload-context-card__stats">
            <span>{filteredStudents.length} alunos</span>
            <span>{totalUploadsLabel}</span>
          </div>
        </div>
        <p>
          {selectedUnit?.name ?? 'Sem unidade'} / {selectedClassroom?.name ?? 'Sem turma'} / {selectedExam?.name ?? 'Sem prova'}
        </p>
      </Card>

      <div className="uploads-layout">
        <aside className="uploads-layout__students">
          <Card className="uploads-students-card">
            <div className="uploads-students-card__header">
              <div>
                <p className="uploads-students-card__eyebrow">Turma ativa</p>
                <h3>Selecionar aluno</h3>
              </div>
              <strong>{filteredStudents.length}</strong>
            </div>

            {!filteredStudents.length ? <p className="feedback feedback--error">Cadastre alunos na turma antes de enviar uploads.</p> : null}

            <div className="uploads-student-list">
              {filteredStudents.map((student) => {
                const studentUploads = uploads.filter((upload) => upload.studentId === student.id)
                const studentUploadsCount = studentUploads.length

                return (
                  <button
                    key={student.id}
                    type="button"
                    className={`uploads-student-item${student.id === studentId ? ' uploads-student-item--active' : ''}`}
                    onClick={() => setStudentId(student.id)}
                  >
                    <div>
                      <strong>{`${student.firstName} ${student.lastName}`.trim()}</strong>
                      <span>{student.studentCode}</span>
                    </div>
                    <small>{studentUploadsCount === 1 ? '1 arquivo' : `${studentUploadsCount} arquivos`}</small>
                  </button>
                )
              })}
            </div>
          </Card>
        </aside>

        <div className="uploads-layout__content">
          <Card className="uploads-batch-card">
            <div className="uploads-batch-card__header">
              <div>
                <p className="uploads-batch-card__eyebrow">Lote do aluno</p>
                <h3>{selectedStudent ? `${selectedStudent.firstName} ${selectedStudent.lastName}`.trim() : 'Selecione um aluno'}</h3>
              </div>
              <span className="uploads-batch-card__meta">{selectedStudent ? studentUploadsLabel : 'Nenhum aluno selecionado'}</span>
            </div>

            <form className="stack-form" onSubmit={handleSubmit}>
              <label className="field">
                <span>Exame</span>
                <input value={selectedExam?.name ?? 'Selecione uma prova em Provas'} disabled />
              </label>

              <label className="field">
                <span>Aluno selecionado</span>
                <input value={selectedStudent ? `${selectedStudent.firstName} ${selectedStudent.lastName}`.trim() : 'Nenhum aluno selecionado'} disabled />
              </label>

              <label className="field">
                <span>Arquivos do lote</span>
                <input
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
                />
              </label>

              <div className="inline-actions">
                <Button type="submit" disabled={isSubmitting || !filteredStudents.length || !studentId}>
                  {isSubmitting ? 'Enviando...' : 'Enviar lote para o aluno'}
                </Button>
                <span className="muted-text">{files.length ? `${files.length} arquivo(s) selecionado(s)` : 'Nenhum arquivo selecionado'}</span>
              </div>

              {message ? <p className="feedback feedback--success">{message}</p> : null}
              {error ? <p className="feedback feedback--error">{error}</p> : null}
            </form>
          </Card>

          <Card className="uploads-history-card">
            <div className="uploads-history-card__header">
              <div>
                <p className="uploads-history-card__eyebrow">Historico do aluno</p>
                <h3>{selectedStudent ? `Arquivos de ${selectedStudent.firstName}` : 'Uploads recentes'}</h3>
              </div>
              <span className="uploads-history-card__meta">{selectedStudent ? studentUploadsLabel : totalUploadsLabel}</span>
            </div>

            {isLoading ? <p>Carregando uploads...</p> : null}
            {!isLoading && selectedStudent && !uploadsForSelectedStudent.length ? <p>Nenhum arquivo enviado para este aluno ainda.</p> : null}
            {!isLoading && !selectedStudent && !uploads.length ? <p>Nenhum upload enviado ainda.</p> : null}

            <div className="uploads-history-list">
              {(selectedStudent ? uploadsForSelectedStudent : uploads).map((sheet) => (
                <div key={sheet.id} className="uploads-history-item">
                  <div>
                    <strong>{sheet.fileName}</strong>
                    <span>{sheet.studentName}</span>
                  </div>
                  <small>{new Date(sheet.uploadedAt).toLocaleString('pt-BR')}</small>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </section>
  )
}
