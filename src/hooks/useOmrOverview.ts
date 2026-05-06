import { useEffect, useState } from 'react'
import { processingJobsMock } from '../data/omrMock'
import { useAcademicScope } from './useAcademicScope'
import { omrService } from '../services/omrService'
import type { ProcessingJob, StudentResult } from '../types/omr'
import { formatApiErrorMessage } from '../utils/display'

type OverviewState = {
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
  lastJob?: ProcessingJob
  studentResults: StudentResult[]
  counters: {
    uploadedSheets: number
    templates: number
    answerKeys: number
  }
}

export function useOmrOverview(): OverviewState {
  const { selectedExam } = useAcademicScope()
  const [isLoading, setIsLoading] = useState(true)
  const [studentResults, setStudentResults] = useState<StudentResult[]>([])
  const [lastJob, setLastJob] = useState<ProcessingJob | undefined>(processingJobsMock[processingJobsMock.length - 1])
  const [error, setError] = useState<string | null>(null)
  const [counters, setCounters] = useState({
    uploadedSheets: 0,
    templates: 0,
    answerKeys: 0,
  })

  const refresh = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [results, uploads, templates, answerKeys] = await Promise.all([
        omrService.getResults(),
        omrService.getUploads(),
        omrService.getTemplates(),
        omrService.getAnswerKeys(),
      ])

      const filteredJobs = results.jobs.filter((item) => item.examId === selectedExam?.id)
      const filteredStudents = results.students.filter((item) => item.examId === selectedExam?.id)
      const filteredUploads = uploads.items.filter((item) => item.examId === selectedExam?.id)
      const filteredTemplates = templates.items.filter((item) => item.examId === selectedExam?.id)
      const filteredAnswerKeys = answerKeys.items.filter((item) => item.examId === selectedExam?.id)

      setStudentResults(filteredStudents)
      setLastJob(filteredJobs[filteredJobs.length - 1])
      setCounters({
        uploadedSheets: filteredUploads.length,
        templates: filteredTemplates.length,
        answerKeys: filteredAnswerKeys.length,
      })
    } catch (loadError) {
      setError(formatApiErrorMessage('Nao foi possivel carregar a visao geral.', loadError))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [selectedExam?.id])

  return {
    isLoading,
    error,
    refresh,
    lastJob,
    studentResults,
    counters,
  }
}
