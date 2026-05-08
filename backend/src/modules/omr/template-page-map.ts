import type { CardTemplateSection, Template } from '../../types/entities.js'

type TemplatePageBlockSummary = {
  id: string
  sectionType: CardTemplateSection['sectionType']
  readMode: CardTemplateSection['readMode']
  title?: string
  markerLabel?: string
  linkedQuestionNumber?: number | null
}

export type TemplatePageDiagnostic = {
  pageNumber: number
  blocksFound: TemplatePageBlockSummary[]
  mathQuestionsFound: number[]
  openQuestionsFound: number[]
  automaticReadPending: boolean
  automaticReadPendingReasons: string[]
  notes: string[]
}

export type TemplatePageMapDiagnostic = {
  pageCount: number
  templateHasExplicitBlockPageNumber: false
  templateHasExplicitPageBreaks: boolean
  mappingStrategy: 'page-breaks' | 'heuristic-after-last-objective' | 'single-page-fallback'
  notes: string[]
  pages: TemplatePageDiagnostic[]
}

function getBlockTitle(block: CardTemplateSection) {
  switch (block.sectionType) {
    case 'objective':
      return block.title
    case 'open':
      return block.label
    case 'essay':
      return block.title
    case 'label':
      return block.text
    case 'signature':
      return block.label
    default:
      return undefined
  }
}

function summarizeBlock(block: CardTemplateSection): TemplatePageBlockSummary {
  return {
    id: block.id,
    sectionType: block.sectionType,
    readMode: block.readMode,
    title: getBlockTitle(block),
    markerLabel:
      'markerLabel' in block && typeof block.markerLabel === 'string' ? block.markerLabel : undefined,
    linkedQuestionNumber:
      'linkedQuestionNumber' in block && typeof block.linkedQuestionNumber !== 'undefined'
        ? block.linkedQuestionNumber
        : undefined,
  }
}

function buildPageBreakSlices(blocks: CardTemplateSection[]) {
  const pages: CardTemplateSection[][] = [[]]
  let hasExplicitPageBreaks = false

  for (const block of blocks) {
    if (block.sectionType === 'pageBreak') {
      hasExplicitPageBreaks = true
      if (pages[pages.length - 1].length > 0) {
        pages.push([])
      }
      continue
    }

    pages[pages.length - 1].push(block)
  }

  if (pages[pages.length - 1]?.length === 0 && pages.length > 1) {
    pages.pop()
  }

  return {
    hasExplicitPageBreaks,
    pages,
  }
}

function buildHeuristicSlices(blocks: CardTemplateSection[]) {
  const lastObjectiveIndex = blocks.reduce(
    (lastIndex, block, index) => (block.sectionType === 'objective' ? index : lastIndex),
    -1,
  )

  if (lastObjectiveIndex >= 0 && lastObjectiveIndex < blocks.length - 1) {
    return {
      mappingStrategy: 'heuristic-after-last-objective' as const,
      pages: [blocks.slice(0, lastObjectiveIndex + 1), blocks.slice(lastObjectiveIndex + 1)],
    }
  }

  return {
    mappingStrategy: 'single-page-fallback' as const,
    pages: [blocks],
  }
}

function getPagePendingKinds(blocks: CardTemplateSection[]) {
  return [
    ...new Set(
      blocks.flatMap((block) => {
        if (block.sectionType === 'math') return ['math']
        if (block.sectionType === 'open') return ['open']
        if (block.sectionType === 'essay') return ['essay']
        if (block.sectionType === 'image' && block.readMode === 'manual') return ['image']
        return []
      }),
    ),
  ]
}

export function buildTemplatePageMapDiagnostic(params: {
  template: Template
  rasterizedPageCount: number
}): TemplatePageMapDiagnostic {
  const blocks = params.template.definition.questionBlocks
  const explicitSlices = buildPageBreakSlices(blocks)
  const inferred =
    explicitSlices.hasExplicitPageBreaks
      ? { mappingStrategy: 'page-breaks' as const, pages: explicitSlices.pages }
      : buildHeuristicSlices(blocks)

  const pages = Array.from({ length: params.rasterizedPageCount }, (_, index) => {
    const pageNumber = index + 1
    const mappedBlocks = inferred.pages[index] ?? []
    const pendingKinds = getPagePendingKinds(mappedBlocks)

    return {
      pageNumber,
      blocksFound: mappedBlocks.map(summarizeBlock),
      mathQuestionsFound: mappedBlocks.flatMap((block) =>
        block.sectionType === 'math' && block.linkedQuestionNumber ? [block.linkedQuestionNumber] : [],
      ),
      openQuestionsFound: mappedBlocks.flatMap((block) =>
        block.sectionType === 'open' && block.linkedQuestionNumber ? [block.linkedQuestionNumber] : [],
      ),
      automaticReadPending: pendingKinds.length > 0,
      automaticReadPendingReasons: pendingKinds,
      notes: [
        'O template não salva pageNumber explícito por bloco.',
        ...(mappedBlocks.length === 0 ? ['Nenhum bloco do template foi associado a esta página.'] : []),
        ...(!explicitSlices.hasExplicitPageBreaks && params.rasterizedPageCount > 1
          ? ['O mapeamento entre blocos e páginas foi inferido heurísticamente após o último bloco objetivo.']
          : []),
      ],
    }
  })

  return {
    pageCount: params.rasterizedPageCount,
    templateHasExplicitBlockPageNumber: false,
    templateHasExplicitPageBreaks: explicitSlices.hasExplicitPageBreaks,
    mappingStrategy: inferred.mappingStrategy,
    notes: [
      explicitSlices.hasExplicitPageBreaks
        ? 'As páginas do template foram segmentadas usando blocos pageBreak.'
        : 'O template não possui pageBreak nem pageNumber explícito por bloco.',
    ],
    pages,
  }
}
