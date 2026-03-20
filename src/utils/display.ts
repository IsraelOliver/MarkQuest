export function formatStudentLabel(studentId: string) {
  const normalized = studentId
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!normalized) return 'Aluno sem identificação'

  return normalized.replace(/\b\w/g, (char) => char.toUpperCase())
}

export function formatApiErrorMessage(fallback: string, error: unknown) {
  return error instanceof Error && error.message ? error.message : fallback
}
