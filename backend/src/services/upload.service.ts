import { db } from '../repositories/in-memory.repository.js'
import type { UploadFile } from '../types/entities.js'
import { AppError } from '../utils/app-error.js'
import { generateId } from '../utils/id.js'

type CreateUploadInput = {
  examId: string
  studentId: string
  originalName: string
  storedName: string
  path: string
  mimeType: string
  size: number
}

function getStudentName(studentId: string) {
  const student = db.students.find((item) => item.id === studentId)
  if (!student) return 'Aluno sem identificacao'
  return [student.firstName, student.middleName, student.lastName].filter(Boolean).join(' ')
}

export class UploadService {
  createUpload(input: CreateUploadInput): UploadFile & { studentName: string } {
    const exam = db.exams.find((item) => item.id === input.examId)
    if (!exam) {
      throw new AppError('EXAM_NOT_FOUND', 'Prova informada para upload nao existe.', 404)
    }

    const student = db.students.find((item) => item.id === input.studentId)
    if (!student) {
      throw new AppError('STUDENT_NOT_FOUND', 'Aluno informado para upload nao existe.', 404)
    }

    if (student.classroomId !== exam.classroomId) {
      throw new AppError('UPLOAD_STUDENT_EXAM_MISMATCH', 'O aluno selecionado nao pertence a turma da prova ativa.', 400)
    }

    const upload: UploadFile = {
      id: generateId('upl'),
      examId: input.examId,
      studentId: input.studentId,
      originalName: input.originalName,
      storedName: input.storedName,
      path: input.path,
      mimeType: input.mimeType,
      size: input.size,
      createdAt: new Date().toISOString(),
    }

    db.uploads.push(upload)
    db.persist()
    return {
      ...upload,
      studentName: getStudentName(upload.studentId),
    }
  }

  listUploads(filters?: { examId?: string; studentId?: string }) {
    return db.uploads
      .filter((item) => {
        if (filters?.examId && item.examId !== filters.examId) return false
        if (filters?.studentId && item.studentId !== filters.studentId) return false
        return true
      })
      .map((item) => ({
        ...item,
        studentName: getStudentName(item.studentId),
      }))
  }
}
