import { db } from '../repositories/in-memory.repository.js'

type ResultFilters = {
  examId?: string
  jobId?: string
}

export class ResultsService {
  listAll(filters?: ResultFilters) {
    const jobs = db.jobs.filter((item) => {
      if (filters?.examId && item.examId !== filters.examId) return false
      if (filters?.jobId && item.id !== filters.jobId) return false
      return true
    })

    const activeJobIds = new Set(jobs.map((item) => item.id))
    const omrResults = db.results.filter((item) => activeJobIds.has(item.jobId))
    const studentResults = db.studentResults.filter((item) => {
      if (filters?.examId && item.examId !== filters.examId) return false
      return omrResults.some((result) => result.id === item.omrResultId)
    })

    return {
      jobs,
      omrResults,
      studentResults,
      totalProcessedCards: omrResults.length,
    }
  }

  getByJobId(id: string) {
    const job = db.jobs.find((item) => item.id === id)
    if (!job) return null

    const omrResults = db.results.filter((item) => item.jobId === id)
    const studentResults = db.studentResults.filter((item) => omrResults.some((result) => result.id === item.omrResultId))

    return { job, omrResults, studentResults }
  }

  exportByJobId(id: string): string | null {
    const data = this.getByJobId(id)
    if (!data) return null

    const header = 'result_id,file_name,total_questions,correct,incorrect,score,confidence_average,processed_at'
    const rows = data.omrResults.map((item) =>
      [
        item.id,
        item.fileName,
        item.totalQuestions,
        item.totalCorrect,
        item.totalIncorrect,
        item.score,
        item.confidenceAverage,
        item.metadata.processedAt,
      ].join(','),
    )

    return [header, ...rows].join('\n')
  }
}
