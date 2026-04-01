import type {
  AnswerKey,
  AnswerSheet,
  Exam,
  OMRTemplateConfig,
  OMRResult,
  ProcessingJob,
  StudentResult,
  Template,
} from '../types/omr'
import { createEditorStateFromPreset } from '../utils/cardTemplatePresets'
import { createTemplateLayoutConfig } from '../utils/templateLayout'

export const examsMock: Exam[] = [
  {
    id: 'exam-2026-math-01',
    classroomId: 'cls-demo-001',
    name: 'Simulado ENEM - Matemática',
    subject: 'Matemática',
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
    templateId: 'template-01',
    templateVersion: 'v1',
    answerKeyId: 'key-01',
    answerKeyVersion: 'v1',
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
    warnings: ['Questão 3 com marcação ambígua.'],
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
    name: 'Template ENEM A4 - 45 questões',
    examId: 'exam-2026-math-01',
    totalQuestions: 45,
    presetId: 'enem-a4',
    definition: createEditorStateFromPreset('enem-a4').definition,
    visualTheme: createEditorStateFromPreset('enem-a4').visualTheme,
    omrConfig: createTemplateLayoutConfig(45) satisfies OMRTemplateConfig,
    version: 'v1.0.0',
    createdAt: '2026-03-01T07:00:00Z',
  },
]

export const answerKeysMock: AnswerKey[] = [
  {
    id: 'key-01',
    examId: 'exam-2026-math-01',
    templateId: 'template-01',
    version: 'v1',
    answers: ['A', 'C', 'D', 'B', 'E'],
    createdAt: '2026-03-01T07:30:00Z',
  },
]
