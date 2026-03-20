import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type { CardTemplateEditorState } from '../types/omr'
import { getCardTemplateZones } from './cardTemplateZones'
import { TEMPLATE_VIEWBOX_HEIGHT, TEMPLATE_VIEWBOX_WIDTH } from './templateLayoutGeometry'

type TemplatePdfPayload = {
  title: string
  examName: string
  classroomName: string
  unitName: string
  state: CardTemplateEditorState
}

function toPdfY(value: number) {
  return TEMPLATE_VIEWBOX_HEIGHT - value
}

function toPdfRectY(top: number, height: number) {
  return TEMPLATE_VIEWBOX_HEIGHT - top - height
}

function sanitizeFileName(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function generateTemplateLayoutPdf(payload: TemplatePdfPayload) {
  const pdf = await PDFDocument.create()
  const page = pdf.addPage([TEMPLATE_VIEWBOX_WIDTH, TEMPLATE_VIEWBOX_HEIGHT])
  const fontRegular = await pdf.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const { definition } = payload.state
  const zones = getCardTemplateZones(payload.state)
  const { metrics } = zones

  page.drawRectangle({
    x: 0,
    y: 0,
    width: TEMPLATE_VIEWBOX_WIDTH,
    height: TEMPLATE_VIEWBOX_HEIGHT,
    color: rgb(1, 1, 1),
  })

  page.drawRectangle({
    x: zones.page.x,
    y: toPdfRectY(zones.page.y, zones.page.height),
    width: zones.page.width,
    height: zones.page.height,
    borderColor: rgb(0.859, 0.929, 0.996),
    borderWidth: 1,
  })

  page.drawRectangle({
    x: zones.header.x,
    y: toPdfRectY(zones.header.y, zones.header.height),
    width: zones.header.width,
    height: zones.header.height,
    color: rgb(0.8, 0.984, 0.945),
  })

  page.drawText('INSTITUICAO', {
    x: zones.header.x + 18,
    y: toPdfY(zones.header.y + 18),
    size: 8,
    font: fontBold,
    color: rgb(0.078, 0.306, 0.29),
  })

  page.drawText(definition.header.examName || payload.title, {
    x: zones.header.x + 18,
    y: toPdfY(zones.header.y + 48),
    size: 20,
    font: fontBold,
    color: rgb(0.059, 0.09, 0.165),
  })

  page.drawText(definition.header.subtitle || 'Cartao-resposta oficial', {
    x: zones.header.x + 18,
    y: toPdfY(zones.header.y + 66),
    size: 9,
    font: fontRegular,
    color: rgb(0.278, 0.349, 0.412),
  })

  page.drawRectangle({
    x: zones.header.x + zones.header.width - 104,
    y: toPdfRectY(zones.header.y + 10, 52),
    width: 88,
    height: 52,
    borderColor: rgb(0.6, 0.965, 0.894),
    borderWidth: 1,
  })
  page.drawText(definition.pageSize, {
    x: zones.header.x + zones.header.width - 84,
    y: toPdfY(zones.header.y + 30),
    size: 11,
    font: fontBold,
    color: rgb(0.059, 0.09, 0.165),
  })
  page.drawText('Leitura OMR segura', {
    x: zones.header.x + zones.header.width - 84,
    y: toPdfY(zones.header.y + 46),
    size: 6,
    font: fontRegular,
    color: rgb(0.392, 0.455, 0.545),
  })

  zones.identificationFields.forEach((field, index) => {
    const columnIndex = index % zones.info.columns
    const rowIndex = Math.floor(index / zones.info.columns)
    const cellWidth = zones.info.width / zones.info.columns
    const fieldX = zones.info.x + columnIndex * cellWidth + 10
    const fieldY = zones.info.y + 12 + rowIndex * 20

    page.drawText(`${field}:`, {
      x: fieldX,
      y: toPdfY(fieldY),
      size: 10,
      font: fontBold,
      color: rgb(0.059, 0.09, 0.165),
    })
    page.drawLine({
      start: { x: fieldX + 54, y: toPdfY(fieldY - 3) },
      end: { x: fieldX + cellWidth - 22, y: toPdfY(fieldY - 3) },
      thickness: 0.8,
      color: rgb(0.796, 0.835, 0.898),
    })
  })

  page.drawText(
    definition.header.instructions || 'Marque assim: bolha totalmente preenchida. Nao marque assim: X, circulo parcial ou check.',
    {
      x: zones.instructions.x + 72,
      y: toPdfY(zones.instructions.y + 14),
      size: 8,
      font: fontRegular,
      color: rgb(0.2, 0.2, 0.2),
    },
  )

  if (definition.showBlockTitles) {
    Array.from({ length: definition.columns }, (_, columnIndex) => {
      const titleX = metrics.questionStartX + columnIndex * metrics.columnOffset - 40
      const blockTitle = definition.groupByArea ? `Parte ${columnIndex + 1}` : `Bloco ${columnIndex + 1}`
      page.drawText(blockTitle, {
        x: titleX,
        y: toPdfY(zones.answers.top + 6),
        size: 9,
        font: fontBold,
        color: rgb(0.059, 0.09, 0.165),
      })
    })
  }

  Array.from({ length: definition.columns }, (_, columnIndex) => {
    const headerX = metrics.questionStartX + columnIndex * metrics.columnOffset
    metrics.activeOptions.forEach((option, optionIndex) => {
      page.drawText(option, {
        x: headerX + optionIndex * metrics.bubbleSpacing - 3,
        y: toPdfY(metrics.headerY),
        size: 8,
        font: fontBold,
        color: rgb(0.078, 0.306, 0.29),
      })
    })
  })

  metrics.questions.forEach((question) => {
    page.drawText(String(question.questionNumber), {
      x: question.labelX - 8,
      y: toPdfY(question.labelY + 4),
      size: 8,
      font: fontBold,
      color: rgb(0.059, 0.09, 0.165),
    })

    page.drawLine({
      start: { x: question.labelX - metrics.questionLabelWidth, y: toPdfY(question.optionY) },
      end: {
        x: question.optionStartX + metrics.answerBlockWidth + metrics.bubbleRadius,
        y: toPdfY(question.optionY),
      },
      thickness: 0.5,
      color: rgb(0.85, 0.89, 0.93),
    })

    metrics.activeOptions.forEach((option, optionIndex) => {
      const centerX = question.optionStartX + optionIndex * metrics.bubbleSpacing
      const centerY = toPdfY(question.optionY)
      page.drawCircle({
        x: centerX,
        y: centerY,
        size: metrics.bubbleRadius,
        borderColor: rgb(0.059, 0.09, 0.165),
        borderWidth: 1.1,
      })
      page.drawText(option, {
        x: centerX - 2.5,
        y: centerY - metrics.bubbleRadius - 9,
        size: 6,
        font: fontRegular,
        color: rgb(0.392, 0.455, 0.545),
      })
    })
  })

  if (definition.identification.showSignature) {
    page.drawLine({
      start: { x: zones.footer.signatureX, y: toPdfY(zones.footer.top + 34) },
      end: { x: zones.footer.signatureX + zones.footer.signatureWidth, y: toPdfY(zones.footer.top + 34) },
      thickness: 1,
      color: rgb(0.796, 0.835, 0.898),
    })
    page.drawText('Assinatura do aluno', {
      x: zones.footer.signatureX + 70,
      y: toPdfY(zones.footer.top + 54),
      size: 9,
      font: fontBold,
      color: rgb(0.059, 0.09, 0.165),
    })
  }

  if (definition.identification.showExamCode) {
    page.drawRectangle({
      x: zones.footer.codeBoxX,
      y: toPdfRectY(zones.footer.top + 10, zones.footer.codeBoxHeight),
      width: zones.footer.codeBoxWidth,
      height: zones.footer.codeBoxHeight,
      borderColor: rgb(0.6, 0.965, 0.894),
      borderWidth: 1,
      color: rgb(0.973, 0.98, 0.988),
    })
    page.drawText(`COD-${definition.totalQuestions}`, {
      x: zones.footer.codeBoxX + 14,
      y: toPdfY(zones.footer.top + 38),
      size: 11,
      font: fontBold,
      color: rgb(0.059, 0.09, 0.165),
    })
    page.drawText('Codigo da prova', {
      x: zones.footer.codeBoxX + 14,
      y: toPdfY(zones.footer.top + 55),
      size: 6,
      font: fontRegular,
      color: rgb(0.392, 0.455, 0.545),
    })
  }

  page.drawText('MarkQuest', {
    x: zones.page.x + 26,
    y: toPdfY(zones.page.y + zones.page.height - 22),
    size: 14,
    font: fontBold,
    color: rgb(0.059, 0.463, 0.431),
  })
  page.drawText(payload.unitName, {
    x: zones.page.x + zones.page.width / 2 - 32,
    y: toPdfY(zones.page.y + zones.page.height - 22),
    size: 7,
    font: fontRegular,
    color: rgb(0.392, 0.455, 0.545),
  })
  page.drawText(payload.classroomName, {
    x: zones.page.x + zones.page.width - 90,
    y: toPdfY(zones.page.y + zones.page.height - 22),
    size: 7,
    font: fontRegular,
    color: rgb(0.392, 0.455, 0.545),
  })

  const pdfBytes = await pdf.save()
  const fileName = `${sanitizeFileName(payload.title || 'template-layout') || 'template-layout'}.pdf`
  return { pdfBytes, fileName }
}
