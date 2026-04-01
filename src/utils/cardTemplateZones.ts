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
import { clampLogoScale } from './logoLayout'

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
  const { definition } = state
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
  const instructionHeight = definition.header.showInstructions ? 24 : 0
  const instructions = {
    x: safeLeft,
    y: info.y + info.height + 14,
    width: safeRight - safeLeft,
    height: instructionHeight,
  }
  const footerGap = 16
  const qrBlockWidth = 136
  const logoBlockWidth = definition.header.showInstitutionLogo
    ? Math.round(92 + clampLogoScale(definition.header.logoScale) * 54)
    : 92
  const centerLeft = safeLeft + logoBlockWidth + footerGap
  const centerRight = safeRight - qrBlockWidth - footerGap
  const centerWidth = Math.max(140, centerRight - centerLeft)
  const codeBoxWidth = 108
  const codeBoxHeight = 84
  const codeBlockX = safeRight - qrBlockWidth
  const codeBoxX = codeBlockX + (qrBlockWidth - codeBoxWidth) / 2
  const footer = {
    top: safeBottom - TEMPLATE_TECHNICAL_FOOTER_HEIGHT,
    bottom: safeBottom,
    left: safeLeft,
    right: safeRight,
    width: safeRight - safeLeft,
    height: TEMPLATE_TECHNICAL_FOOTER_HEIGHT,
    gap: footerGap,
    logoX: safeLeft,
    logoWidth: logoBlockWidth,
    centerX: centerLeft,
    centerWidth,
    centerAnchorX: safeLeft + (safeRight - safeLeft) / 2,
    rightX: codeBlockX,
    rightWidth: qrBlockWidth,
    codeBoxX,
    codeBoxWidth,
    codeBoxHeight,
    signatureX: safeLeft,
    signatureWidth: Math.max(96, centerLeft - safeLeft - 18),
  }
  const answers = {
    top: instructions.y + instructions.height + (definition.header.showInstructions ? 24 : 14),
    bottom: footer.top - TEMPLATE_TECHNICAL_FOOTER_GAP,
    left: safeLeft + 2,
    right: safeRight - 2,
  }
  const metrics = getTemplateLayoutMetrics(state.omrConfig, definition, { left: answers.left, right: answers.right })

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
