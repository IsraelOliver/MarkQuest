import { db } from '../repositories/in-memory.repository.js'

export class ResultsService {
  listAll() {
    return {
      jobs: db.jobs,
      omrResults: db.results,
      studentResults: db.studentResults,
      totalProcessedCards: db.results.length,
    }
  }

  getByJobId(id: string) {
    const job = db.jobs.find((item) => item.id === id)
    if (!job) return null

    const omrResults = db.results.filter((item) => item.jobId === id)
    const studentResults = db.studentResults.filter((item) => omrResults.some((res) => res.id === item.omrResultId))

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
