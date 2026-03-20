import { db } from '../repositories/in-memory.repository.js'
import type { Exam } from '../types/entities.js'
import { generateId } from '../utils/id.js'
import { AppError } from '../utils/app-error.js'

export class ExamService {
  create(input: { classroomId: string; title: string; subject: string; totalQuestions: number }): Exam {
    const classroom = db.classrooms.find((item) => item.id === input.classroomId)
    if (!classroom) {
      throw new AppError('CLASSROOM_NOT_FOUND', 'Turma informada nao existe.', 404)
    }

    const exam: Exam = {
      id: generateId('exam'),
      classroomId: input.classroomId,
      title: input.title,
      subject: input.subject,
      totalQuestions: input.totalQuestions,
      createdAt: new Date().toISOString(),
    }

    db.exams.push(exam)
    db.persist()
    return exam
  }

  list() {
    return db.exams
  }

  findById(id: string) {
    return db.exams.find((item) => item.id === id)
  }

  update(id: string, input: { classroomId: string; title: string; subject: string; totalQuestions: number }) {
    const exam = this.findById(id)
    if (!exam) {
      throw new AppError('EXAM_NOT_FOUND', 'Prova informada nao existe.', 404)
    }

    exam.classroomId = input.classroomId
    exam.title = input.title
    exam.subject = input.subject
    exam.totalQuestions = input.totalQuestions
    db.persist()
    return exam
  }

  delete(id: string) {
    const examIndex = db.exams.findIndex((item) => item.id === id)
    if (examIndex < 0) {
      throw new AppError('EXAM_NOT_FOUND', 'Prova informada nao existe.', 404)
    }

    const hasDependencies =
      db.templates.some((item) => item.examId === id) ||
      db.answerKeys.some((item) => item.examId === id) ||
      db.uploads.some((item) => item.examId === id) ||
      db.jobs.some((item) => item.examId === id) ||
      db.studentResults.some((item) => item.examId === id)

    if (hasDependencies) {
      throw new AppError('EXAM_HAS_DEPENDENCIES', 'Nao e possivel excluir a prova porque ela ja possui dados vinculados.', 400)
    }

    const [deleted] = db.exams.splice(examIndex, 1)
    db.persist()
    return deleted
  }
}
