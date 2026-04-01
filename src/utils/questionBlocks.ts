import type { CardQuestionBlock, CardQuestionStyle, CardTemplateDefinition } from '../types/omr'
import { isValidOptionLabel, normalizeOptionLabels } from './optionLabels'
import { clampQuestionTotal, MAX_QUESTIONS } from './questionLimits'

export type QuestionBlockSegment = {
  startQuestion: number
  endQuestion: number
  title: string
  blockIndex: number | null
}

type QuestionBlockFallbackConfig = Pick<CardTemplateDefinition, 'choicesPerQuestion' | 'optionLabels'> & {
  questionStyle: CardQuestionStyle
}

export type QuestionBlockQuestionConfig = {
  blockIndex: number | null
  block: CardQuestionBlock | null
  choicesPerQuestion: 2 | 3 | 4 | 5
  optionLabels: string[]
  questionStyle: CardQuestionStyle
}

export type NormalizedQuestionBlock = {
  id: string
  order: number
  title: string
  startQuestion: number
  endQuestion: number
  alternativesCount: 2 | 3 | 4 | 5
  alternativeLabels: string[]
  questionStyle: CardQuestionStyle
  questionNumbers: number[]
}

export type ResolvedQuestion = {
  questionNumber: number
  blockId: string
  blockOrder: number
  blockTitle: string
  alternativesCount: 2 | 3 | 4 | 5
  alternativeLabels: string[]
  questionStyle: CardQuestionStyle
}

export type NormalizedRenderModel = {
  blocks: NormalizedQuestionBlock[]
  questions: ResolvedQuestion[]
  totalRenderedQuestions: number
  lastRenderedQuestion: number
  hasGaps: boolean
  hasOverlap: boolean
  outOfRangeQuestions: number[]
  gapRanges: Array<{ startQuestion: number; endQuestion: number }>
  overlappingQuestions: number[]
}

function normalizeQuestionStyle(value: string | undefined, fallback: CardQuestionStyle) {
  return value === 'lined' || value === 'minimal' ? value : fallback
}

export function normalizeQuestionBlocks(
  blocks: CardQuestionBlock[] | undefined,
  totalQuestions: number,
  fallbackConfig: QuestionBlockFallbackConfig,
): CardQuestionBlock[] {
  return (blocks ?? [])
    .map((block) => ({
      startQuestion: Math.max(1, Math.round(block.startQuestion)),
      endQuestion: Math.max(1, Math.round(block.endQuestion)),
      title: block.title ?? '',
      choicesPerQuestion:
        block.choicesPerQuestion === 2 || block.choicesPerQuestion === 3 || block.choicesPerQuestion === 4
          ? block.choicesPerQuestion
          : fallbackConfig.choicesPerQuestion,
      optionLabels: normalizeOptionLabels(block.optionLabels, block.choicesPerQuestion ?? fallbackConfig.choicesPerQuestion),
      questionStyle: normalizeQuestionStyle(block.questionStyle, fallbackConfig.questionStyle),
    }))
    .map((block) => ({
      ...block,
      startQuestion: Math.min(block.startQuestion, totalQuestions),
      endQuestion: Math.min(block.endQuestion, totalQuestions),
      optionLabels: normalizeOptionLabels(block.optionLabels, block.choicesPerQuestion),
    }))
    .sort((left, right) => left.startQuestion - right.startQuestion)
}

export function getQuestionBlockAtStart(
  definition: Pick<CardTemplateDefinition, 'enableQuestionBlocks' | 'showQuestionBlockTitles' | 'questionBlocks'>,
  questionNumber: number,
) {
  if (!definition.enableQuestionBlocks || !definition.showQuestionBlockTitles) return null
  return definition.questionBlocks.find((block) => block.startQuestion === questionNumber) ?? null
}

export function validateQuestionBlocks(
  blocks: CardQuestionBlock[],
  totalQuestions: number,
  fallbackConfig: QuestionBlockFallbackConfig,
) {
  const issues: Array<{ code: string; message: string }> = []
  const sortedBlocks = normalizeQuestionBlocks(blocks, totalQuestions, fallbackConfig)

  sortedBlocks.forEach((block, index) => {
    if (block.startQuestion > block.endQuestion) {
      issues.push({
        code: `QUESTION_BLOCK_INVALID_RANGE_${index}`,
        message: `O bloco "${block.title}" tem início maior do que o fim.`,
      })
    }

    if (block.endQuestion > totalQuestions) {
      issues.push({
        code: `QUESTION_BLOCK_OUTSIDE_TOTAL_${index}`,
        message: `O bloco "${block.title}" ultrapassa o total de questões da prova.`,
      })
    }

    const nextBlock = sortedBlocks[index + 1]
    if (nextBlock && block.endQuestion >= nextBlock.startQuestion) {
      issues.push({
        code: `QUESTION_BLOCK_OVERLAP_${index}`,
        message: `Os blocos "${block.title}" e "${nextBlock.title}" possuem intervalos sobrepostos.`,
      })
    }

    if (block.optionLabels.length !== block.choicesPerQuestion) {
      issues.push({
        code: `QUESTION_BLOCK_OPTION_COUNT_${index}`,
        message: `O bloco "${block.title}" precisa ter a mesma quantidade de caracteres e alternativas.`,
      })
    }

    const invalidOptionLabels = block.optionLabels.filter((label) => !isValidOptionLabel(label))
    if (invalidOptionLabels.length) {
      issues.push({
        code: `QUESTION_BLOCK_OPTION_INVALID_${index}`,
        message: `O bloco "${block.title}" usa caracteres de alternativas inválidos.`,
      })
    }

    const duplicatedOptionLabels = new Set(
      block.optionLabels.filter((label, labelIndex) => block.optionLabels.indexOf(label) !== labelIndex),
    )
    if (duplicatedOptionLabels.size > 0) {
      issues.push({
        code: `QUESTION_BLOCK_OPTION_DUPLICATE_${index}`,
        message: `O bloco "${block.title}" repete caracteres de alternativas.`,
      })
    }
  })

  if (sortedBlocks.length) {
    const coveredQuestions = new Set<number>()
    sortedBlocks.forEach((block) => {
      for (let question = block.startQuestion; question <= block.endQuestion; question += 1) {
        coveredQuestions.add(question)
      }
    })

    if (coveredQuestions.size < totalQuestions) {
      issues.push({
        code: 'QUESTION_BLOCKS_WITH_GAPS',
        message: 'Existem questões fora dos blocos cadastrados.',
      })
    }
  }

  return issues
}

function getBlockSpan(block: CardQuestionBlock) {
  return Math.max(0, Math.round(block.endQuestion) - Math.round(block.startQuestion))
}

function buildGapRanges(renderedQuestions: number[]) {
  if (!renderedQuestions.length) return []

  const gapRanges: Array<{ startQuestion: number; endQuestion: number }> = []
  let cursor = 1

  renderedQuestions.forEach((questionNumber) => {
    if (questionNumber > cursor) {
      gapRanges.push({ startQuestion: cursor, endQuestion: questionNumber - 1 })
    }
    cursor = questionNumber + 1
  })

  return gapRanges
}

export function buildNormalizedRenderModel(
  definition: Pick<CardTemplateDefinition, 'enableQuestionBlocks' | 'questionBlocks' | 'totalQuestions' | 'choicesPerQuestion' | 'optionLabels'>,
  questionStyleFallback: CardQuestionStyle,
  maxQuestions = MAX_QUESTIONS,
): NormalizedRenderModel {
  const safeMaxQuestions = clampQuestionTotal(maxQuestions)
  const safeTotalQuestions = clampQuestionTotal(definition.totalQuestions)

  if (!definition.enableQuestionBlocks) {
    const alternativesCount = definition.choicesPerQuestion
    const alternativeLabels = normalizeOptionLabels(definition.optionLabels, alternativesCount)
    const questionNumbers = Array.from({ length: Math.min(safeTotalQuestions, safeMaxQuestions) }, (_, index) => index + 1)
    const block: NormalizedQuestionBlock = {
      id: 'global',
      order: 1,
      title: '',
      startQuestion: questionNumbers[0] ?? 1,
      endQuestion: questionNumbers[questionNumbers.length - 1] ?? safeTotalQuestions,
      alternativesCount,
      alternativeLabels,
      questionStyle: questionStyleFallback,
      questionNumbers,
    }

    return {
      blocks: [block],
      questions: questionNumbers.map((questionNumber) => ({
        questionNumber,
        blockId: block.id,
        blockOrder: block.order,
        blockTitle: block.title,
        alternativesCount,
        alternativeLabels,
        questionStyle: questionStyleFallback,
      })),
      totalRenderedQuestions: questionNumbers.length,
      lastRenderedQuestion: questionNumbers[questionNumbers.length - 1] ?? 0,
      hasGaps: false,
      hasOverlap: false,
      outOfRangeQuestions: [],
      gapRanges: [],
      overlappingQuestions: [],
    }
  }

  const normalizedBlocks = [...definition.questionBlocks]
    .map((block, originalIndex) => ({ block, originalIndex }))
    .sort((left, right) => left.block.startQuestion - right.block.startQuestion || left.originalIndex - right.originalIndex)

  const seenQuestions = new Set<number>()
  const outOfRangeQuestions = new Set<number>()
  const overlappingQuestions = new Set<number>()
  const resolvedQuestions: ResolvedQuestion[] = []
  const blocks: NormalizedQuestionBlock[] = []

  normalizedBlocks.forEach(({ block }, index) => {
    const clampedStart = Math.max(1, Math.round(block.startQuestion))
    const clampedEnd = Math.max(clampedStart, Math.round(block.endQuestion))
    const alternativesCount =
      block.choicesPerQuestion === 2 || block.choicesPerQuestion === 3 || block.choicesPerQuestion === 4 ? block.choicesPerQuestion : 5
    const alternativeLabels = normalizeOptionLabels(block.optionLabels, alternativesCount)
    const questionNumbers: number[] = []

    for (let questionNumber = clampedStart; questionNumber <= clampedEnd; questionNumber += 1) {
      if (questionNumber > safeMaxQuestions) {
        outOfRangeQuestions.add(questionNumber)
        continue
      }

      if (seenQuestions.has(questionNumber)) {
        overlappingQuestions.add(questionNumber)
        continue
      }

      seenQuestions.add(questionNumber)
      questionNumbers.push(questionNumber)
      resolvedQuestions.push({
        questionNumber,
        blockId: `block-${index + 1}`,
        blockOrder: index + 1,
        blockTitle: block.title ?? '',
        alternativesCount,
        alternativeLabels,
        questionStyle: normalizeQuestionStyle(block.questionStyle, questionStyleFallback),
      })
    }

    blocks.push({
      id: `block-${index + 1}`,
      order: index + 1,
      title: block.title ?? '',
      startQuestion: clampedStart,
      endQuestion: Math.min(clampedEnd, safeMaxQuestions),
      alternativesCount,
      alternativeLabels,
      questionStyle: normalizeQuestionStyle(block.questionStyle, questionStyleFallback),
      questionNumbers,
    })
  })

  const sortedRenderedQuestions = [...resolvedQuestions].sort((left, right) => left.questionNumber - right.questionNumber)
  const renderedQuestionNumbers = sortedRenderedQuestions.map((question) => question.questionNumber)
  const lastRenderedQuestion = renderedQuestionNumbers[renderedQuestionNumbers.length - 1] ?? 0
  const gapRanges = buildGapRanges(renderedQuestionNumbers)

  return {
    blocks,
    questions: sortedRenderedQuestions,
    totalRenderedQuestions: sortedRenderedQuestions.length,
    lastRenderedQuestion,
    hasGaps: gapRanges.length > 0,
    hasOverlap: overlappingQuestions.size > 0,
    outOfRangeQuestions: [...outOfRangeQuestions].sort((left, right) => left - right),
    gapRanges,
    overlappingQuestions: [...overlappingQuestions].sort((left, right) => left - right),
  }
}

export function recalculateQuestionBlocksFromIndex(
  blocks: CardQuestionBlock[] | undefined,
  changedIndex: number,
  maxQuestions = MAX_QUESTIONS,
) {
  const nextBlocks = structuredClone(blocks ?? [])
  if (!nextBlocks.length) return nextBlocks

  nextBlocks[0].startQuestion = 1
  nextBlocks[0].endQuestion = Math.min(maxQuestions, Math.max(1, nextBlocks[0].endQuestion))
  if (nextBlocks[0].endQuestion < nextBlocks[0].startQuestion) {
    nextBlocks[0].endQuestion = nextBlocks[0].startQuestion
  }

  for (let index = Math.max(1, changedIndex + 1); index < nextBlocks.length; index += 1) {
    const previousBlock = nextBlocks[index - 1]
    const currentBlock = nextBlocks[index]
    const currentSpan = getBlockSpan(currentBlock)
    const nextStart = Math.min(maxQuestions, previousBlock.endQuestion + 1)
    currentBlock.startQuestion = nextStart
    currentBlock.endQuestion = Math.min(maxQuestions, nextStart + currentSpan)
    if (currentBlock.endQuestion < currentBlock.startQuestion) {
      currentBlock.endQuestion = currentBlock.startQuestion
    }
  }

  return nextBlocks
}

export function applyQuestionBlockBoundaryChange(
  blocks: CardQuestionBlock[] | undefined,
  index: number,
  field: 'startQuestion' | 'endQuestion',
  value: number,
  maxQuestions = MAX_QUESTIONS,
) {
  const nextBlocks = structuredClone(blocks ?? [])
  const block = nextBlocks[index]
  if (!block) return nextBlocks

  if (field === 'startQuestion') {
    const lockedStart = index === 0 ? 1 : nextBlocks[index - 1].endQuestion + 1
    const span = getBlockSpan(block)
    block.startQuestion = Math.min(maxQuestions, Math.max(lockedStart, value))
    block.endQuestion = Math.min(maxQuestions, block.startQuestion + span)
  } else {
    const minimumEnd = Math.max(block.startQuestion, index === 0 ? 1 : nextBlocks[index - 1].endQuestion + 1)
    block.endQuestion = Math.min(maxQuestions, Math.max(minimumEnd, value))
  }

  if (block.endQuestion < block.startQuestion) {
    block.endQuestion = block.startQuestion
  }

  return recalculateQuestionBlocksFromIndex(nextBlocks, index, maxQuestions)
}

export function getQuestionBlockMeta(
  definition: Pick<CardTemplateDefinition, 'enableQuestionBlocks' | 'questionBlocks'>,
  questionNumber: number,
) {
  const blocks = definition.enableQuestionBlocks ? definition.questionBlocks : []
  const blockIndex = blocks.findIndex(
    (block) => questionNumber >= block.startQuestion && questionNumber <= block.endQuestion,
  )

  if (blockIndex >= 0) {
    const block = blocks[blockIndex]
    return {
      blockIndex,
      suffix: String.fromCharCode(65 + blockIndex),
      localQuestionNumber: questionNumber - block.startQuestion + 1,
      block,
    }
  }

  return {
    blockIndex: 0,
    suffix: 'A',
    localQuestionNumber: questionNumber,
    block: null,
  }
}

export function getQuestionBlockQuestionConfig(
  definition: Pick<CardTemplateDefinition, 'enableQuestionBlocks' | 'questionBlocks' | 'choicesPerQuestion' | 'optionLabels'>,
  questionStyleFallback: CardQuestionStyle,
  questionNumber: number,
): QuestionBlockQuestionConfig {
  if (!definition.enableQuestionBlocks) {
    return {
      blockIndex: null,
      block: null,
      choicesPerQuestion: definition.choicesPerQuestion,
      optionLabels: normalizeOptionLabels(definition.optionLabels, definition.choicesPerQuestion),
      questionStyle: questionStyleFallback,
    }
  }

  const blockIndex = definition.questionBlocks.findIndex(
    (block) => questionNumber >= block.startQuestion && questionNumber <= block.endQuestion,
  )
  const block = blockIndex >= 0 ? definition.questionBlocks[blockIndex] : null

  if (!block) {
    return {
      blockIndex: null,
      block: null,
      choicesPerQuestion: definition.choicesPerQuestion,
      optionLabels: normalizeOptionLabels(definition.optionLabels, definition.choicesPerQuestion),
      questionStyle: questionStyleFallback,
    }
  }

  return {
    blockIndex,
    block,
    choicesPerQuestion: block.choicesPerQuestion,
    optionLabels: normalizeOptionLabels(block.optionLabels, block.choicesPerQuestion),
    questionStyle: block.questionStyle,
  }
}

export function getMaxQuestionBlockChoices(
  definition: Pick<CardTemplateDefinition, 'enableQuestionBlocks' | 'questionBlocks' | 'choicesPerQuestion'>,
) {
  if (!definition.enableQuestionBlocks || !definition.questionBlocks.length) {
    return definition.choicesPerQuestion
  }

  return definition.questionBlocks.reduce<2 | 3 | 4 | 5>((maxChoices, block) => {
    const safeChoices =
      block.choicesPerQuestion === 2 || block.choicesPerQuestion === 3 || block.choicesPerQuestion === 4
        ? block.choicesPerQuestion
        : 5
    return safeChoices > maxChoices ? safeChoices : maxChoices
  }, definition.choicesPerQuestion)
}

export function getQuestionBlockSegments(
  definition: Pick<CardTemplateDefinition, 'enableQuestionBlocks' | 'questionBlocks'>,
  totalQuestions: number,
): QuestionBlockSegment[] {
  if (totalQuestions <= 0) return []

  if (!definition.enableQuestionBlocks) {
    return [
      {
        startQuestion: 1,
        endQuestion: totalQuestions,
        title: '',
        blockIndex: null,
      },
    ]
  }

  const normalizedBlocks = [...definition.questionBlocks].sort((left, right) => left.startQuestion - right.startQuestion)
  if (!normalizedBlocks.length) {
    return [
      {
        startQuestion: 1,
        endQuestion: totalQuestions,
        title: '',
        blockIndex: null,
      },
    ]
  }

  const segments: QuestionBlockSegment[] = []
  let cursor = 1

  normalizedBlocks.forEach((block, blockIndex) => {
    const clampedStart = Math.max(cursor, block.startQuestion)
    const clampedEnd = Math.min(totalQuestions, block.endQuestion)

    if (cursor < clampedStart) {
      segments.push({
        startQuestion: cursor,
        endQuestion: clampedStart - 1,
        title: '',
        blockIndex: null,
      })
    }

    if (clampedEnd >= clampedStart) {
      segments.push({
        startQuestion: clampedStart,
        endQuestion: clampedEnd,
        title: block.title,
        blockIndex,
      })
      cursor = clampedEnd + 1
    }
  })

  if (cursor <= totalQuestions) {
    segments.push({
      startQuestion: cursor,
      endQuestion: totalQuestions,
      title: '',
      blockIndex: null,
    })
  }

  return segments
}

export function appendQuestionBlockWithDistribution(
  blocks: CardQuestionBlock[] | undefined,
  totalQuestions: number,
  fallbackConfig: QuestionBlockFallbackConfig,
) {
  const defaultBlockSize = 10
  const currentBlocks = [...(blocks ?? [])]
  const nextBlockLabel = `Bloco ${currentBlocks.length + 1}`
  const inheritedConfig = currentBlocks[currentBlocks.length - 1]
    ? {
        choicesPerQuestion: currentBlocks[currentBlocks.length - 1].choicesPerQuestion,
        optionLabels: [...currentBlocks[currentBlocks.length - 1].optionLabels],
        questionStyle: currentBlocks[currentBlocks.length - 1].questionStyle,
      }
    : {
        choicesPerQuestion: fallbackConfig.choicesPerQuestion,
        optionLabels: [...fallbackConfig.optionLabels],
        questionStyle: fallbackConfig.questionStyle,
      }

  if (totalQuestions <= 0) {
    return [
      ...currentBlocks,
      {
        startQuestion: 1,
        endQuestion: defaultBlockSize,
        title: nextBlockLabel,
        ...inheritedConfig,
      },
    ]
  }

  if (!currentBlocks.length) {
    return [
      {
        startQuestion: 1,
        endQuestion: Math.min(totalQuestions, defaultBlockSize),
        title: 'Bloco 1',
        ...inheritedConfig,
      },
    ]
  }

  const lastBlock = currentBlocks[currentBlocks.length - 1]
  const nextStart = Math.min(MAX_QUESTIONS, lastBlock.endQuestion + 1)
  const nextEnd = Math.min(MAX_QUESTIONS, nextStart + defaultBlockSize - 1)

  return [
    ...currentBlocks,
    {
      startQuestion: nextStart,
      endQuestion: nextEnd,
      title: nextBlockLabel,
      ...inheritedConfig,
    },
  ]
}

export function duplicateQuestionBlockAtIndex(
  blocks: CardQuestionBlock[] | undefined,
  index: number,
  totalQuestions: number,
) {
  const currentBlocks = structuredClone(blocks ?? [])
  const sourceBlock = currentBlocks[index]
  if (!sourceBlock) return currentBlocks

  const span = Math.max(0, sourceBlock.endQuestion - sourceBlock.startQuestion)
  const duplicateStart = Math.min(MAX_QUESTIONS, sourceBlock.endQuestion + 1)
  const duplicateEnd = Math.min(MAX_QUESTIONS, duplicateStart + span)
  const duplicateBlock: CardQuestionBlock = {
    startQuestion: duplicateStart,
    endQuestion: duplicateEnd,
    title: sourceBlock.title,
    choicesPerQuestion: sourceBlock.choicesPerQuestion,
    optionLabels: [...sourceBlock.optionLabels],
    questionStyle: sourceBlock.questionStyle,
  }

  currentBlocks.splice(index + 1, 0, duplicateBlock)
  return recalculateQuestionBlocksFromIndex(currentBlocks, index, Math.max(totalQuestions, duplicateEnd))
}
