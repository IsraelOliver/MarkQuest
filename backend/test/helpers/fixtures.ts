import type { FastifyInstance } from 'fastify'
import type { ApiSuccess } from './test-app.js'
import { buildMultipartPayload, parseJson } from './test-app.js'

export type UnitDto = {
  id: string
  name: string
  kind: 'school' | 'course' | 'other'
  createdAt: string
}

export type ClassroomDto = {
  id: string
  unitId: string
  name: string
  year: string
  createdAt: string
}

export type ExamDto = {
  id: string
  classroomId: string
  title: string
  subject: string
  totalQuestions: number
  createdAt: string
}

export type StudentDto = {
  id: string
  classroomId: string
  firstName: string
  middleName: string
  lastName: string
  studentCode: string
  createdAt: string
}

export type TemplateDto = {
  id: string
  name: string
  examId: string
  totalQuestions: number
  presetId: string
  version: string
  definition: ReturnType<typeof buildTemplatePayload>['definition']
  visualTheme: ReturnType<typeof buildTemplatePayload>['visualTheme']
  omrConfig: Record<string, unknown>
  createdAt: string
  updatedAt?: string
}

export type AnswerKeyDto = {
  id: string
  name: string
  examId: string
  templateId: string
  answers: string[]
  questions?: Array<{
    questionNumber: number
    questionType: string
    questionKind: string
    sourceSectionId: string
    sourceSectionTitle?: string
    markerLabel?: string
    groupKey?: string
    groupLabel?: string
    validOptions: string[]
    correctAnswer: string | null
    allowedCharacters?: string[]
    responseColumns?: number
    score: number
    weight: number
    maxScore?: number
    status: string
  }>
  defaultScore?: number
  defaultWeight?: number
  essayMaxScore?: number
  totalScore?: number
  createdAt: string
  updatedAt?: string
}

export type UploadDto = {
  id: string
  originalName: string
  storedName: string
  path: string
  mimeType: string
  size: number
  examId: string
  studentId: string
  createdAt: string
  studentName: string
}

export function buildTemplatePayload(input: { examId: string; totalQuestions?: number; name?: string }) {
  const totalQuestions = input.totalQuestions ?? 2

  return {
    name: input.name ?? 'Template contrato',
    examId: input.examId,
    totalQuestions,
    presetId: 'school-a4',
    definition: {
      pageSize: 'A4',
      totalQuestions,
      choicesPerQuestion: 5,
      optionLabels: ['A', 'B', 'C', 'D', 'E'],
      columns: 1,
      rowsPerColumn: totalQuestions,
      questionStyle: 'classic',
      bubbleSize: 'medium',
      rowSpacing: 'uniform',
      columnLayoutMode: 'left',
      columnGap: 12,
      optionAlignment: 'auto',
      enableQuestionBlocks: true,
      showQuestionBlockTitles: false,
      questionBlocks: [
        {
          id: 'section-objective-1',
          sectionType: 'objective',
          readMode: 'answers',
          startQuestion: 1,
          endQuestion: totalQuestions,
          title: 'Objetivas',
          choicesPerQuestion: 5,
          optionLabels: ['A', 'B', 'C', 'D', 'E'],
          numberingFormat: 'numeric',
        },
        {
          id: 'section-image-1',
          sectionType: 'image',
          readMode: 'ignored',
          imageSrc: 'data:image/webp;base64,AAAA',
          imageName: 'figura.webp',
          imageWidth: 120,
          imageHeight: 80,
          size: '50',
          align: 'center',
          isQuestion: false,
          linkedToMainQuestion: false,
          linkedQuestionNumber: null,
          markerLabel: 'IMAGEM',
          mimeType: 'image/webp',
          fileSize: 512,
          optimized: true,
          originalName: 'figura-original.png',
        },
      ],
      identification: {
        showStudentName: true,
        showStudentCode: true,
        showClassroom: true,
        showDate: false,
        showExamCode: true,
        showSignature: false,
        showManualIdGrid: false,
        extraFields: [],
      },
      header: {
        institutionName: 'MarkQuest',
        examName: 'Simulado',
        subtitle: 'Contrato API',
        classroomLabel: 'Turma',
        instructions: '',
        showInstructions: false,
        omrGuidance: '',
        footerMessage: '',
        footerMessageAlignment: 'center',
        footerMessageWeight: 'regular',
        footerMessageFontSize: 8,
        footerPagePosition: 'bottom',
        footerPageTone: 'subtle',
        showInstitutionLogo: false,
        institutionLogoDataUrl: '',
        logoAlignment: 'left',
        logoScale: 1,
        logoMonochrome: false,
      },
    },
    visualTheme: {
      visualStyle: 'institutional',
      density: 'balanced',
      softBorders: true,
      showSectionSeparators: true,
      refinedAlignment: true,
      highlightHeader: false,
      answerGridStyle: 'classic',
    },
    omrConfig: {
      totalQuestions,
      choicesPerQuestion: 5,
      columns: 1,
      rowsPerColumn: totalQuestions,
      startXRatio: 0.2,
      startYRatio: 0.25,
      columnGapRatio: 0.2,
      rowGapRatio: 0.2,
      optionGapRatio: 0.08,
      bubbleRadiusRatio: 0.025,
      markThreshold: 0.5,
      ambiguityThreshold: 0.15,
    },
  } as const
}

export async function createCoreData(app: FastifyInstance) {
  const unit = await createUnit(app)
  const classroom = await createClassroom(app, unit.id)
  const exam = await createExam(app, classroom.id)
  const student = await createStudent(app, classroom.id)
  const template = await createTemplate(app, exam.id)
  const answerKey = await createAnswerKey(app, exam.id, template.id)

  return { unit, classroom, exam, student, template, answerKey }
}

export async function createUnit(app: FastifyInstance) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/units',
    payload: { name: 'Unidade Centro', kind: 'school' },
  })
  return parseJson<ApiSuccess<UnitDto>>(response).data
}

export async function createClassroom(app: FastifyInstance, unitId: string) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/classrooms',
    payload: { unitId, name: '5º Turma B', year: '2026' },
  })
  return parseJson<ApiSuccess<ClassroomDto>>(response).data
}

export async function createExam(app: FastifyInstance, classroomId: string) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/exams',
    payload: { classroomId, title: 'Simulado 1', subject: 'Matemática', totalQuestions: 2 },
  })
  return parseJson<ApiSuccess<ExamDto>>(response).data
}

export async function createStudent(app: FastifyInstance, classroomId: string) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/students',
    payload: {
      classroomId,
      firstName: 'Ana',
      middleName: '',
      lastName: 'Silva',
      studentCode: 'A001',
    },
  })
  return parseJson<ApiSuccess<StudentDto>>(response).data
}

export async function createTemplate(app: FastifyInstance, examId: string) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/templates',
    payload: buildTemplatePayload({ examId }),
  })
  return parseJson<ApiSuccess<TemplateDto>>(response).data
}

export async function createAnswerKey(app: FastifyInstance, examId: string, templateId: string) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/answer-keys',
    payload: {
      name: 'Gabarito oficial',
      examId,
      templateId,
      answers: ['A', 'B'],
    },
  })
  return parseJson<ApiSuccess<AnswerKeyDto>>(response).data
}

export async function uploadFile(
  app: FastifyInstance,
  input: {
    examId: string
    studentId: string
    filename?: string
    contentType?: string
    content?: Buffer | string
  },
) {
  const multipart = buildMultipartPayload({
    fields: {
      examId: input.examId,
      studentId: input.studentId,
    },
    file: {
      filename: input.filename ?? 'cartao.png',
      contentType: input.contentType ?? 'image/png',
      content: input.content ?? Buffer.from('not-a-real-image-but-valid-upload-contract'),
    },
  })

  const response = await app.inject({
    method: 'POST',
    url: '/api/uploads',
    headers: multipart.headers,
    payload: multipart.payload,
  })

  return response
}
