import type {
  AnswerKey,
  AnswerSheet,
  Exam,
  OMRResult,
  ProcessingJob,
  StudentResult,
  Template,
} from '../types/omr'

export const examsMock: Exam[] = [
  {
    id: 'exam-2026-math-01',
    classroomId: 'cls-demo-001',
    name: 'Simulado ENEM - Matematica',
    subject: 'Matematica',
    totalQuestions: 45,
    createdAt: '2026-03-01T08:30:00Z',
  },
]

export const answerSheetsMock: AnswerSheet[] = [
  {
    id: 'sheet-001',
    studentId: 'ST-1001',
    studentName: 'Ana Souza',
    examId: 'exam-2026-math-01',
    fileName: 'ana-souza-cartao.jpg',
    uploadedAt: '2026-03-10T12:00:00Z',
  },
  {
    id: 'sheet-002',
    studentId: 'ST-1002',
    studentName: 'Bruno Lima',
    examId: 'exam-2026-math-01',
    fileName: 'bruno-lima-cartao.jpg',
    uploadedAt: '2026-03-10T12:01:00Z',
  },
]

export const processingJobsMock: ProcessingJob[] = [
  {
    id: 'job-omr-0001',
    examId: 'exam-2026-math-01',
    sheetIds: ['sheet-001', 'sheet-002'],
    status: 'completed',
    createdAt: '2026-03-10T12:02:00Z',
    finishedAt: '2026-03-10T12:02:35Z',
  },
]

export const omrResultsMock: OMRResult[] = [
  {
    id: 'omr-001',
    jobId: 'job-omr-0001',
    answerSheetId: 'sheet-001',
    confidence: 0.98,
    detectedAnswers: ['A', 'C', 'D', 'B', 'E'],
    warnings: [],
  },
  {
    id: 'omr-002',
    jobId: 'job-omr-0001',
    answerSheetId: 'sheet-002',
    confidence: 0.93,
    detectedAnswers: ['A', 'C', 'B', 'B', 'E'],
    warnings: ['Questao 3 com marcacao ambigua.'],
  },
]

export const studentResultsMock: StudentResult[] = [
  {
    id: 'result-st-1001',
    examId: 'exam-2026-math-01',
    studentId: 'ST-1001',
    studentName: 'Ana Souza',
    score: 96,
    correctAnswers: 43,
    incorrectAnswers: 2,
    blankAnswers: 0,
  },
  {
    id: 'result-st-1002',
    examId: 'exam-2026-math-01',
    studentId: 'ST-1002',
    studentName: 'Bruno Lima',
    score: 82,
    correctAnswers: 37,
    incorrectAnswers: 6,
    blankAnswers: 2,
  },
]

export const templatesMock: Template[] = [
  {
    id: 'template-01',
    name: 'Template ENEM A4 - 45 questoes',
    examId: 'exam-2026-math-01',
    totalQuestions: 45,
    version: 'v1.0.0',
    createdAt: '2026-03-01T07:00:00Z',
  },
]

export const answerKeysMock: AnswerKey[] = [
  {
    id: 'key-01',
    examId: 'exam-2026-math-01',
    version: 'v1',
    answers: ['A', 'C', 'D', 'B', 'E'],
    createdAt: '2026-03-01T07:30:00Z',
  },
]
