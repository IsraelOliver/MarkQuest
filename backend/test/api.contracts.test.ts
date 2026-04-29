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
