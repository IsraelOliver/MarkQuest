import type { UploadFile } from '../types/entities.js'
import { db } from '../repositories/in-memory.repository.js'
import { generateId } from '../utils/id.js'

type CreateUploadInput = {
  examId: string
  studentId: string
  originalName: string
  storedName: string
  path: string
  mimeType: string
  size: number
}

export class UploadService {
  createUpload(input: CreateUploadInput): UploadFile {
    const upload: UploadFile = {
      id: generateId('upl'),
      examId: input.examId,
      studentId: input.studentId,
      originalName: input.originalName,
      storedName: input.storedName,
      path: input.path,
      mimeType: input.mimeType,
      size: input.size,
      createdAt: new Date().toISOString(),
    }

    db.uploads.push(upload)
    db.persist()
    return upload
  }

  listUploads(): UploadFile[] {
    return db.uploads
  }
}
