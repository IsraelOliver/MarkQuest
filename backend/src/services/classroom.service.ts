import { db } from '../repositories/in-memory.repository.js'
import type { Classroom } from '../types/entities.js'
import { generateId } from '../utils/id.js'
import { AppError } from '../utils/app-error.js'

export class ClassroomService {
  create(input: { unitId: string; name: string; year: string }): Classroom {
    const unit = db.units.find((item) => item.id === input.unitId)
    if (!unit) {
      throw new AppError('UNIT_NOT_FOUND', 'Unidade informada não existe.', 404)
    }

    const classroom: Classroom = {
      id: generateId('cls'),
      unitId: input.unitId,
      name: input.name,
      year: input.year,
      createdAt: new Date().toISOString(),
    }

    db.classrooms.push(classroom)
    db.persist()
    return classroom
  }

  list() {
    return db.classrooms
  }

  update(id: string, input: { unitId: string; name: string; year: string }) {
    const classroom = db.classrooms.find((item) => item.id === id)
    if (!classroom) {
      throw new AppError('CLASSROOM_NOT_FOUND', 'Turma informada não existe.', 404)
    }

    classroom.unitId = input.unitId
    classroom.name = input.name
    classroom.year = input.year
    db.persist()
    return classroom
  }

  delete(id: string) {
    const classroomIndex = db.classrooms.findIndex((item) => item.id === id)
    if (classroomIndex < 0) {
      throw new AppError('CLASSROOM_NOT_FOUND', 'Turma informada não existe.', 404)
    }

    const hasExams = db.exams.some((item) => item.classroomId === id)
    if (hasExams) {
      throw new AppError('CLASSROOM_HAS_EXAMS', 'Não é possível excluir a turma enquanto houver provas vinculadas.', 400)
    }

    const hasStudents = db.students.some((item) => item.classroomId === id)
    if (hasStudents) {
      throw new AppError('CLASSROOM_HAS_STUDENTS', 'Não é possível excluir a turma enquanto houver alunos cadastrados.', 400)
    }

    const [deleted] = db.classrooms.splice(classroomIndex, 1)
    db.persist()
    return deleted
  }
}
