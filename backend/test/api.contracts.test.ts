import fs from 'node:fs'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { TestApp, ApiFailure, ApiSuccess } from './helpers/test-app.js'
import { createTestApp, parseJson } from './helpers/test-app.js'
import {
  buildTemplatePayload,
  createAnswerKey,
  createClassroom,
  createCoreData,
  createExam,
  createStudent,
  createTemplate,
  createUnit,
  uploadFile,
  type AnswerKeyDto,
  type ClassroomDto,
  type ExamDto,
  type StudentDto,
  type TemplateDto,
  type UnitDto,
  type UploadDto,
} from './helpers/fixtures.js'

let ctx: TestApp

beforeEach(async () => {
  ctx = await createTestApp()
})

afterEach(async () => {
  await ctx.cleanup()
})

describe('API contracts', () => {
  it('creates and lists units, and rejects invalid unit payloads', async () => {
    const created = await createUnit(ctx.app)
    expect(created.id).toMatch(/^unt_/)
    expect(created.name).toBe('Unidade Centro')
    expect(created.kind).toBe('school')

    const listResponse = await ctx.app.inject({ method: 'GET', url: '/api/units' })
    expect(listResponse.statusCode).toBe(200)
    expect(parseJson<ApiSuccess<UnitDto[]>>(listResponse).data).toHaveLength(1)

    const invalidResponse = await ctx.app.inject({
      method: 'POST',
      url: '/api/units',
      payload: { name: 'A', kind: 'school' },
    })
    expect(invalidResponse.statusCode).toBe(400)
    expect(parseJson<ApiFailure>(invalidResponse).error.code).toBe('VALIDATION_ERROR')
  })

  it('covers classroom create, list, update, delete and foreign-key validation', async () => {
    const unit = await createUnit(ctx.app)
    const classroom = await createClassroom(ctx.app, unit.id)

    expect(classroom.id).toMatch(/^cls_/)
    expect(classroom.unitId).toBe(unit.id)

    const listResponse = await ctx.app.inject({ method: 'GET', url: '/api/classrooms' })
    expect(parseJson<ApiSuccess<ClassroomDto[]>>(listResponse).data).toHaveLength(1)

    const updateResponse = await ctx.app.inject({
      method: 'PUT',
      url: `/api/classrooms/${classroom.id}`,
      payload: { unitId: unit.id, name: '6º Turma A', year: '2027' },
    })
    expect(updateResponse.statusCode).toBe(200)
    expect(parseJson<ApiSuccess<ClassroomDto>>(updateResponse).data.name).toBe('6º Turma A')

    const invalidFkResponse = await ctx.app.inject({
      method: 'POST',
      url: '/api/classrooms',
      payload: { unitId: 'unt_missing', name: 'Turma sem unidade', year: '2026' },
    })
    expect(invalidFkResponse.statusCode).toBe(404)
    expect(parseJson<ApiFailure>(invalidFkResponse).error).toMatchObject({
      code: 'NOT_FOUND',
      details: { cause: 'UNIT_NOT_FOUND' },
    })

    const deleteResponse = await ctx.app.inject({ method: 'DELETE', url: `/api/classrooms/${classroom.id}` })
    expect(deleteResponse.statusCode).toBe(200)
    expect(parseJson<ApiSuccess<ClassroomDto>>(deleteResponse).data.id).toBe(classroom.id)
  })

  it('covers exam create, list, update, delete and foreign-key validation', async () => {
    const unit = await createUnit(ctx.app)
    const classroom = await createClassroom(ctx.app, unit.id)
    const exam = await createExam(ctx.app, classroom.id)

    expect(exam.id).toMatch(/^exam_/)
    expect(exam.classroomId).toBe(classroom.id)

    const listResponse = await ctx.app.inject({ method: 'GET', url: '/api/exams' })
    expect(parseJson<ApiSuccess<ExamDto[]>>(listResponse).data).toHaveLength(1)

    const updateResponse = await ctx.app.inject({
      method: 'PUT',
      url: `/api/exams/${exam.id}`,
      payload: { classroomId: classroom.id, title: 'Simulado 2', subject: 'Ciências', totalQuestions: 2 },
    })
    expect(updateResponse.statusCode).toBe(200)
    expect(parseJson<ApiSuccess<ExamDto>>(updateResponse).data.title).toBe('Simulado 2')

    const invalidFkResponse = await ctx.app.inject({
      method: 'POST',
      url: '/api/exams',
      payload: { classroomId: 'cls_missing', title: 'Simulado inválido', subject: 'Geo', totalQuestions: 2 },
    })
    expect(invalidFkResponse.statusCode).toBe(404)
    expect(parseJson<ApiFailure>(invalidFkResponse).error).toMatchObject({
      code: 'NOT_FOUND',
      details: { cause: 'CLASSROOM_NOT_FOUND' },
    })

    const deleteResponse = await ctx.app.inject({ method: 'DELETE', url: `/api/exams/${exam.id}` })
    expect(deleteResponse.statusCode).toBe(200)
    expect(parseJson<ApiSuccess<ExamDto>>(deleteResponse).data.id).toBe(exam.id)
  })

  it('covers student create, list, update, delete and foreign-key validation', async () => {
    const unit = await createUnit(ctx.app)
    const classroom = await createClassroom(ctx.app, unit.id)
    const student = await createStudent(ctx.app, classroom.id)

    expect(student.id).toMatch(/^std_/)
    expect(student.classroomId).toBe(classroom.id)

    const listResponse = await ctx.app.inject({ method: 'GET', url: '/api/students' })
    expect(parseJson<ApiSuccess<StudentDto[]>>(listResponse).data).toHaveLength(1)

    const updateResponse = await ctx.app.inject({
      method: 'PUT',
      url: `/api/students/${student.id}`,
      payload: {
        classroomId: classroom.id,
        firstName: 'Ana',
        middleName: 'Maria',
        lastName: 'Silva',
        studentCode: 'A002',
      },
    })
    expect(updateResponse.statusCode).toBe(200)
    expect(parseJson<ApiSuccess<StudentDto>>(updateResponse).data.studentCode).toBe('A002')

    const invalidFkResponse = await ctx.app.inject({
      method: 'POST',
      url: '/api/students',
      payload: {
        classroomId: 'cls_missing',
        firstName: 'Bia',
        middleName: '',
        lastName: 'Souza',
        studentCode: 'B001',
      },
    })
    expect(invalidFkResponse.statusCode).toBe(404)
    expect(parseJson<ApiFailure>(invalidFkResponse).error).toMatchObject({
      code: 'NOT_FOUND',
      details: { cause: 'CLASSROOM_NOT_FOUND' },
    })

    const deleteResponse = await ctx.app.inject({ method: 'DELETE', url: `/api/students/${student.id}` })
    expect(deleteResponse.statusCode).toBe(200)
    expect(parseJson<ApiSuccess<StudentDto>>(deleteResponse).data.id).toBe(student.id)
  })

  it('covers template create, list, get, update and validation contracts', async () => {
    const unit = await createUnit(ctx.app)
    const classroom = await createClassroom(ctx.app, unit.id)
    const exam = await createExam(ctx.app, classroom.id)
    const templatePayload = buildTemplatePayload({ examId: exam.id })

    const createResponse = await ctx.app.inject({ method: 'POST', url: '/api/templates', payload: templatePayload })
    expect(createResponse.statusCode).toBe(201)
    const template = parseJson<ApiSuccess<TemplateDto>>(createResponse).data
    expect(template.version).toBe('v1')
    expect(template.definition.questionBlocks[1]).toMatchObject({
      sectionType: 'image',
      mimeType: 'image/webp',
      fileSize: 512,
      optimized: true,
      originalName: 'figura-original.png',
    })

    const listResponse = await ctx.app.inject({ method: 'GET', url: `/api/templates?examId=${exam.id}` })
    expect(parseJson<ApiSuccess<TemplateDto[]>>(listResponse).data).toHaveLength(1)

    const getResponse = await ctx.app.inject({ method: 'GET', url: `/api/templates/${template.id}` })
    expect(parseJson<ApiSuccess<TemplateDto>>(getResponse).data.id).toBe(template.id)

    const updateResponse = await ctx.app.inject({
      method: 'PUT',
      url: `/api/templates/${template.id}`,
      payload: buildTemplatePayload({ examId: exam.id, name: 'Template contrato atualizado' }),
    })
    expect(updateResponse.statusCode).toBe(200)
    expect(parseJson<ApiSuccess<TemplateDto>>(updateResponse).data.version).toBe('v2')

    const invalidExamResponse = await ctx.app.inject({
      method: 'POST',
      url: '/api/templates',
      payload: buildTemplatePayload({ examId: 'exam_missing' }),
    })
    expect(invalidExamResponse.statusCode).toBe(404)
    expect(parseJson<ApiFailure>(invalidExamResponse).error).toMatchObject({
      code: 'NOT_FOUND',
      details: { cause: 'EXAM_NOT_FOUND' },
    })

    const invalidTotalResponse = await ctx.app.inject({
      method: 'POST',
      url: '/api/templates',
      payload: { ...buildTemplatePayload({ examId: exam.id }), totalQuestions: 3 },
    })
    expect(invalidTotalResponse.statusCode).toBe(400)
    expect(parseJson<ApiFailure>(invalidTotalResponse).error).toMatchObject({
      code: 'REQUEST_ERROR',
      details: { cause: 'EXAM_TEMPLATE_TOTAL_MISMATCH' },
    })
  })

  it('covers answer key create, list, get and validation contracts', async () => {
    const { exam, template } = await createCoreData(ctx.app)
    const answerKey = await createAnswerKey(ctx.app, exam.id, template.id)

    expect(answerKey.id).toMatch(/^key_/)
    expect(answerKey.answers).toEqual(['A', 'B'])

    const listResponse = await ctx.app.inject({
      method: 'GET',
      url: `/api/answer-keys?examId=${exam.id}&templateId=${template.id}`,
    })
    expect(parseJson<ApiSuccess<AnswerKeyDto[]>>(listResponse).data).toHaveLength(2)

    const getResponse = await ctx.app.inject({ method: 'GET', url: `/api/answer-keys/${answerKey.id}` })
    expect(parseJson<ApiSuccess<AnswerKeyDto>>(getResponse).data.id).toBe(answerKey.id)

    const detailedResponse = await ctx.app.inject({
      method: 'POST',
      url: '/api/answer-keys',
      payload: {
        name: 'Gabarito com pesos',
        examId: exam.id,
        templateId: template.id,
        answers: ['A', 'B'],
        defaultWeight: 1,
        totalScore: 1.5,
        questions: [
          {
            questionNumber: 1,
            questionType: 'objective',
            questionKind: 'ae',
            sourceSectionId: 'section-objective-1',
            sourceSectionTitle: 'Objetivas',
            validOptions: ['A', 'B', 'C', 'D', 'E'],
            correctAnswer: 'A',
            score: 1,
            weight: 1,
            status: 'active',
          },
          {
            questionNumber: 2,
            questionType: 'objective',
            questionKind: 'ae',
            sourceSectionId: 'section-objective-1',
            sourceSectionTitle: 'Objetivas',
            validOptions: ['A', 'B', 'C', 'D', 'E'],
            correctAnswer: null,
            score: 0.5,
            weight: 0.5,
            status: 'annulled',
          },
        ],
      },
    })
    expect(detailedResponse.statusCode).toBe(201)
    const detailedAnswerKey = parseJson<ApiSuccess<AnswerKeyDto>>(detailedResponse).data
    expect(detailedAnswerKey.defaultWeight).toBe(1)
    expect(detailedAnswerKey.totalScore).toBe(1.5)
    expect(detailedAnswerKey.questions?.[1]).toMatchObject({
      questionNumber: 2,
      correctAnswer: null,
      score: 0.5,
      weight: 0.5,
      status: 'annulled',
    })

    const invalidSizeResponse = await ctx.app.inject({
      method: 'POST',
      url: '/api/answer-keys',
      payload: { name: 'Curto', examId: exam.id, templateId: template.id, answers: ['A'] },
    })
    expect(invalidSizeResponse.statusCode).toBe(400)
    expect(parseJson<ApiFailure>(invalidSizeResponse).error).toMatchObject({
      code: 'REQUEST_ERROR',
      details: { cause: 'ANSWER_KEY_SIZE_MISMATCH' },
    })

    const invalidExamResponse = await ctx.app.inject({
      method: 'POST',
      url: '/api/answer-keys',
      payload: { name: 'Sem prova', examId: 'exam_missing', templateId: template.id, answers: ['A', 'B'] },
    })
    expect(invalidExamResponse.statusCode).toBe(404)
    expect(parseJson<ApiFailure>(invalidExamResponse).error).toMatchObject({
      code: 'NOT_FOUND',
      details: { cause: 'EXAM_NOT_FOUND' },
    })
  })

  it('updates an existing answer key and preserves math, discursiva and redacao metadata', async () => {
    const unit = await createUnit(ctx.app)
    const classroom = await createClassroom(ctx.app, unit.id)
    const examResponse = await ctx.app.inject({
      method: 'POST',
      url: '/api/exams',
      payload: { classroomId: classroom.id, title: 'Simulado especial', subject: 'Matematica', totalQuestions: 4 },
    })
    const exam = parseJson<ApiSuccess<ExamDto>>(examResponse).data

    const templatePayload = buildTemplatePayload({ examId: exam.id, totalQuestions: 4, name: 'Template especial' })
    const specialTemplateResponse = await ctx.app.inject({
      method: 'POST',
      url: '/api/templates',
      payload: {
        ...templatePayload,
        definition: {
          ...templatePayload.definition,
          totalQuestions: 4,
          questionBlocks: [
            {
              id: 'section-objective-ce',
              sectionType: 'objective',
              readMode: 'answers',
              startQuestion: 1,
              endQuestion: 1,
              title: 'C/E',
              choicesPerQuestion: 2,
              optionLabels: ['C', 'E'],
              numberingFormat: 'numeric',
            },
            {
              id: 'section-objective-abcd',
              sectionType: 'objective',
              readMode: 'answers',
              startQuestion: 2,
              endQuestion: 2,
              title: 'ABCD',
              choicesPerQuestion: 4,
              optionLabels: ['A', 'B', 'C', 'D'],
              numberingFormat: 'numeric',
            },
            {
              id: 'section-math',
              sectionType: 'math',
              readMode: 'manual',
              columns: 4,
              showTopInputRow: true,
              showColumnHeaders: false,
              columnHeaders: ['', '', '', ''],
              showColumnSeparators: true,
              columnSeparators: ['', ',', '.', '-'],
              linkedToMainQuestion: false,
              linkedQuestionNumber: null,
              markerLabel: 'TIPO B',
            },
            {
              id: 'section-open',
              sectionType: 'open',
              readMode: 'manual',
              label: 'Resposta discursiva',
              lines: 6,
              lineStyle: 'line',
              linkedToMainQuestion: false,
              linkedQuestionNumber: null,
              markerLabel: 'TIPO D',
            },
            {
              id: 'section-essay',
              sectionType: 'essay',
              readMode: 'manual',
              title: 'Redacao oficial',
              style: 'lines',
              lines: 20,
              highlightStep: 5,
              showHeader: true,
              showEssayTitleField: true,
              showStudentName: true,
              showClass: true,
              showTestName: true,
              showCode: true,
              showTeacher: false,
              showShift: false,
              showDate: false,
              showLogo: false,
              logoPosition: 'top-left',
              showQRCode: false,
              qrPosition: 'bottom-right',
            },
          ],
        },
      },
    })
    const template = parseJson<ApiSuccess<TemplateDto>>(specialTemplateResponse).data

    const createResponse = await ctx.app.inject({
      method: 'POST',
      url: '/api/answer-keys',
      payload: {
        name: 'Gabarito especial',
        examId: exam.id,
        templateId: template.id,
        answers: ['C', 'A', 'A', 'A'],
        defaultScore: 0.25,
        defaultWeight: 1,
        totalScore: 4.25,
        essayMaxScore: 2,
        questions: [
          {
            questionNumber: 1,
            questionType: 'objective',
            questionKind: 'ce',
            sourceSectionId: 'section-objective-ce',
            sourceSectionTitle: 'C/E',
            groupKey: 'objective:ce',
            groupLabel: 'C/E',
            validOptions: ['C', 'E'],
            correctAnswer: 'C',
            score: 0.1,
            weight: 1,
            status: 'active',
          },
          {
            questionNumber: 2,
            questionType: 'objective',
            questionKind: 'ad',
            sourceSectionId: 'section-objective-abcd',
            sourceSectionTitle: 'ABCD',
            groupKey: 'objective:abcd',
            groupLabel: 'ABCD',
            validOptions: ['A', 'B', 'C', 'D'],
            correctAnswer: 'A',
            score: 0.2,
            weight: 2,
            status: 'active',
          },
          {
            questionNumber: 5,
            questionType: 'math',
            questionKind: 'math',
            sourceSectionId: 'section-math',
            sourceSectionTitle: 'Matematica / Tipo B',
            markerLabel: 'TIPO B',
            groupKey: 'math:TIPO B',
            groupLabel: 'Matemática / TIPO B',
            validOptions: [],
            correctAnswer: '12,-',
            allowedCharacters: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '.', '-'],
            responseColumns: 4,
            score: 1.25,
            weight: 1,
            status: 'manual',
          },
          {
            questionNumber: 6,
            questionType: 'open',
            questionKind: 'open',
            sourceSectionId: 'section-open',
            sourceSectionTitle: 'Discursiva / Tipo D',
            markerLabel: 'TIPO D',
            groupKey: 'open:TIPO D',
            groupLabel: 'Discursiva / TIPO D',
            validOptions: [],
            correctAnswer: null,
            score: 0.7,
            weight: 1,
            maxScore: 0.7,
            status: 'manual',
          },
          {
            questionNumber: 7,
            questionType: 'essay',
            questionKind: 'essay',
            sourceSectionId: 'section-essay',
            sourceSectionTitle: 'Redacao',
            groupKey: 'essay:redacao',
            groupLabel: 'Redação',
            validOptions: [],
            correctAnswer: null,
            score: 2,
            weight: 1,
            maxScore: 2,
            status: 'manual',
          },
        ],
      },
    })
    expect(createResponse.statusCode).toBe(201)
    const createdKey = parseJson<ApiSuccess<AnswerKeyDto>>(createResponse).data

    const updateResponse = await ctx.app.inject({
      method: 'PUT',
      url: `/api/answer-keys/${createdKey.id}`,
      payload: {
        name: 'Gabarito especial atualizado',
        examId: exam.id,
        templateId: template.id,
        answers: ['E', 'B', 'A', 'A'],
        defaultScore: 0.5,
        defaultWeight: 1.25,
        totalScore: 5.6,
        essayMaxScore: 2.5,
        questions: [
          {
            questionNumber: 1,
            questionType: 'objective',
            questionKind: 'ce',
            sourceSectionId: 'section-objective-ce',
            sourceSectionTitle: 'C/E',
            groupKey: 'objective:ce',
            groupLabel: 'C/E',
            validOptions: ['C', 'E'],
            correctAnswer: 'E',
            score: 0.15,
            weight: 1,
            status: 'active',
          },
          {
            questionNumber: 2,
            questionType: 'objective',
            questionKind: 'ad',
            sourceSectionId: 'section-objective-abcd',
            sourceSectionTitle: 'ABCD',
            groupKey: 'objective:abcd',
            groupLabel: 'ABCD',
            validOptions: ['A', 'B', 'C', 'D'],
            correctAnswer: 'B',
            score: 0.2,
            weight: 3,
            status: 'active',
          },
          {
            questionNumber: 5,
            questionType: 'math',
            questionKind: 'math',
            sourceSectionId: 'section-math',
            sourceSectionTitle: 'Matematica / Tipo B',
            markerLabel: 'TIPO B',
            groupKey: 'math:TIPO B',
            groupLabel: 'Matemática / TIPO B',
            validOptions: [],
            correctAnswer: '12.3',
            allowedCharacters: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '.', '-'],
            responseColumns: 4,
            score: 1.4,
            weight: 1,
            status: 'manual',
          },
          {
            questionNumber: 6,
            questionType: 'open',
            questionKind: 'open',
            sourceSectionId: 'section-open',
            sourceSectionTitle: 'Discursiva / Tipo D',
            markerLabel: 'TIPO D',
            groupKey: 'open:TIPO D',
            groupLabel: 'Discursiva / TIPO D',
            validOptions: [],
            correctAnswer: null,
            score: 0.75,
            weight: 1,
            maxScore: 0.75,
            status: 'manual',
          },
          {
            questionNumber: 7,
            questionType: 'essay',
            questionKind: 'essay',
            sourceSectionId: 'section-essay',
            sourceSectionTitle: 'Redacao',
            groupKey: 'essay:redacao',
            groupLabel: 'Redação',
            validOptions: [],
            correctAnswer: null,
            score: 2.5,
            weight: 1,
            maxScore: 2.5,
            status: 'manual',
          },
        ],
      },
    })

    expect(updateResponse.statusCode).toBe(200)
    const updatedKey = parseJson<ApiSuccess<AnswerKeyDto>>(updateResponse).data
    expect(updatedKey.name).toBe('Gabarito especial atualizado')
    expect(updatedKey.answers).toEqual(['E', 'B', 'A', 'A'])
    expect(updatedKey.defaultScore).toBe(0.5)
    expect(updatedKey.defaultWeight).toBe(1.25)
    expect(updatedKey.totalScore).toBe(5.6)
    expect(updatedKey.essayMaxScore).toBe(2.5)
    expect(updatedKey.updatedAt).toEqual(expect.any(String))
    expect(updatedKey.questions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          questionType: 'math',
          correctAnswer: '12.3',
          responseColumns: 4,
          score: 1.4,
          allowedCharacters: expect.arrayContaining([',', '.', '-']),
        }),
        expect.objectContaining({
          questionType: 'open',
          maxScore: 0.75,
          score: 0.75,
        }),
        expect.objectContaining({
          questionType: 'essay',
          maxScore: 2.5,
          score: 2.5,
        }),
      ]),
    )

    const getResponse = await ctx.app.inject({ method: 'GET', url: `/api/answer-keys/${createdKey.id}` })
    expect(getResponse.statusCode).toBe(200)
    const persistedKey = parseJson<ApiSuccess<AnswerKeyDto>>(getResponse).data
    expect(persistedKey).toMatchObject({
      id: createdKey.id,
      name: 'Gabarito especial atualizado',
      essayMaxScore: 2.5,
      defaultScore: 0.5,
      defaultWeight: 1.25,
    })
  })

  it('covers upload contracts and keeps invalid files out of persistent storage', async () => {
    const { exam, student } = await createCoreData(ctx.app)

    const validResponse = await uploadFile(ctx.app, {
      examId: exam.id,
      studentId: student.id,
      filename: 'cartao.jpg',
      contentType: 'image/jpeg',
      content: Buffer.from('valid-jpeg-contract'),
    })
    expect(validResponse.statusCode).toBe(201)
    const upload = parseJson<ApiSuccess<UploadDto>>(validResponse).data
    expect(upload.id).toMatch(/^upl_/)
    expect(upload.mimeType).toBe('image/jpeg')
    expect(fs.existsSync(upload.path)).toBe(true)

    const invalidMimeResponse = await uploadFile(ctx.app, {
      examId: exam.id,
      studentId: student.id,
      filename: 'cartao.txt',
      contentType: 'text/plain',
      content: 'invalid',
    })
    expect(invalidMimeResponse.statusCode).toBe(400)
    expect(parseJson<ApiFailure>(invalidMimeResponse).error).toMatchObject({
      code: 'UPLOAD_INVALID',
      message: expect.stringContaining('10 MB'),
      details: { cause: 'INVALID_UPLOAD_FILE' },
    })

    const invalidExtensionResponse = await uploadFile(ctx.app, {
      examId: exam.id,
      studentId: student.id,
      filename: 'cartao.exe',
      contentType: 'image/png',
      content: 'invalid-extension',
    })
    expect(invalidExtensionResponse.statusCode).toBe(400)
    expect(parseJson<ApiFailure>(invalidExtensionResponse).error.code).toBe('UPLOAD_INVALID')

    const oversizedResponse = await uploadFile(ctx.app, {
      examId: exam.id,
      studentId: student.id,
      filename: 'grande.png',
      contentType: 'image/png',
      content: Buffer.alloc(10 * 1024 * 1024 + 1, 1),
    })
    expect(oversizedResponse.statusCode).toBe(413)
    expect(parseJson<ApiFailure>(oversizedResponse).error.code).toBe('PAYLOAD_TOO_LARGE')

    const listResponse = await ctx.app.inject({ method: 'GET', url: `/api/uploads?examId=${exam.id}` })
    expect(parseJson<ApiSuccess<UploadDto[]>>(listResponse).data).toHaveLength(1)

    const storedFiles = fs.readdirSync(ctx.uploadDir).filter((file) => !file.endsWith('.tmp'))
    expect(storedFiles).toHaveLength(1)
  })
})
