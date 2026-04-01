export const DEFAULT_OPTION_LABEL_SETS = {
  2: ['C', 'E'],
  3: ['A', 'B', 'C'],
  4: ['A', 'B', 'C', 'D'],
  5: ['A', 'B', 'C', 'D', 'E'],
} as const

const OPTION_LABEL_PATTERN = /^[A-Z0-9]$/

export function isValidOptionLabel(value: string) {
  return OPTION_LABEL_PATTERN.test(value)
}

export function getDefaultOptionLabels(choicesPerQuestion: 2 | 3 | 4 | 5) {
  return [...DEFAULT_OPTION_LABEL_SETS[choicesPerQuestion]]
}

export function normalizeOptionLabels(optionLabels: string[] | undefined, choicesPerQuestion: 2 | 3 | 4 | 5) {
  const defaults = getDefaultOptionLabels(choicesPerQuestion)

  if (!optionLabels?.length) return defaults

  const normalized = optionLabels
    .map((value) => value.trim().toUpperCase().slice(0, 1))
    .slice(0, choicesPerQuestion)

  while (normalized.length < choicesPerQuestion) {
    normalized.push(defaults[normalized.length])
  }

  return normalized
}
