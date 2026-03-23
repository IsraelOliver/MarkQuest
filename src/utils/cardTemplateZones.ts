import type { CardTemplateEditorState } from '../types/omr'
import {
  getTemplateLayoutMetrics,
  TEMPLATE_PAGE_HEIGHT,
  TEMPLATE_PAGE_WIDTH,
  TEMPLATE_PAGE_X,
  TEMPLATE_PAGE_Y,
  TEMPLATE_SAFE_MARGIN,
  TEMPLATE_TECHNICAL_FOOTER_GAP,
  TEMPLATE_TECHNICAL_FOOTER_HEIGHT,
} from './templateLayoutGeometry'

export function getCardIdentificationFields(state: CardTemplateEditorState) {
  const { definition } = state

  return [
    definition.identification.showStudentName ? 'Aluno' : null,
    definition.identification.showStudentCode ? 'Teste' : null,
    definition.identification.showClassroom ? 'Classe' : null,
    definition.identification.showDate ? 'Data' : null,
    definition.identification.showExamCode ? 'Codigo' : null,
    definition.identification.showSignature ? 'Assinatura' : null,
    ...definition.identification.extraFields,
  ].filter(Boolean) as string[]
}

export function getCardTemplateZones(state: CardTemplateEditorState) {
  const metrics = getTemplateLayoutMetrics(state.omrConfig)
  const identificationFields = getCardIdentificationFields(state)
  const safeLeft = TEMPLATE_PAGE_X + TEMPLATE_SAFE_MARGIN
  const safeTop = TEMPLATE_PAGE_Y + TEMPLATE_SAFE_MARGIN
  const safeRight = TEMPLATE_PAGE_X + TEMPLATE_PAGE_WIDTH - TEMPLATE_SAFE_MARGIN
  const safeBottom = TEMPLATE_PAGE_Y + TEMPLATE_PAGE_HEIGHT - TEMPLATE_SAFE_MARGIN
  const header = {
    x: safeLeft,
    y: safeTop,
    width: safeRight - safeLeft,
    height: 0,
  }
  const infoColumns = identificationFields.length > 4 ? 3 : 2
  const infoRows = Math.max(1, Math.ceil(Math.max(identificationFields.length, 1) / infoColumns))
  const info = {
    x: safeLeft,
    y: safeTop,
    width: safeRight - safeLeft,
    height: 18 + infoRows * 20,
    columns: infoColumns,
    rows: infoRows,
  }
  const instructions = {
    x: safeLeft,
    y: info.y + info.height + 14,
    width: safeRight - safeLeft,
    height: 24,
  }
  const footer = {
    top: safeBottom - TEMPLATE_TECHNICAL_FOOTER_HEIGHT,
    bottom: safeBottom,
    left: safeLeft,
    right: safeRight,
    width: safeRight - safeLeft,
    height: TEMPLATE_TECHNICAL_FOOTER_HEIGHT,
    logoX: safeLeft,
    logoWidth: 124,
    centerX: safeLeft + 140,
    centerWidth: 154,
    rightX: safeRight - 176,
    rightWidth: 176,
    codeBoxX: safeRight - 160,
    codeBoxWidth: 160,
    codeBoxHeight: 84,
    signatureX: safeLeft + 96,
    signatureWidth: 280,
  }
  const answers = {
    top: instructions.y + instructions.height + 24,
    bottom: footer.top - TEMPLATE_TECHNICAL_FOOTER_GAP,
    left: safeLeft + 34,
    right: safeRight - 8,
  }

  return {
    metrics,
    identificationFields,
    header,
    info,
    instructions,
    answers,
    footer,
    page: {
      x: TEMPLATE_PAGE_X,
      y: TEMPLATE_PAGE_Y,
      width: TEMPLATE_PAGE_WIDTH,
      height: TEMPLATE_PAGE_HEIGHT,
    },
    safeArea: {
      left: safeLeft,
      top: safeTop,
      right: safeRight,
      bottom: safeBottom,
    },
  }
}
