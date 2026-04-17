import type {
  CardLabelSection,
  CardNumberingFormat,
  CardObjectiveSection,
  CardQuestionStyle,
  CardSpacerSection,
  CardTemplateDefinition,
  CardTemplateSection,
} from '../types/omr'
import { isValidOptionLabel, normalizeOptionLabels } from './optionLabels'
import { clampQuestionTotal, MAX_QUESTIONS } from './questionLimits'

export type QuestionBlockSegment = {
  startQuestion: number
  endQuestion: number
  title: string
  blockIndex: number | null
}

type QuestionBlockFallbackConfig = Pick<CardTemplateDefinition, 'choicesPerQuestion' | 'optionLabels'> & {
  numberingFormat: CardNumberingFormat
}

export type QuestionBlockQuestionConfig = {
  blockIndex: number | null
  block: CardObjectiveSection | null
  blockStartQuestion: number
  localQuestionIndex: number
  choicesPerQuestion: 2 | 3 | 4 | 5
  optionLabels: string[]
  numberingFormat: CardNumberingFormat
  questionStyle: CardQuestionStyle
}

export type NormalizedObjectiveSection = {
  id: string
  order: number
  sectionType: 'objective'
  readMode: 'answers'
  title: string
  startQuestion: number
  endQuestion: number
  alternativesCount: 2 | 3 | 4 | 5
  alternativeLabels: string[]
  numberingFormat: CardNumberingFormat
  questionStyle: CardQuestionStyle
  questionNumbers: number[]
}

export type NormalizedLabelSection = {
  id: string
  order: number
  sectionType: 'label'
  readMode: 'ignored'
  text: string
  align: 'left' | 'center' | 'right'
  size: 'sm' | 'md' | 'lg'
}

export type NormalizedSpacerSection = {
  id: string
  order: number
  sectionType: 'spacer'
  readMode: 'ignored'
  size: 'sm' | 'md' | 'lg'
}

export type NormalizedTemplateSection = NormalizedObjectiveSection | NormalizedLabelSection | NormalizedSpacerSection

export type ResolvedQuestion = {
  questionNumber: number
  blockId: string
  blockOrder: number
  blockTitle: string
  blockStartQuestion: number
  localQuestionIndex: number
  alternativesCount: 2 | 3 | 4 | 5
  alternativeLabels: string[]
  numberingFormat: CardNumberingFormat
  questionStyle: CardQuestionStyle
}

export type NormalizedRenderModel = {
  sections: NormalizedTemplateSection[]
  blocks: NormalizedObjectiveSection[]
  questions: ResolvedQuestion[]
  totalRenderedQuestions: number
  lastRenderedQuestion: number
  hasGaps: boolean
  hasOverlap: boolean
  outOfRangeQuestions: number[]
  gapRanges: Array<{ startQuestion: number; endQuestion: number }>
  overlappingQuestions: number[]
}

export function isObjectiveSection(section: CardTemplateSection): section is CardObjectiveSection {
  return section.sectionType === 'objective'
}

export function isLabelSection(section: CardTemplateSection): section is CardLabelSection {
  return section.sectionType === 'label'
}

export function isSpacerSection(section: CardTemplateSection): section is CardSpacerSection {
  return section.sectionType === 'spacer'
}

function createSectionId(index: number, prefix: 'objective' | 'label' | 'spacer') {
  return `section-${prefix}-${index + 1}`
}

function normalizeNumberingFormat(value: string | undefined, fallback: CardNumberingFormat) {
  return value === 'numericAlpha' || value === 'alphaNumeric' || value === 'numericLower' || value === 'numericDash'
    ? value
    : fallback
}

function normalizeLabelAlign(value: string | undefined): CardLabelSection['align'] {
  return value === 'center' || value === 'right' ? value : 'left'
}

function normalizeLabelSize(value: string | undefined): CardLabelSection['size'] {
  return value === 'sm' || value === 'lg' ? value : 'md'
}

function normalizeSpacerSize(value: string | undefined): CardSpacerSection['size'] {
  return value === 'sm' || value === 'lg' ? value : 'md'
}

function normalizeObjectiveSection(
  section: Partial<CardObjectiveSection>,
  index: number,
  totalQuestions: number,
  fallbackConfig: QuestionBlockFallbackConfig,
): CardObjectiveSection {
  const choicesPerQuestion =
    section.choicesPerQuestion === 2 ||
    section.choicesPerQuestion === 3 ||
    section.choicesPerQuestion === 4 ||
    section.choicesPerQuestion === 5
      ? section.choicesPerQuestion
      : fallbackConfig.choicesPerQuestion

  const startQuestion = Math.min(totalQuestions, Math.max(1, Math.round(section.startQuestion ?? 1)))
  const endQuestion = Math.min(totalQuestions, Math.max(startQuestion, Math.round(section.endQuestion ?? startQuestion)))

  return {
    id: section.id?.trim() || createSectionId(index, 'objective'),
    sectionType: 'objective',
    readMode: 'answers',
    startQuestion,
    endQuestion,
    title: section.title ?? '',
    choicesPerQuestion,
    optionLabels: normalizeOptionLabels(section.optionLabels, choicesPerQuestion),
    numberingFormat: normalizeNumberingFormat(section.numberingFormat, fallbackConfig.numberingFormat),
  }
}

function normalizeLabelSection(section: Partial<CardLabelSection>, index: number): CardLabelSection {
  return {
    id: section.id?.trim() || createSectionId(index, 'label'),
    sectionType: 'label',
    readMode: 'ignored',
    text: section.text ?? '',
    align: normalizeLabelAlign(section.align),
    size: normalizeLabelSize(section.size),
  }
}

function normalizeSpacerSection(section: Partial<CardSpacerSection>, index: number): CardSpacerSection {
  return {
    id: section.id?.trim() || createSectionId(index, 'spacer'),
    sectionType: 'spacer',
    readMode: 'ignored',
    size: normalizeSpacerSize(section.size),
  }
}

export function createObjectiveSection(
  index: number,
  startQuestion: number,
  endQuestion: number,
  fallbackConfig: QuestionBlockFallbackConfig,
  overrides: Partial<CardObjectiveSection> = {},
): CardObjectiveSection {
  return normalizeObjectiveSection(
    {
      id: overrides.id ?? createSectionId(index, 'objective'),
      title: overrides.title ?? `Seção ${index + 1}`,
      startQuestion,
      endQuestion,
      choicesPerQuestion: overrides.choicesPerQuestion ?? fallbackConfig.choicesPerQuestion,
      optionLabels: overrides.optionLabels ?? fallbackConfig.optionLabels,
      numberingFormat: overrides.numberingFormat ?? fallbackConfig.numberingFormat,
    },
    index,
    Math.max(endQuestion, 1),
    fallbackConfig,
  )
}

export function createLabelSection(index: number, overrides: Partial<CardLabelSection> = {}): CardLabelSection {
  return normalizeLabelSection(
    {
      id: overrides.id ?? createSectionId(index, 'label'),
      text: overrides.text ?? '',
      align: overrides.align ?? 'left',
      size: overrides.size ?? 'md',
    },
    index,
  )
}

export function createSpacerSection(index: number, overrides: Partial<CardSpacerSection> = {}): CardSpacerSection {
  return normalizeSpacerSection(
    {
      id: overrides.id ?? createSectionId(index, 'spacer'),
      size: overrides.size ?? 'md',
    },
    index,
  )
}

export function normalizeQuestionBlocks(
  blocks: CardTemplateSection[] | undefined,
  totalQuestions: number,
  fallbackConfig: QuestionBlockFallbackConfig,
): CardTemplateSection[] {
  const safeTotalQuestions = Math.max(1, totalQuestions)

  return (blocks ?? []).map((section, index) => {
    if (isLabelSection(section)) {
      return normalizeLabelSection(section, index)
    }

    if (isSpacerSection(section)) {
      return normalizeSpacerSection(section, index)
    }

    return normalizeObjectiveSection(section, index, safeTotalQuestions, fallbackConfig)
  })
}

function getObjectiveSectionEntries(sections: CardTemplateSection[]) {
  return sections
    .map((section, index) => ({ section, index }))
    .filter((entry): entry is { section: CardObjectiveSection; index: number } => isObjectiveSection(entry.section))
}

function getObjectiveSectionsSorted(sections: CardTemplateSection[]) {
  return getObjectiveSectionEntries(sections).sort(
    (left, right) => left.section.startQuestion - right.section.startQuestion || left.index - right.index,
  )
}

export function getQuestionBlockAtStart(
  definition: Pick<CardTemplateDefinition, 'enableQuestionBlocks' | 'showQuestionBlockTitles' | 'questionBlocks'>,
  questionNumber: number,
) {
  if (!definition.enableQuestionBlocks || !definition.showQuestionBlockTitles) return null
  return definition.questionBlocks.find(
    (section) => isObjectiveSection(section) && section.startQuestion === questionNumber,
  ) ?? null
}

export function validateQuestionBlocks(
  blocks: CardTemplateSection[],
  totalQuestions: number,
  fallbackConfig: QuestionBlockFallbackConfig,
) {
  const issues: Array<{ code: string; message: string }> = []
  const normalizedSections = normalizeQuestionBlocks(blocks, totalQuestions, fallbackConfig)
  const sortedBlocks = getObjectiveSectionsSorted(normalizedSections)

  sortedBlocks.forEach(({ section: block }, index) => {
    if (block.startQuestion > block.endQuestion) {
      issues.push({
        code: `QUESTION_BLOCK_INVALID_RANGE_${index}`,
        message: `A seção "${block.title}" tem início maior do que o fim.`,
      })
    }

    if (block.endQuestion > totalQuestions) {
      issues.push({
        code: `QUESTION_BLOCK_OUTSIDE_TOTAL_${index}`,
        message: `A seção "${block.title}" ultrapassa o total de questões da prova.`,
      })
    }

    const nextBlock = sortedBlocks[index + 1]?.section
    if (nextBlock && block.endQuestion >= nextBlock.startQuestion) {
      issues.push({
        code: `QUESTION_BLOCK_OVERLAP_${index}`,
        message: `As seções "${block.title}" e "${nextBlock.title}" possuem intervalos sobrepostos.`,
      })
    }

    if (block.optionLabels.length !== block.choicesPerQuestion) {
      issues.push({
        code: `QUESTION_BLOCK_OPTION_COUNT_${index}`,
        message: `A seção "${block.title}" precisa ter a mesma quantidade de caracteres e alternativas.`,
      })
    }

    const invalidOptionLabels = block.optionLabels.filter((label) => !isValidOptionLabel(label))
    if (invalidOptionLabels.length) {
      issues.push({
        code: `QUESTION_BLOCK_OPTION_INVALID_${index}`,
        message: `A seção "${block.title}" usa caracteres de alternativas inválidos.`,
      })
    }

    const duplicatedOptionLabels = new Set(
      block.optionLabels.filter((label, labelIndex) => block.optionLabels.indexOf(label) !== labelIndex),
    )
    if (duplicatedOptionLabels.size > 0) {
      issues.push({
        code: `QUESTION_BLOCK_OPTION_DUPLICATE_${index}`,
        message: `A seção "${block.title}" repete caracteres de alternativas.`,
      })
    }
  })

  if (sortedBlocks.length) {
    const coveredQuestions = new Set<number>()
    sortedBlocks.forEach(({ section: block }) => {
      for (let question = block.startQuestion; question <= block.endQuestion; question += 1) {
        coveredQuestions.add(question)
      }
    })

    if (coveredQuestions.size < totalQuestions) {
      issues.push({
        code: 'QUESTION_BLOCKS_WITH_GAPS',
        message: 'Existem questões fora das seções objetivas cadastradas.',
      })
    }
  }

  return issues
}

function getBlockSpan(block: CardObjectiveSection) {
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
  definition: Pick<CardTemplateDefinition, 'enableQuestionBlocks' | 'questionBlocks' | 'totalQuestions' | 'choicesPerQuestion' | 'optionLabels' | 'questionStyle'>,
  maxQuestions = MAX_QUESTIONS,
): NormalizedRenderModel {
  const safeMaxQuestions = clampQuestionTotal(maxQuestions)
  const safeTotalQuestions = clampQuestionTotal(definition.totalQuestions)

  if (!definition.enableQuestionBlocks) {
    const alternativesCount = definition.choicesPerQuestion
    const alternativeLabels = normalizeOptionLabels(definition.optionLabels, alternativesCount)
    const questionNumbers = Array.from({ length: Math.min(safeTotalQuestions, safeMaxQuestions) }, (_, index) => index + 1)
    const block: NormalizedObjectiveSection = {
      id: 'global',
      order: 1,
      sectionType: 'objective',
      readMode: 'answers',
      title: '',
      startQuestion: questionNumbers[0] ?? 1,
      endQuestion: questionNumbers[questionNumbers.length - 1] ?? safeTotalQuestions,
      alternativesCount,
      alternativeLabels,
      numberingFormat: 'numeric',
      questionStyle: definition.questionStyle,
      questionNumbers,
    }

    return {
      sections: [block],
      blocks: [block],
      questions: questionNumbers.map((questionNumber) => ({
        questionNumber,
        blockId: block.id,
        blockOrder: block.order,
        blockTitle: block.title,
        blockStartQuestion: block.startQuestion,
        localQuestionIndex: questionNumber - block.startQuestion,
        alternativesCount,
        alternativeLabels,
        numberingFormat: 'numeric',
        questionStyle: definition.questionStyle,
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

  const normalizedSections: NormalizedTemplateSection[] = []
  const objectiveBlocks: NormalizedObjectiveSection[] = []
  const seenQuestions = new Set<number>()
  const outOfRangeQuestions = new Set<number>()
  const overlappingQuestions = new Set<number>()
  const resolvedQuestions: ResolvedQuestion[] = []

  definition.questionBlocks.forEach((section, index) => {
    if (isLabelSection(section)) {
      normalizedSections.push({
        id: section.id,
        order: index + 1,
        sectionType: 'label',
        readMode: 'ignored',
        text: section.text,
        align: section.align,
        size: section.size,
      })
      return
    }

    if (isSpacerSection(section)) {
      normalizedSections.push({
        id: section.id,
        order: index + 1,
        sectionType: 'spacer',
        readMode: 'ignored',
        size: section.size,
      })
      return
    }

    const clampedStart = Math.max(1, Math.round(section.startQuestion))
    const clampedEnd = Math.max(clampedStart, Math.round(section.endQuestion))
    const alternativesCount =
      section.choicesPerQuestion === 2 ||
      section.choicesPerQuestion === 3 ||
      section.choicesPerQuestion === 4 ||
      section.choicesPerQuestion === 5
        ? section.choicesPerQuestion
        : 5
    const alternativeLabels = normalizeOptionLabels(section.optionLabels, alternativesCount)
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
        blockId: section.id,
        blockOrder: index + 1,
        blockTitle: section.title ?? '',
        blockStartQuestion: clampedStart,
        localQuestionIndex: questionNumber - clampedStart,
        alternativesCount,
        alternativeLabels,
        numberingFormat: normalizeNumberingFormat(section.numberingFormat, 'numeric'),
        questionStyle: definition.questionStyle,
      })
    }

    const normalizedBlock: NormalizedObjectiveSection = {
      id: section.id,
      order: index + 1,
      sectionType: 'objective',
      readMode: 'answers',
      title: section.title ?? '',
      startQuestion: clampedStart,
      endQuestion: Math.min(clampedEnd, safeMaxQuestions),
      alternativesCount,
      alternativeLabels,
      numberingFormat: normalizeNumberingFormat(section.numberingFormat, 'numeric'),
      questionStyle: definition.questionStyle,
      questionNumbers,
    }

    objectiveBlocks.push(normalizedBlock)
    normalizedSections.push(normalizedBlock)
  })

  const sortedRenderedQuestions = [...resolvedQuestions].sort((left, right) => left.questionNumber - right.questionNumber)
  const renderedQuestionNumbers = sortedRenderedQuestions.map((question) => question.questionNumber)
  const lastRenderedQuestion = renderedQuestionNumbers[renderedQuestionNumbers.length - 1] ?? 0
  const gapRanges = buildGapRanges(renderedQuestionNumbers)

  return {
    sections: normalizedSections,
    blocks: objectiveBlocks,
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
  blocks: CardTemplateSection[] | undefined,
  changedIndex: number,
  maxQuestions = MAX_QUESTIONS,
) {
  const nextSections = structuredClone(blocks ?? [])
  const objectiveEntries = getObjectiveSectionEntries(nextSections)
  if (!objectiveEntries.length) return nextSections

  const changedObjectivePosition = objectiveEntries.findIndex(({ index }) => index === changedIndex)
  if (changedObjectivePosition === -1) return nextSections

  objectiveEntries[0].section.startQuestion = 1
  objectiveEntries[0].section.endQuestion = Math.min(maxQuestions, Math.max(1, objectiveEntries[0].section.endQuestion))
  if (objectiveEntries[0].section.endQuestion < objectiveEntries[0].section.startQuestion) {
    objectiveEntries[0].section.endQuestion = objectiveEntries[0].section.startQuestion
  }

  for (let position = Math.max(1, changedObjectivePosition + 1); position < objectiveEntries.length; position += 1) {
    const previousBlock = objectiveEntries[position - 1].section
    const currentBlock = objectiveEntries[position].section
    const currentSpan = getBlockSpan(currentBlock)
    const nextStart = Math.min(maxQuestions, previousBlock.endQuestion + 1)
    currentBlock.startQuestion = nextStart
    currentBlock.endQuestion = Math.min(maxQuestions, nextStart + currentSpan)
    if (currentBlock.endQuestion < currentBlock.startQuestion) {
      currentBlock.endQuestion = currentBlock.startQuestion
    }
  }

  return nextSections
}

export function applyQuestionBlockBoundaryChange(
  blocks: CardTemplateSection[] | undefined,
  index: number,
  field: 'startQuestion' | 'endQuestion',
  value: number,
  maxQuestions = MAX_QUESTIONS,
) {
  const nextSections = structuredClone(blocks ?? [])
  const objectiveEntries = getObjectiveSectionEntries(nextSections)
  const objectivePosition = objectiveEntries.findIndex((entry) => entry.index === index)
  const currentEntry = objectiveEntries[objectivePosition]
  if (!currentEntry) return nextSections

  const block = currentEntry.section
  if (field === 'startQuestion') {
    const lockedStart = objectivePosition === 0 ? 1 : objectiveEntries[objectivePosition - 1].section.endQuestion + 1
    const span = getBlockSpan(block)
    block.startQuestion = Math.min(maxQuestions, Math.max(lockedStart, value))
    block.endQuestion = Math.min(maxQuestions, block.startQuestion + span)
  } else {
    const minimumEnd =
      objectivePosition === 0 ? Math.max(block.startQuestion, 1) : Math.max(block.startQuestion, objectiveEntries[objectivePosition - 1].section.endQuestion + 1)
    block.endQuestion = Math.min(maxQuestions, Math.max(minimumEnd, value))
  }

  if (block.endQuestion < block.startQuestion) {
    block.endQuestion = block.startQuestion
  }

  return recalculateQuestionBlocksFromIndex(nextSections, index, maxQuestions)
}

export function getQuestionBlockMeta(
  definition: Pick<CardTemplateDefinition, 'enableQuestionBlocks' | 'questionBlocks'>,
  questionNumber: number,
) {
  const blocks = definition.enableQuestionBlocks ? definition.questionBlocks.filter(isObjectiveSection) : []
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
  definition: Pick<CardTemplateDefinition, 'enableQuestionBlocks' | 'questionBlocks' | 'choicesPerQuestion' | 'optionLabels' | 'questionStyle'>,
  questionNumber: number,
): QuestionBlockQuestionConfig {
  if (!definition.enableQuestionBlocks) {
    return {
      blockIndex: null,
      block: null,
      blockStartQuestion: 1,
      localQuestionIndex: Math.max(0, questionNumber - 1),
      choicesPerQuestion: definition.choicesPerQuestion,
      optionLabels: normalizeOptionLabels(definition.optionLabels, definition.choicesPerQuestion),
      numberingFormat: 'numeric',
      questionStyle: definition.questionStyle,
    }
  }

  const objectiveBlocks = definition.questionBlocks.filter(isObjectiveSection)
  const blockIndex = objectiveBlocks.findIndex(
    (block) => questionNumber >= block.startQuestion && questionNumber <= block.endQuestion,
  )
  const block = blockIndex >= 0 ? objectiveBlocks[blockIndex] : null

  if (!block) {
    return {
      blockIndex: null,
      block: null,
      blockStartQuestion: 1,
      localQuestionIndex: Math.max(0, questionNumber - 1),
      choicesPerQuestion: definition.choicesPerQuestion,
      optionLabels: normalizeOptionLabels(definition.optionLabels, definition.choicesPerQuestion),
      numberingFormat: 'numeric',
      questionStyle: definition.questionStyle,
    }
  }

  return {
    blockIndex,
    block,
    blockStartQuestion: block.startQuestion,
    localQuestionIndex: Math.max(0, questionNumber - block.startQuestion),
    choicesPerQuestion: block.choicesPerQuestion,
    optionLabels: normalizeOptionLabels(block.optionLabels, block.choicesPerQuestion),
    numberingFormat: normalizeNumberingFormat(block.numberingFormat, 'numeric'),
    questionStyle: definition.questionStyle,
  }
}

export function getMaxQuestionBlockChoices(
  definition: Pick<CardTemplateDefinition, 'enableQuestionBlocks' | 'questionBlocks' | 'choicesPerQuestion'>,
) {
  if (!definition.enableQuestionBlocks || !definition.questionBlocks.length) {
    return definition.choicesPerQuestion
  }

  return definition.questionBlocks.reduce<2 | 3 | 4 | 5>((maxChoices, section) => {
    if (!isObjectiveSection(section)) return maxChoices
    const safeChoices =
      section.choicesPerQuestion === 2 ||
      section.choicesPerQuestion === 3 ||
      section.choicesPerQuestion === 4 ||
      section.choicesPerQuestion === 5
        ? section.choicesPerQuestion
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

  const normalizedBlocks = getObjectiveSectionsSorted(definition.questionBlocks)
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

  normalizedBlocks.forEach(({ section: block }, blockIndex) => {
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
  blocks: CardTemplateSection[] | undefined,
  totalQuestions: number,
  fallbackConfig: QuestionBlockFallbackConfig,
): CardTemplateSection[] {
  const defaultBlockSize = 10
  const currentSections = [...(blocks ?? [])]
  const objectiveSections = currentSections.filter(isObjectiveSection)
  const objectiveOrder = objectiveSections.length
  const lastObjectiveSection = objectiveSections[objectiveSections.length - 1]
  const inheritedConfig = lastObjectiveSection
    ? {
        choicesPerQuestion: lastObjectiveSection.choicesPerQuestion,
        optionLabels: [...lastObjectiveSection.optionLabels],
        numberingFormat: lastObjectiveSection.numberingFormat,
      }
    : {
        choicesPerQuestion: fallbackConfig.choicesPerQuestion,
        optionLabels: [...fallbackConfig.optionLabels],
        numberingFormat: fallbackConfig.numberingFormat,
      }

  if (totalQuestions <= 0 || !lastObjectiveSection) {
    return [
      ...currentSections,
      createObjectiveSection(
        currentSections.length,
        1,
        Math.min(Math.max(totalQuestions, 1), defaultBlockSize),
        inheritedConfig,
        { title: `Seção ${objectiveOrder + 1}` },
      ),
    ]
  }

  const nextStart = Math.min(MAX_QUESTIONS, lastObjectiveSection.endQuestion + 1)
  const nextEnd = Math.min(MAX_QUESTIONS, nextStart + defaultBlockSize - 1)

  return [
    ...currentSections,
    createObjectiveSection(currentSections.length, nextStart, nextEnd, inheritedConfig, {
      title: `Seção ${objectiveOrder + 1}`,
    }),
  ]
}

export function appendLabelSection(blocks: CardTemplateSection[] | undefined): CardTemplateSection[] {
  const currentSections = [...(blocks ?? [])]
  return [...currentSections, createLabelSection(currentSections.length)]
}

export function appendSpacerSection(blocks: CardTemplateSection[] | undefined): CardTemplateSection[] {
  const currentSections = [...(blocks ?? [])]
  return [...currentSections, createSpacerSection(currentSections.length)]
}

export function duplicateQuestionBlockAtIndex(
  blocks: CardTemplateSection[] | undefined,
  index: number,
  totalQuestions: number,
): CardTemplateSection[] {
  const currentSections = structuredClone(blocks ?? [])
  const sourceSection = currentSections[index]
  if (!sourceSection) return currentSections

  if (isLabelSection(sourceSection)) {
    currentSections.splice(index + 1, 0, createLabelSection(index + 1, sourceSection))
    return currentSections
  }

  if (isSpacerSection(sourceSection)) {
    currentSections.splice(index + 1, 0, createSpacerSection(index + 1, sourceSection))
    return currentSections
  }

  const span = Math.max(0, sourceSection.endQuestion - sourceSection.startQuestion)
  const duplicateStart = Math.min(MAX_QUESTIONS, sourceSection.endQuestion + 1)
  const duplicateEnd = Math.min(MAX_QUESTIONS, duplicateStart + span)
  const duplicateBlock: CardObjectiveSection = {
    id: createSectionId(index + 1, 'objective'),
    sectionType: 'objective',
    readMode: 'answers',
    startQuestion: duplicateStart,
    endQuestion: duplicateEnd,
    title: sourceSection.title,
    choicesPerQuestion: sourceSection.choicesPerQuestion,
    optionLabels: [...sourceSection.optionLabels],
    numberingFormat: sourceSection.numberingFormat,
  }

  currentSections.splice(index + 1, 0, duplicateBlock)
  return recalculateQuestionBlocksFromIndex(currentSections, index, Math.max(totalQuestions, duplicateEnd))
}
