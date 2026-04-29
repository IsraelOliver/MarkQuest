import type { CardTemplateEditorState } from '../types/omr'
import { buildNormalizedRenderModel } from './questionBlocks'
import { getPaginatedTemplatePages } from './templatePageLayout'

export type TemplateVisualConsistencyCheck = {
  id: 'tipo-b' | 'tipo-d' | 'math-fields' | 'image-section' | 'open-answer' | 'essay-page'
  label: string
  passed: boolean
}

export function getTemplateVisualConsistencyChecklist(state: CardTemplateEditorState): TemplateVisualConsistencyCheck[] {
  const renderModel = buildNormalizedRenderModel(state.definition)
  const pages = getPaginatedTemplatePages(state)

  const hasMarkerAtQuestion = (questionNumber: number, markerLabel: string) => {
    const logicalQuestion = renderModel.logicalQuestionMap.get(questionNumber)
    const hasLogicalMarker = logicalQuestion?.markerLabel === markerLabel
    const hasQuestionLayout = pages.some((page) => page.questions.some((question) => question.questionNumber === questionNumber))
    return hasLogicalMarker && hasQuestionLayout
  }

  return [
    {
      id: 'tipo-b',
      label: 'TIPO B na questão 33 usa marcador visual compartilhado',
      passed: hasMarkerAtQuestion(33, 'TIPO B'),
    },
    {
      id: 'tipo-d',
      label: 'TIPO D na questão 82 usa marcador visual compartilhado',
      passed: hasMarkerAtQuestion(82, 'TIPO D'),
    },
    {
      id: 'math-fields',
      label: 'Questão matemática mantém campos e grade visual',
      passed: pages.some((page) =>
        page.mathBlocks.some((mathBlock) => mathBlock.showTopInputRow && mathBlock.columnXs.length > 0 && mathBlock.rows.length === 10),
      ),
    },
    {
      id: 'image-section',
      label: 'Seção imagem usa layout final compartilhado',
      passed: pages.some((page) =>
        page.images.some((imageSection) => Boolean(imageSection.imageSrc) && imageSection.width > 0 && imageSection.imageBoxHeight > 0),
      ),
    },
    {
      id: 'open-answer',
      label: 'Questão aberta está presente no layout visual',
      passed: pages.some((page) => page.openAnswers.length > 0),
    },
    {
      id: 'essay-page',
      label: 'Redação está presente no layout visual',
      passed: pages.some((page) => page.essays.length > 0),
    },
  ]
}
