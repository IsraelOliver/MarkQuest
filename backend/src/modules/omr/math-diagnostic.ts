import type { AnswerKeyQuestion, OMRUploadProcessingReport } from '../../types/entities.js'

type MathDiagnosticStatus = NonNullable<OMRUploadProcessingReport['mathReadReports']>[number]['diagnosticStatus']

function normalizeMathDiagnosticAnswer(value: string | null | undefined) {
  return typeof value === 'string' ? value.trim() : ''
}

export function compareMathReadWithAnswerKey(params: {
  detectedAnswer: string
  multipleMarkedColumns: number[]
  answerKeyQuestion?: Pick<AnswerKeyQuestion, 'correctAnswer'> | null
}): {
  expectedAnswer: string | null
  detectedAnswer: string
  diagnosticMatch: boolean | null
  diagnosticStatus: MathDiagnosticStatus
  diagnosticWarnings: string[]
} {
  const detectedAnswer = normalizeMathDiagnosticAnswer(params.detectedAnswer)
  const expectedAnswer = normalizeMathDiagnosticAnswer(params.answerKeyQuestion?.correctAnswer)

  if (!expectedAnswer) {
    return {
      expectedAnswer: null,
      detectedAnswer,
      diagnosticMatch: null,
      diagnosticStatus: 'missingAnswerKey',
      diagnosticWarnings: ['Questão tipo B sem resposta cadastrada no gabarito para comparação diagnóstica.'],
    }
  }

  if (params.multipleMarkedColumns.length > 0) {
    return {
      expectedAnswer,
      detectedAnswer,
      diagnosticMatch: false,
      diagnosticStatus: 'ambiguous',
      diagnosticWarnings: ['Leitura tipo B com múltiplas marcações por coluna; comparação diagnóstica marcada como ambígua.'],
    }
  }

  if (!detectedAnswer) {
    return {
      expectedAnswer,
      detectedAnswer,
      diagnosticMatch: false,
      diagnosticStatus: 'blank',
      diagnosticWarnings: ['Leitura tipo B sem resposta detectada; comparação diagnóstica marcada como em branco.'],
    }
  }

  if (detectedAnswer === expectedAnswer) {
    return {
      expectedAnswer,
      detectedAnswer,
      diagnosticMatch: true,
      diagnosticStatus: 'match',
      diagnosticWarnings: [],
    }
  }

  return {
    expectedAnswer,
    detectedAnswer,
    diagnosticMatch: false,
    diagnosticStatus: 'mismatch',
    diagnosticWarnings: ['Resposta lida da questão tipo B difere da resposta esperada cadastrada no gabarito.'],
  }
}
