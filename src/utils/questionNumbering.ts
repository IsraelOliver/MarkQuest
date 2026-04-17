import type { CardNumberingFormat, CardTemplateDefinition } from '../types/omr'

type QuestionLabelInput = {
  questionNumber: number
  columnIndex: number
  rowIndex: number
}

type QuestionLabelContext = {
  choicesPerQuestion?: CardTemplateDefinition['choicesPerQuestion']
  blockStartQuestion?: number
  localQuestionIndex?: number
}

function getAlphabeticSuffix(index: number, lowercase = false) {
  let value = Math.max(0, Math.floor(index))
  let suffix = ''

  do {
    suffix = String.fromCharCode(65 + (value % 26)) + suffix
    value = Math.floor(value / 26) - 1
  } while (value >= 0)

  return lowercase ? suffix.toLowerCase() : suffix
}

export function formatQuestionLabel(
  numberingFormat: CardNumberingFormat,
  question: QuestionLabelInput,
  context?: QuestionLabelContext,
) {
  const choicesPerQuestion =
    context?.choicesPerQuestion === 2 ||
    context?.choicesPerQuestion === 3 ||
    context?.choicesPerQuestion === 4
      ? context.choicesPerQuestion
      : 5
  const blockStartQuestion = Math.max(1, Math.round(context?.blockStartQuestion ?? question.questionNumber))
  const localQuestionIndex = Math.max(0, Math.floor(context?.localQuestionIndex ?? question.questionNumber - blockStartQuestion))
  const legacySequenceIndex = Math.max(0, question.questionNumber - 1)
  const legacySequenceNumber = Math.floor(legacySequenceIndex / choicesPerQuestion) + 1
  const blockBaseNumber = blockStartQuestion
  const upperSuffix = getAlphabeticSuffix(localQuestionIndex)
  const lowerSuffix = getAlphabeticSuffix(localQuestionIndex, true)

  switch (numberingFormat) {
    case 'numericAlpha':
      return `${blockBaseNumber}${upperSuffix}`
    case 'alphaNumeric':
      return `${question.questionNumber}A`
    case 'numericLower':
      return `${blockBaseNumber}${lowerSuffix}`
    case 'numericDash':
      return `${blockBaseNumber}-${lowerSuffix}`
    default:
      return String(question.questionNumber || legacySequenceNumber)
  }
}
