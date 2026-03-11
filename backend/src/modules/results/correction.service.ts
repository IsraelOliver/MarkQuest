import type { AnswerKey, OMRResultAnswer } from '../../types/entities.js'
import type { OMRDetectionOutput } from '../omr/omr.types.js'

export function correctAnswers(input: {
  detection: OMRDetectionOutput
  answerKey: AnswerKey
}): {
  answers: OMRResultAnswer[]
  totalCorrect: number
  totalIncorrect: number
  score: number
  confidenceAverage: number
} {
  const answers: OMRResultAnswer[] = []
  let totalCorrect = 0
  let totalIncorrect = 0
  let confidenceSum = 0

  for (const item of input.detection.answers) {
    const correctOption = input.answerKey.answers[item.questionNumber - 1] ?? null

    let status: OMRResultAnswer['status']
    if (item.status === 'blank') status = 'blank'
    else if (item.status === 'multiple') status = 'multiple'
    else if (item.selectedOption === correctOption) status = 'correct'
    else status = 'incorrect'

    if (status === 'correct') totalCorrect += 1
    else totalIncorrect += 1

    confidenceSum += item.confidence

    answers.push({
      questionNumber: item.questionNumber,
      selectedOption: item.selectedOption,
      correctOption,
      status,
      confidence: item.confidence,
      fillByOption: item.fillByOption,
    })
  }

  const totalQuestions = input.detection.totalQuestions || 1
  const score = Math.round((totalCorrect / totalQuestions) * 100)
  const confidenceAverage = Number((confidenceSum / totalQuestions).toFixed(4))

  return { answers, totalCorrect, totalIncorrect, score, confidenceAverage }
}
