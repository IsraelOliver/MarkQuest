const STORAGE_KEYS = {
  unitId: 'markquest.selectedUnitId',
  classroomId: 'markquest.selectedClassroomId',
  examId: 'markquest.selectedExamId',
} as const

function readStorage(key: string) {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem(key) ?? ''
}

function writeStorage(key: string, value: string) {
  if (typeof window === 'undefined') return

  if (value) {
    window.localStorage.setItem(key, value)
    return
  }

  window.localStorage.removeItem(key)
}

export function getSelectedUnitId() {
  return readStorage(STORAGE_KEYS.unitId)
}

export function setSelectedUnitId(value: string) {
  writeStorage(STORAGE_KEYS.unitId, value)
}

export function getSelectedClassroomId() {
  return readStorage(STORAGE_KEYS.classroomId)
}

export function setSelectedClassroomId(value: string) {
  writeStorage(STORAGE_KEYS.classroomId, value)
}

export function getSelectedExamId() {
  return readStorage(STORAGE_KEYS.examId)
}

export function setSelectedExamId(value: string) {
  writeStorage(STORAGE_KEYS.examId, value)
}
