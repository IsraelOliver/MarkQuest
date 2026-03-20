import type { CardTemplateEditorState } from '../types/omr'
import {
  getTemplateLayoutMetrics,
  TEMPLATE_PAGE_HEIGHT,
  TEMPLATE_PAGE_WIDTH,
  TEMPLATE_PAGE_X,
  TEMPLATE_PAGE_Y,
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
  const header = {
    x: TEMPLATE_PAGE_X + 26,
    y: TEMPLATE_PAGE_Y + 26,
    width: TEMPLATE_PAGE_WIDTH - 52,
    height: 72,
  }
  const infoColumns = identificationFields.length > 4 ? 3 : 2
  const infoRows = Math.max(1, Math.ceil(Math.max(identificationFields.length, 1) / infoColumns))
  const info = {
    x: TEMPLATE_PAGE_X + 22,
    y: header.y + header.height + 12,
    width: TEMPLATE_PAGE_WIDTH - 44,
    height: 18 + infoRows * 20,
    columns: infoColumns,
    rows: infoRows,
  }
  const instructions = {
    x: TEMPLATE_PAGE_X + 22,
    y: info.y + info.height + 10,
    width: TEMPLATE_PAGE_WIDTH - 44,
    height: 24,
  }
  const answers = {
    top: instructions.y + instructions.height + 28,
    bottom: TEMPLATE_PAGE_Y + TEMPLATE_PAGE_HEIGHT - 128,
    left: TEMPLATE_PAGE_X + 64,
    right: TEMPLATE_PAGE_X + TEMPLATE_PAGE_WIDTH - 32,
  }
  const footer = {
    top: TEMPLATE_PAGE_Y + TEMPLATE_PAGE_HEIGHT - 108,
    bottom: TEMPLATE_PAGE_Y + TEMPLATE_PAGE_HEIGHT - 26,
    codeBoxX: TEMPLATE_PAGE_X + TEMPLATE_PAGE_WIDTH - 160,
    codeBoxWidth: 114,
    codeBoxHeight: 62,
    signatureX: TEMPLATE_PAGE_X + 118,
    signatureWidth: 312,
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
  }
}
