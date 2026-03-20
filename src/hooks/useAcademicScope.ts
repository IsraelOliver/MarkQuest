import { useEffect, useState } from 'react'
import { academicService } from '../services/academicService'
import type { Classroom, Exam, Student, Unit } from '../types/omr'
import {
  getSelectedClassroomId,
  getSelectedExamId,
  getSelectedUnitId,
  setSelectedClassroomId,
  setSelectedExamId,
  setSelectedUnitId,
} from '../utils/domainSelection'

type AcademicScopeState = {
  isLoading: boolean
  units: Unit[]
  classrooms: Classroom[]
  exams: Exam[]
  students: Student[]
  selectedUnit?: Unit
  selectedClassroom?: Classroom
  selectedExam?: Exam
  refresh: () => Promise<void>
}

export function useAcademicScope(): AcademicScopeState {
  const [isLoading, setIsLoading] = useState(true)
  const [units, setUnits] = useState<Unit[]>([])
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [exams, setExams] = useState<Exam[]>([])
  const [students, setStudents] = useState<Student[]>([])

  const refresh = async () => {
    setIsLoading(true)

    try {
      const [nextUnits, nextClassrooms, nextExams, nextStudents] = await Promise.all([
        academicService.getUnits(),
        academicService.getClassrooms(),
        academicService.getExams(),
        academicService.getStudents(),
      ])

      setUnits(nextUnits)
      setClassrooms(nextClassrooms)
      setExams(nextExams)
      setStudents(nextStudents)

      const storedUnitId = getSelectedUnitId()
      const storedClassroomId = getSelectedClassroomId()
      const storedExamId = getSelectedExamId()

      const selectedExam = nextExams.find((item) => item.id === storedExamId) ?? nextExams[0]
      const selectedClassroom =
        nextClassrooms.find((item) => item.id === storedClassroomId) ??
        nextClassrooms.find((item) => item.id === selectedExam?.classroomId) ??
        nextClassrooms[0]
      const selectedUnit =
        nextUnits.find((item) => item.id === storedUnitId) ??
        nextUnits.find((item) => item.id === selectedClassroom?.unitId) ??
        nextUnits[0]

      setSelectedUnitId(selectedUnit?.id ?? '')
      setSelectedClassroomId(selectedClassroom?.id ?? '')
      setSelectedExamId(selectedExam?.id ?? '')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  const selectedUnit = units.find((item) => item.id === getSelectedUnitId())
  const selectedClassroom = classrooms.find((item) => item.id === getSelectedClassroomId())
  const selectedExam = exams.find((item) => item.id === getSelectedExamId())

  return {
    isLoading,
    units,
    classrooms,
    exams,
    students,
    selectedUnit,
    selectedClassroom,
    selectedExam,
    refresh,
  }
}
