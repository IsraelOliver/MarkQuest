import {
  answerKeysMock,
  answerSheetsMock,
  omrResultsMock,
  processingJobsMock,
  studentResultsMock,
  templatesMock,
} from '../data/omrMock'
import type { AnswerKey, AnswerSheet, OMRResult, ProcessingJob, StudentResult, Template } from '../types/omr'
import { API_ENDPOINTS, request } from './apiClient'

export const omrService = {
  async createUpload(payload: {
    examId: string
    files: string[]
  }): Promise<{ endpoint: string; totalFiles: number; items: AnswerSheet[] }> {
    await request(API_ENDPOINTS.uploads, { method: 'POST', body: payload })
    return {
      endpoint: API_ENDPOINTS.uploads,
      totalFiles: payload.files.length,
      items: answerSheetsMock,
    }
  },

  async processUpload(payload: { examId: string; sheetIds: string[] }): Promise<{ endpoint: string; job: ProcessingJob }> {
    await request(API_ENDPOINTS.processOMR, { method: 'POST', body: payload })
    return { endpoint: API_ENDPOINTS.processOMR, job: processingJobsMock[0] }
  },

  async getResults(): Promise<{ endpoint: string; omr: OMRResult[]; students: StudentResult[] }> {
    await request(API_ENDPOINTS.results, { method: 'GET' })
    return { endpoint: API_ENDPOINTS.results, omr: omrResultsMock, students: studentResultsMock }
  },

  async createTemplate(payload: { name: string; examId: string }): Promise<{ endpoint: string; item: Template }> {
    await request(API_ENDPOINTS.templates, { method: 'POST', body: payload })
    return { endpoint: API_ENDPOINTS.templates, item: templatesMock[0] }
  },

  async createAnswerKey(payload: { examId: string; answers: string[] }): Promise<{ endpoint: string; item: AnswerKey }> {
    await request(API_ENDPOINTS.answerKeys, { method: 'POST', body: payload })
    return { endpoint: API_ENDPOINTS.answerKeys, item: answerKeysMock[0] }
  },
}
