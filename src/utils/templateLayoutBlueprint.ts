import type { CardTemplateEditorState } from '../types/omr'
import { getCardTemplateZones } from './cardTemplateZones'
import { TEMPLATE_PAGE_HEIGHT, TEMPLATE_PAGE_WIDTH, TEMPLATE_SAFE_MARGIN } from './templateLayoutGeometry'
import { getPaginatedTemplatePages } from './templatePageLayout'

function round(value: number) {
  return Number(value.toFixed(2))
}

export function getTemplateLayoutBlueprint(state: CardTemplateEditorState) {
  const zones = getCardTemplateZones(state)
  const pages = getPaginatedTemplatePages(state)
  const firstPage = pages[0]
  const metrics = firstPage.metrics
  const firstQuestion = metrics.questions[0]
  const lastQuestion = metrics.questions[metrics.questions.length - 1]
  const lastPage = pages[pages.length - 1]

  return {
    page: {
      width: TEMPLATE_PAGE_WIDTH,
      height: TEMPLATE_PAGE_HEIGHT,
      safeMargin: TEMPLATE_SAFE_MARGIN,
    },
    pagination: {
      totalQuestions: state.definition.totalQuestions,
      totalPages: pages.length,
      rowsPerPage: firstPage.rowsPerPage,
      pageCapacity: firstPage.rowsPerPage * state.definition.columns,
      lastPageQuestions: lastPage?.pageQuestionCount ?? 0,
    },
    safeArea: {
      left: round(zones.safeArea.left),
      top: round(zones.safeArea.top),
      right: round(zones.safeArea.right),
      bottom: round(zones.safeArea.bottom),
      width: round(zones.safeArea.right - zones.safeArea.left),
      height: round(zones.safeArea.bottom - zones.safeArea.top),
    },
    answerZone: {
      left: round(zones.answers.left),
      top: round(zones.answers.top),
      right: round(zones.answers.right),
      bottom: round(zones.answers.bottom),
      width: round(zones.answers.right - zones.answers.left),
      height: round(zones.answers.bottom - zones.answers.top),
    },
    footer: {
      top: round(zones.footer.top),
      bottom: round(zones.footer.bottom),
      height: round(zones.footer.height),
      logo: {
        x: round(zones.footer.logoX),
        width: round(zones.footer.logoWidth),
      },
      center: {
        x: round(zones.footer.centerX),
        width: round(zones.footer.centerWidth),
      },
      qr: {
        x: round(zones.footer.codeBoxX),
        width: round(zones.footer.codeBoxWidth),
        height: round(zones.footer.codeBoxHeight),
      },
    },
    omr: {
      bubbleRadius: round(metrics.bubbleRadius),
      bubbleSpacing: round(metrics.bubbleSpacing),
      rowOffset: round(metrics.rowOffset),
      columnOffset: round(metrics.columnOffset),
      firstQuestionLabel: firstQuestion ? round(firstQuestion.labelX) : 0,
      firstBubbleX: firstQuestion ? round(firstQuestion.optionStartX) : 0,
      firstBubbleY: firstQuestion ? round(firstQuestion.optionY) : 0,
      lastBubbleX: lastQuestion
        ? round(lastQuestion.optionStartX + (metrics.activeOptions.length - 1) * metrics.bubbleSpacing)
        : 0,
      lastBubbleY: lastQuestion ? round(lastQuestion.optionY) : 0,
    },
  }
}
