import { API_ENDPOINTS, request } from './apiClient'
import type { Classroom, Exam, Student, Unit, UnitKind } from '../types/omr'

type BackendUnit = Unit

type BackendClassroom = Classroom
type BackendStudent = Student

type BackendExam = {
  id: string
  classroomId: string
  title: string
  subject: string
  totalQuestions: number
  createdAt: string
}

function mapExam(exam: BackendExam): Exam {
  return {
    id: exam.id,
    classroomId: exam.classroomId,
    name: exam.title,
    subject: exam.subject,
    totalQuestions: exam.totalQuestions,
    createdAt: exam.createdAt,
  }
}

function ensureArray<T>(value: T[]) {
  return Array.isArray(value) ? value : []
}

export const academicService = {
  async getUnits() {
    return ensureArray(await request<BackendUnit[]>(API_ENDPOINTS.units, { method: 'GET' }))
  },

  async createUnit(payload: { name: string; kind: UnitKind }) {
    return request<BackendUnit>(API_ENDPOINTS.units, { method: 'POST', body: payload })
  },

  async getClassrooms() {
    return ensureArray(await request<BackendClassroom[]>(API_ENDPOINTS.classrooms, { method: 'GET' }))
  },

  async createClassroom(payload: { unitId: string; name: string; year: string }) {
    return request<BackendClassroom>(API_ENDPOINTS.classrooms, { method: 'POST', body: payload })
  },

  async updateClassroom(id: string, payload: { unitId: string; name: string; year: string }) {
    return request<BackendClassroom>(`${API_ENDPOINTS.classrooms}/${id}`, { method: 'PUT', body: payload })
  },

  async deleteClassroom(id: string) {
    return request<BackendClassroom>(`${API_ENDPOINTS.classrooms}/${id}`, { method: 'DELETE' })
  },

  async getExams() {
    const exams = await request<BackendExam[]>(API_ENDPOINTS.exams, { method: 'GET' })
    return ensureArray(exams).map(mapExam)
  },

  async createExam(payload: { classroomId: string; title: string; subject: string; totalQuestions: number }) {
    const exam = await request<BackendExam>(API_ENDPOINTS.exams, { method: 'POST', body: payload })
    return mapExam(exam)
  },

  async updateExam(id: string, payload: { classroomId: string; title: string; subject: string; totalQuestions: number }) {
    const exam = await request<BackendExam>(`${API_ENDPOINTS.exams}/${id}`, { method: 'PUT', body: payload })
    return mapExam(exam)
  },

  async deleteExam(id: string) {
    const exam = await request<BackendExam>(`${API_ENDPOINTS.exams}/${id}`, { method: 'DELETE' })
    return mapExam(exam)
  },

  async getStudents() {
    return ensureArray(await request<BackendStudent[]>(API_ENDPOINTS.students, { method: 'GET' }))
  },

  async createStudent(payload: {
    classroomId: string
    firstName: string
    middleName: string
    lastName: string
    studentCode: string
  }) {
    return request<BackendStudent>(API_ENDPOINTS.students, { method: 'POST', body: payload })
  },

  async updateStudent(
    id: string,
    payload: {
      classroomId: string
      firstName: string
      middleName: string
      lastName: string
      studentCode: string
    },
  ) {
    return request<BackendStudent>(`${API_ENDPOINTS.students}/${id}`, { method: 'PUT', body: payload })
  },

  async deleteStudent(id: string) {
    return request<BackendStudent>(`${API_ENDPOINTS.students}/${id}`, { method: 'DELETE' })
  },
}
