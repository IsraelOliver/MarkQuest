import QRCode from 'qrcode'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type { CardTemplateEditorState } from '../types/omr'
import { getCardTemplateZones } from './cardTemplateZones'
import { formatQuestionLabel } from './questionNumbering'
import { TEMPLATE_PAGE_HEIGHT, TEMPLATE_PAGE_WIDTH, TEMPLATE_PAGE_X, TEMPLATE_PAGE_Y } from './templateLayoutGeometry'
import { getPaginatedTemplatePages } from './templatePageLayout'

type TemplatePdfStudent = {
  id: string
  name: string
  classroomName: string
  studentCode: string
}

type TemplatePdfPayload = {
  title: string
  examId: string
  examName: string
  classroomId: string
  classroomName: string
  unitName: string
  templateId: string
  state: CardTemplateEditorState
  students: TemplatePdfStudent[]
}

function toPdfY(value: number) {
  return TEMPLATE_PAGE_HEIGHT + TEMPLATE_PAGE_Y - value
}

function toPdfRectY(top: number, height: number) {
  return TEMPLATE_PAGE_HEIGHT + TEMPLATE_PAGE_Y - top - height
}

function sanitizeFileName(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function getStudentDisplayName(student: TemplatePdfStudent) {
  return student.name.trim() || 'Aluno'
}

function createCardIdentifier(payload: TemplatePdfPayload, student: TemplatePdfStudent, pageIndex: number) {
  return `mqc_${payload.examId.slice(-4)}${payload.templateId.slice(-4)}${student.id.slice(-4)}${String(pageIndex + 1).padStart(2, '0')}`.toUpperCase()
}

async function buildQrImage(pdf: PDFDocument, qrPayload: string) {
  const dataUrl = await QRCode.toDataURL(qrPayload, {
    errorCorrectionLevel: 'L',
    margin: 4,
    width: 320,
    color: { dark: '#000000', light: '#ffffff' },
  })

  return pdf.embedPng(dataUrl)
}

async function buildLogoImage(pdf: PDFDocument, logoDataUrl: string) {
  if (!logoDataUrl) return null
  if (logoDataUrl.startsWith('data:image/png')) return pdf.embedPng(logoDataUrl)
  if (logoDataUrl.startsWith('data:image/jpeg') || logoDataUrl.startsWith('data:image/jpg')) return pdf.embedJpg(logoDataUrl)
  return null
}

export async function generateTemplateLayoutPdf(payload: TemplatePdfPayload) {
  const pdf = await PDFDocument.create()
  const fontRegular = await pdf.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const { definition } = payload.state
  const zones = getCardTemplateZones(payload.state)
  const pages = getPaginatedTemplatePages(payload.state)

  const students = payload.students.length
    ? payload.students
    : [
        {
          id: 'student-generic',
          name: 'Aluno',
          classroomName: payload.classroomName,
          studentCode: 'SEM-CODIGO',
        },
      ]

  for (const student of students) {
    for (const pageLayout of pages) {
      const { pageIndex, totalPages, metrics } = pageLayout
      const cardId = createCardIdentifier(payload, student, pageIndex)
      const qrImage = await buildQrImage(pdf, cardId)
      const logoImage = await buildLogoImage(pdf, definition.header.institutionLogoDataUrl)
      const page = pdf.addPage([TEMPLATE_PAGE_WIDTH + TEMPLATE_PAGE_X * 2, TEMPLATE_PAGE_HEIGHT + TEMPLATE_PAGE_Y * 2])

      page.drawRectangle({
        x: 0,
        y: 0,
        width: TEMPLATE_PAGE_WIDTH + TEMPLATE_PAGE_X * 2,
        height: TEMPLATE_PAGE_HEIGHT + TEMPLATE_PAGE_Y * 2,
        color: rgb(1, 1, 1),
      })

      page.drawRectangle({
        x: zones.page.x,
        y: toPdfRectY(zones.page.y, zones.page.height),
        width: zones.page.width,
        height: zones.page.height,
        borderColor: rgb(0.831, 0.855, 0.89),
        borderWidth: 1,
      })

      const identificationRows = [
        ['Aluno', getStudentDisplayName(student)],
        ['Teste', payload.examName],
        ['Classe', student.classroomName || payload.classroomName],
        ['Código', student.studentCode],
      ]

      identificationRows.forEach(([label, value], index) => {
        const columnIndex = index % zones.info.columns
        const rowIndex = Math.floor(index / zones.info.columns)
        const cellWidth = zones.info.width / zones.info.columns
        const fieldX = zones.info.x + columnIndex * cellWidth + 4
        const fieldY = zones.info.y + 14 + rowIndex * 20

        page.drawText(`${label}:`, {
          x: fieldX,
          y: toPdfY(fieldY),
          size: 10,
          font: fontBold,
          color: rgb(0.059, 0.09, 0.165),
        })
        page.drawText(value, {
          x: fieldX + 54,
          y: toPdfY(fieldY),
          size: 9,
          font: fontRegular,
          color: rgb(0.278, 0.349, 0.412),
        })
      })

      page.drawText(
        definition.header.instructions || 'Marque apenas uma alternativa por questão e mantenha o cartão limpo.',
        {
          x: zones.instructions.x + 64,
          y: toPdfY(zones.instructions.y + 14),
          size: 8,
          font: fontRegular,
          color: rgb(0.2, 0.2, 0.2),
        },
      )

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
        page.drawText(formatQuestionLabel(definition.numberingMode, definition.numberingPattern, question), {
          x: question.labelX - 8,
          y: toPdfY(question.labelY + 3),
          size: 8,
          font: fontRegular,
          color: rgb(0.278, 0.349, 0.412),
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

      page.drawLine({
        start: { x: zones.footer.left, y: toPdfY(zones.footer.top) },
        end: { x: zones.footer.right, y: toPdfY(zones.footer.top) },
        thickness: 1,
        color: rgb(0.796, 0.835, 0.898),
      })
      page.drawLine({
        start: { x: zones.footer.centerX - 14, y: toPdfY(zones.footer.top + 10) },
        end: { x: zones.footer.centerX - 14, y: toPdfY(zones.footer.bottom - 14) },
        thickness: 0.8,
        color: rgb(0.886, 0.91, 0.941),
      })
      page.drawLine({
        start: { x: zones.footer.rightX - 14, y: toPdfY(zones.footer.top + 10) },
        end: { x: zones.footer.rightX - 14, y: toPdfY(zones.footer.bottom - 14) },
        thickness: 0.8,
        color: rgb(0.886, 0.91, 0.941),
      })

      if (definition.header.showInstitutionLogo) {
        if (logoImage) {
          const maxWidth = zones.footer.logoWidth
          const maxHeight = 38
          const scale = Math.min(maxWidth / logoImage.width, maxHeight / logoImage.height)
          const drawWidth = logoImage.width * scale
          const drawHeight = logoImage.height * scale
          page.drawImage(logoImage, {
            x: zones.footer.logoX + (maxWidth - drawWidth) / 2,
            y: toPdfRectY(zones.footer.top + 16 + (maxHeight - drawHeight) / 2, drawHeight),
            width: drawWidth,
            height: drawHeight,
          })
        } else {
          page.drawRectangle({
            x: zones.footer.logoX,
            y: toPdfRectY(zones.footer.top + 16, 38),
            width: zones.footer.logoWidth,
            height: 38,
            borderColor: rgb(0.859, 0.886, 0.918),
            borderWidth: 1,
            borderDashArray: [6, 4],
          })
        }
      }

      if (definition.header.footerMessage) {
        page.drawText(definition.header.footerMessage, {
          x: zones.footer.centerX + 8,
          y: toPdfY(zones.footer.top + 34),
          size: 7,
          font: fontRegular,
          color: rgb(0.278, 0.349, 0.412),
        })
      }
      page.drawText(`Página ${pageIndex + 1}/${totalPages}`, {
        x: zones.footer.centerX + 42,
        y: toPdfY(zones.footer.bottom - 8),
        size: 7,
        font: fontRegular,
        color: rgb(0.392, 0.455, 0.545),
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
        const cardIdSize = 8
        const cardIdWidth = fontBold.widthOfTextAtSize(cardId, cardIdSize)
        const qrBoxX = zones.footer.codeBoxX + 24
        const qrBoxSize = 92
        const qrCenterX = qrBoxX + qrBoxSize / 2
        page.drawText(cardId, {
          x: qrCenterX - cardIdWidth / 2,
          y: toPdfY(zones.footer.top + 22),
          size: cardIdSize,
          font: fontBold,
          color: rgb(0.059, 0.09, 0.165),
        })

        page.drawRectangle({
          x: qrBoxX,
          y: toPdfRectY(zones.footer.top + 26, 92),
          width: qrBoxSize,
          height: qrBoxSize,
          color: rgb(1, 1, 1),
        })
        page.drawImage(qrImage, {
          x: qrBoxX,
          y: toPdfRectY(zones.footer.top + 26, 92),
          width: qrBoxSize,
          height: qrBoxSize,
        })
      }
    }
  }

  const pdfBytes = await pdf.save()
  const fileName = `${sanitizeFileName(payload.title || payload.examName || 'layout-provas') || 'layout-provas'}.pdf`
  return { pdfBytes, fileName }
}
