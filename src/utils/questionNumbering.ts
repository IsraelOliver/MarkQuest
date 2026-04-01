import type { CardNumberingFormat, CardTemplateDefinition } from '../types/omr'

type QuestionLabelInput = {
  questionNumber: number
  columnIndex: number
  rowIndex: number
}

export function formatQuestionLabel(
  numberingFormat: CardNumberingFormat,
  question: QuestionLabelInput,
  definition?: Pick<CardTemplateDefinition, 'choicesPerQuestion'>,
) {
  const choicesPerQuestion =
    definition?.choicesPerQuestion === 2 ||
    definition?.choicesPerQuestion === 3 ||
    definition?.choicesPerQuestion === 4
      ? definition.choicesPerQuestion
      : 5
  const sequenceIndex = Math.max(0, question.questionNumber - 1)
  const sequenceNumber = Math.floor(sequenceIndex / choicesPerQuestion) + 1
  const optionIndex = sequenceIndex % choicesPerQuestion
  const upperSuffix = String.fromCharCode(65 + optionIndex)
  const lowerSuffix = upperSuffix.toLowerCase()

  switch (numberingFormat) {
    case 'numericAlpha':
      return `${sequenceNumber}${upperSuffix}`
    case 'alphaNumeric':
      return `${question.questionNumber}A`
    case 'numericLower':
      return `${sequenceNumber}${lowerSuffix}`
    case 'numericDash':
      return `${sequenceNumber}-${lowerSuffix}`
    default:
      return String(question.questionNumber)
  }
}
