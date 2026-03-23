import type { CardTemplateEditorState } from '../types/omr'
import { getCardTemplateZones } from './cardTemplateZones'
import { getTemplateLayoutMetrics } from './templateLayoutGeometry'

export type TemplatePageLayout = {
  pageIndex: number
  totalPages: number
  offset: number
  pageQuestionCount: number
  rowsPerPage: number
  metrics: ReturnType<typeof getTemplateLayoutMetrics>
}

export function getPaginatedTemplatePages(state: CardTemplateEditorState): TemplatePageLayout[] {
  const { definition } = state
  const zones = getCardTemplateZones(state)
  const baseMetrics = getTemplateLayoutMetrics(state.omrConfig)
  const availableAnswerHeight = zones.answers.bottom - baseMetrics.questionStartY
  const maxRowsThatFit = Math.max(1, Math.floor(availableAnswerHeight / baseMetrics.rowOffset) + 1)
  const rowsPerPage = Math.max(1, Math.min(definition.rowsPerColumn, maxRowsThatFit))
  const pageCapacity = Math.max(1, rowsPerPage * definition.columns)
  const totalPages = Math.max(1, Math.ceil(definition.totalQuestions / pageCapacity))

  return Array.from({ length: totalPages }, (_, pageIndex) => {
    const offset = pageIndex * pageCapacity
    const pageQuestionCount = Math.min(pageCapacity, definition.totalQuestions - offset)

    return {
      pageIndex,
      totalPages,
      offset,
      pageQuestionCount,
      rowsPerPage,
      metrics: getTemplateLayoutMetrics(
        {
          ...state.omrConfig,
          rowsPerColumn: rowsPerPage,
          totalQuestions: pageQuestionCount,
        },
        offset,
        pageQuestionCount,
      ),
    }
  })
}
