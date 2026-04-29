import { db } from '../repositories/in-memory.repository.js'
import type { Student } from '../types/entities.js'
import { AppError } from '../utils/app-error.js'
import { generateId } from '../utils/id.js'

export class StudentService {
  create(input: {
    classroomId: string
    firstName: string
    middleName: string
    lastName: string
    studentCode: string
  }): Student {
    const classroom = db.classrooms.find((item) => item.id === input.classroomId)
    if (!classroom) {
      throw new AppError('CLASSROOM_NOT_FOUND', 'Turma informada para aluno não existe.', 404)
    }

    const student: Student = {
      id: generateId('std'),
      classroomId: input.classroomId,
      firstName: input.firstName,
      middleName: input.middleName,
      lastName: input.lastName,
      studentCode: input.studentCode,
      createdAt: new Date().toISOString(),
    }

    db.students.push(student)
    db.persist()
    return student
  }

  list() {
    return db.students
  }

  update(
    id: string,
    input: {
      classroomId: string
      firstName: string
      middleName: string
      lastName: string
      studentCode: string
    },
  ) {
    const student = db.students.find((item) => item.id === id)
    if (!student) {
      throw new AppError('STUDENT_NOT_FOUND', 'Aluno informado não existe.', 404)
    }

    const classroom = db.classrooms.find((item) => item.id === input.classroomId)
    if (!classroom) {
      throw new AppError('CLASSROOM_NOT_FOUND', 'Turma informada para aluno não existe.', 404)
    }

    student.classroomId = input.classroomId
    student.firstName = input.firstName
    student.middleName = input.middleName
    student.lastName = input.lastName
    student.studentCode = input.studentCode
    db.persist()
    return student
  }

  delete(id: string) {
    const studentIndex = db.students.findIndex((item) => item.id === id)
    if (studentIndex < 0) {
      throw new AppError('STUDENT_NOT_FOUND', 'Aluno informado não existe.', 404)
    }

    const [deleted] = db.students.splice(studentIndex, 1)
    db.persist()
    return deleted
  }
}
