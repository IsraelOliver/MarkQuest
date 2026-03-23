import type { CardNumberingMode, CardNumberingPattern } from '../types/omr'

type QuestionLabelInput = {
  questionNumber: number
  columnIndex: number
  rowIndex: number
}

export function formatQuestionLabel(
  numberingMode: CardNumberingMode,
  numberingPattern: CardNumberingPattern,
  question: QuestionLabelInput,
) {
  if (numberingMode === 'by-block') {
    const suffix = String.fromCharCode(65 + question.columnIndex)

    if (numberingPattern === 'sequence-column') {
      return `${question.questionNumber}${suffix}`
    }

    return `${question.rowIndex + 1}${suffix}`
  }

  return String(question.questionNumber)
}
