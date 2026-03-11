import { useEffect, useState } from 'react'
import { answerKeysMock, answerSheetsMock, processingJobsMock, templatesMock } from '../data/omrMock'
import { omrService } from '../services/omrService'
import type { ProcessingJob, StudentResult } from '../types/omr'

type OverviewState = {
  isLoading: boolean
  lastJob?: ProcessingJob
  studentResults: StudentResult[]
  counters: {
    uploadedSheets: number
    templates: number
    answerKeys: number
  }
}

export function useOmrOverview(): OverviewState {
  const [isLoading, setIsLoading] = useState(true)
  const [studentResults, setStudentResults] = useState<StudentResult[]>([])

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      const results = await omrService.getResults()
      setStudentResults(results.students)
      setIsLoading(false)
    }

    void load()
  }, [])

  return {
    isLoading,
    lastJob: processingJobsMock[processingJobsMock.length - 1],
    studentResults,
    counters: {
      uploadedSheets: answerSheetsMock.length,
      templates: templatesMock.length,
      answerKeys: answerKeysMock.length,
    },
  }
}
