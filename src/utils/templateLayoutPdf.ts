import QRCode from 'qrcode'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type { CardTemplateEditorState } from '../types/omr'
import { getCardTemplateZones } from './cardTemplateZones'
import { wrapFooterMessage } from './footerMessageLayout'
import { getLogoBoxPlacement } from './logoLayout'
import { processLogoDataUrl } from './logoImageProcessing'
import { buildNormalizedRenderModel, getQuestionBlockQuestionConfig } from './questionBlocks'
import { formatQuestionLabel } from './questionNumbering'
import { getLabelTextFontSize, getTemplateRenderMetrics } from './templateRenderMetrics'
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

function getFooterMessageX(
  alignment: 'left' | 'center' | 'right',
  line: string,
  x: number,
  width: number,
  centerAnchorX: number,
  font: PDFFontLike,
  size: number,
  padding = 8,
) {
  const lineWidth = font.widthOfTextAtSize(line, size)
  if (alignment === 'left') return x + padding
  if (alignment === 'right') return x + width - padding - lineWidth
  return centerAnchorX - lineWidth / 2
}

type PDFFontLike = {
  widthOfTextAtSize: (text: string, size: number) => number
}

function getStudentDisplayName(student: TemplatePdfStudent) {
  return student.name.trim() || 'Aluno'
}

function getQuestionStyleStrokeWidth(style: 'classic' | 'lined' | 'minimal', baseWidth: number) {
  if (style === 'minimal') return Math.max(0.6, baseWidth - 0.35)
  if (style === 'lined') return baseWidth + 0.15
  return baseWidth
}

function getQuestionStyleLabelColor(style: 'classic' | 'lined' | 'minimal') {
  if (style === 'minimal') return rgb(0.58, 0.65, 0.72)
  if (style === 'lined') return rgb(0.278, 0.349, 0.412)
  return rgb(0.392, 0.455, 0.545)
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

async function buildLogoImage(pdf: PDFDocument, logoDataUrl: string, monochrome: boolean) {
  if (!logoDataUrl) return null
  const processedLogoDataUrl = await processLogoDataUrl(logoDataUrl, monochrome)
  if (processedLogoDataUrl.startsWith('data:image/png')) return pdf.embedPng(processedLogoDataUrl)
  if (processedLogoDataUrl.startsWith('data:image/jpeg') || processedLogoDataUrl.startsWith('data:image/jpg')) return pdf.embedJpg(processedLogoDataUrl)
  return null
}

export async function generateTemplateLayoutPdf(payload: TemplatePdfPayload) {
  const pdf = await PDFDocument.create()
  const fontRegular = await pdf.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const { definition } = payload.state
  const renderModel = buildNormalizedRenderModel(definition)
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
      const { pageKind, pageIndex, totalPages, metrics, questions, blockTitles, labels, openAnswers, mathBlocks, essays, signatures } = pageLayout
      const renderMetrics = getTemplateRenderMetrics(metrics)
      const cardId = createCardIdentifier(payload, student, pageIndex)
      const qrImage = await buildQrImage(pdf, cardId)
      const logoImage = await buildLogoImage(pdf, definition.header.institutionLogoDataUrl, definition.header.logoMonochrome)
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

      if (pageKind === 'essay') {
        for (const essay of essays) {
          if (essay.logoBox && logoImage) {
            const scale = Math.min(essay.logoBox.width / logoImage.width, essay.logoBox.height / logoImage.height)
            const drawWidth = logoImage.width * scale
            const drawHeight = logoImage.height * scale
            page.drawImage(logoImage, {
              x: essay.logoBox.x + (essay.logoBox.width - drawWidth) / 2,
              y: toPdfRectY(essay.logoBox.y + (essay.logoBox.height - drawHeight) / 2, drawHeight),
              width: drawWidth,
              height: drawHeight,
            })
          }

          if (essay.qrBox) {
            const essayQrImage = await buildQrImage(pdf, JSON.stringify({
              testId: payload.examId,
              studentId: student.id,
              code: student.studentCode,
            }))
            page.drawImage(essayQrImage, {
              x: essay.qrBox.x,
              y: toPdfRectY(essay.qrBox.y, essay.qrBox.size),
              width: essay.qrBox.size,
              height: essay.qrBox.size,
            })
          }

          const titleSize = 18
          const titleWidth = fontBold.widthOfTextAtSize(essay.title, titleSize)
          page.drawText(essay.title, {
            x: essay.x + essay.width / 2 - titleWidth / 2,
            y: toPdfY(essay.titleY),
            size: titleSize,
            font: fontBold,
            color: rgb(0.059, 0.09, 0.165),
          })

          essay.headerFields.forEach((field) => {
            const value =
              field.key === 'studentName'
                ? getStudentDisplayName(student)
                : field.key === 'class'
                  ? student.classroomName || payload.classroomName
                  : field.key === 'testName'
                    ? payload.examName
                    : field.key === 'code'
                      ? student.studentCode
                      : ''
            page.drawText(field.label, {
              x: field.x,
              y: toPdfY(field.y),
              size: 8,
              font: fontBold,
              color: rgb(0.059, 0.09, 0.165),
            })
            if (value) {
              page.drawText(value, {
                x: field.lineX,
                y: toPdfY(field.y),
                size: 8,
                font: fontRegular,
                color: rgb(0.278, 0.349, 0.412),
              })
            } else {
              page.drawLine({
                start: { x: field.lineX, y: toPdfY(field.y) },
                end: { x: field.lineX + field.lineWidth, y: toPdfY(field.y) },
                thickness: 0.8,
                color: rgb(0.392, 0.455, 0.545),
              })
            }
          })

          if (essay.showEssayTitleField) {
            page.drawText('Título da redação:', {
              x: essay.x,
              y: toPdfY(essay.essayTitleLabelY),
              size: 8,
              font: fontBold,
              color: rgb(0.059, 0.09, 0.165),
            })
            page.drawLine({
              start: { x: essay.x + 84, y: toPdfY(essay.essayTitleLineY) },
              end: { x: essay.x + essay.width, y: toPdfY(essay.essayTitleLineY) },
              thickness: 0.8,
              color: rgb(0.392, 0.455, 0.545),
            })
          }

          if (essay.style === 'box') {
            page.drawRectangle({
              x: essay.answerBox.x,
              y: toPdfRectY(essay.answerBox.y, essay.answerBox.height),
              width: essay.answerBox.width,
              height: essay.answerBox.height,
              borderColor: rgb(0.392, 0.455, 0.545),
              borderWidth: 1,
            })
          }

          essay.lineLayouts.forEach((line) => {
            if (line.highlight) {
              page.drawRectangle({
                x: essay.x,
                y: toPdfRectY(line.lineY - 12, 14),
                width: 24,
                height: 14,
                color: rgb(0.886, 0.91, 0.941),
              })
            }
            const numberLabel = String(line.number)
            const numberWidth = fontBold.widthOfTextAtSize(numberLabel, 8)
            page.drawText(numberLabel, {
              x: line.numberX - numberWidth,
              y: toPdfY(line.numberY),
              size: 8,
              font: fontBold,
              color: rgb(0.278, 0.349, 0.412),
            })
            page.drawLine({
              start: { x: line.lineX, y: toPdfY(line.lineY) },
              end: { x: line.lineX + line.lineWidth, y: toPdfY(line.lineY) },
              thickness: essay.style === 'box' ? 0.35 : 0.7,
              color: rgb(0.58, 0.65, 0.72),
              opacity: essay.style === 'box' ? 0.45 : 1,
            })
          })
        }
        continue
      }

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

      if (definition.header.showInstructions) {
        const instructionText = definition.header.instructions || 'Marque apenas uma alternativa e preencha todo o campo da bolinha'
        const instructionWidth = fontRegular.widthOfTextAtSize(instructionText, renderMetrics.instructionFontSize)
        page.drawText(
          instructionText,
          {
            x: zones.instructions.x + (zones.instructions.width - instructionWidth) / 2,
            y: toPdfY(zones.instructions.y + renderMetrics.instructionOffsetY),
            size: renderMetrics.instructionFontSize,
            font: fontRegular,
            color: rgb(0.2, 0.2, 0.2),
          },
        )
      }

      blockTitles.forEach((blockTitle) => {
        const titleWidth = fontBold.widthOfTextAtSize(blockTitle.title, renderMetrics.blockTitleFontSize)
        const titleX = blockTitle.x + renderMetrics.blockTitlePaddingX
        const badgeX = titleX - 4
        const badgeTop = blockTitle.y
        const badgeWidth = titleWidth + 8
        const badgeHeight = blockTitle.sectionHeight

        page.drawRectangle({
          x: badgeX,
          y: toPdfRectY(badgeTop, badgeHeight),
          width: badgeWidth,
          height: badgeHeight,
          color: rgb(1, 1, 1),
        })
        page.drawText(blockTitle.title, {
          x: titleX,
          y: toPdfY(blockTitle.textY),
          size: renderMetrics.blockTitleFontSize,
          font: fontBold,
          color: rgb(0.059, 0.09, 0.165),
        })
      })

      labels.forEach((label) => {
        const labelFontSize = getLabelTextFontSize(label.size)
        const lineWidth = fontBold.widthOfTextAtSize(label.text, labelFontSize)
        const labelX =
          label.align === 'center'
            ? label.x + (label.width - lineWidth) / 2
            : label.align === 'right'
              ? label.x + label.width - lineWidth
              : label.x

        page.drawText(label.text, {
          x: labelX,
          y: toPdfY(label.textY),
          size: labelFontSize,
          font: fontBold,
          color: rgb(0.059, 0.09, 0.165),
        })
      })

      openAnswers.forEach((openAnswer) => {
        page.drawText(openAnswer.linkedQuestionNumber ? `${openAnswer.label} — Questão ${openAnswer.linkedQuestionNumber}` : openAnswer.label, {
          x: openAnswer.x,
          y: toPdfY(openAnswer.labelY),
          size: openAnswer.fontSize,
          font: fontBold,
          color: rgb(0.059, 0.09, 0.165),
        })

        if (openAnswer.lineStyle === 'box') {
          page.drawRectangle({
            x: openAnswer.x,
            y: toPdfRectY(openAnswer.answerTopY, openAnswer.answerHeight),
            width: openAnswer.width,
            height: openAnswer.answerHeight,
            borderColor: rgb(0.58, 0.65, 0.72),
            borderWidth: 1,
          })
          return
        }

        openAnswer.lineYs.forEach((lineY) => {
          page.drawLine({
            start: { x: openAnswer.x, y: toPdfY(lineY) },
            end: { x: openAnswer.x + openAnswer.width, y: toPdfY(lineY) },
            thickness: 0.8,
            color: rgb(0.58, 0.65, 0.72),
          })
        })
      })

      mathBlocks.forEach((mathBlock) => {
        if (mathBlock.linkedQuestionNumber) {
          page.drawText(`Questão matemática — Questão ${mathBlock.linkedQuestionNumber}`, {
            x: mathBlock.x,
            y: toPdfY(mathBlock.titleY),
            size: 9,
            font: fontBold,
            color: rgb(0.059, 0.09, 0.165),
          })
        }

        if (mathBlock.showColumnHeaders) {
          mathBlock.columnXs.forEach((columnX, columnIndex) => {
            const headerText = mathBlock.columnHeaders[columnIndex] ?? ''
            const headerWidth = fontBold.widthOfTextAtSize(headerText, 8)
            page.drawText(headerText, {
              x: columnX - headerWidth / 2,
              y: toPdfY(mathBlock.headerY),
              size: 8,
              font: fontBold,
              color: rgb(0.059, 0.09, 0.165),
            })
          })
        }

        if (mathBlock.showTopInputRow) {
          mathBlock.columnXs.forEach((columnX) => {
            const boxX = Math.round(columnX - mathBlock.inputBoxWidth / 2)
            const boxTopY = Math.round(mathBlock.topInputY - mathBlock.inputBoxHeight / 2)
            page.drawRectangle({
              x: boxX,
              y: toPdfRectY(boxTopY, mathBlock.inputBoxHeight),
              width: mathBlock.inputBoxWidth,
              height: mathBlock.inputBoxHeight,
              borderColor: rgb(0.835, 0.871, 0.914),
              borderWidth: 0.85,
            })
          })
        }

        if (mathBlock.showColumnSeparators) {
          mathBlock.columnXs.forEach((columnX, columnIndex) => {
            const separatorText = mathBlock.columnSeparators[columnIndex] ?? ''
            const separatorWidth = fontBold.widthOfTextAtSize(separatorText, 8)
            page.drawText(separatorText, {
              x: columnX - separatorWidth / 2,
              y: toPdfY(mathBlock.separatorY),
              size: 8,
              font: fontBold,
              color: rgb(0.278, 0.349, 0.412),
            })
          })
        }

        mathBlock.rows.forEach((row) => {
          const rowDigit = String(row.digit)

          mathBlock.columnXs.forEach((columnX) => {
            page.drawCircle({
              x: columnX,
              y: toPdfY(row.y),
              size: mathBlock.bubbleRadius,
              borderColor: rgb(0.059, 0.09, 0.165),
              borderWidth: renderMetrics.bubbleStrokeWidthPdf,
              color: rgb(1, 1, 1),
            })
            const digitWidth = fontBold.widthOfTextAtSize(rowDigit, 6.5)
            page.drawText(rowDigit, {
              x: columnX - digitWidth / 2,
              y: toPdfY(row.y + renderMetrics.bubbleLabelOffsetY),
              size: renderMetrics.bubbleLabelFontSize,
              font: fontBold,
              color: rgb(0.278, 0.349, 0.412),
            })
          })
        })
      })

      signatures.forEach((signature) => {
        page.drawLine({
          start: { x: signature.x, y: toPdfY(signature.lineY) },
          end: { x: signature.x + signature.width, y: toPdfY(signature.lineY) },
          thickness: 1,
          color: rgb(0.392, 0.455, 0.545),
        })

        const labelWidth = fontBold.widthOfTextAtSize(signature.label, signature.fontSize)
        const labelX =
          signature.labelAnchor === 'middle'
            ? signature.labelX - labelWidth / 2
            : signature.labelAnchor === 'end'
              ? signature.labelX - labelWidth
              : signature.labelX

        page.drawText(signature.label, {
          x: labelX,
          y: toPdfY(signature.labelY),
          size: signature.fontSize,
          font: fontBold,
          color: rgb(0.278, 0.349, 0.412),
        })
      })

      questions.forEach((question) => {
        const questionLabel = formatQuestionLabel(question.numberingFormat, question, {
          choicesPerQuestion: question.choicesPerQuestion,
          blockStartQuestion: question.blockStartQuestion,
          localQuestionIndex: question.localQuestionIndex,
        })
        const questionLabelWidth = fontRegular.widthOfTextAtSize(questionLabel, renderMetrics.questionFontSize)
        page.drawText(questionLabel, {
          x: question.labelX - questionLabelWidth,
          y: toPdfY(question.labelY + renderMetrics.questionOffsetY),
          size: renderMetrics.questionFontSize,
          font: fontRegular,
          color: rgb(0.278, 0.349, 0.412),
        })

        const logicalQuestion = renderModel.logicalQuestionMap.get(question.questionNumber)
        if (logicalQuestion && logicalQuestion.type !== 'objective' && logicalQuestion.markerLabel) {
          const markerWidth = fontBold.widthOfTextAtSize(logicalQuestion.markerLabel, Math.max(renderMetrics.questionFontSize - 0.2, 8.5))
          page.drawText(logicalQuestion.markerLabel, {
            x: question.optionStartX + question.optionGroupWidth / 2 - markerWidth / 2,
            y: toPdfY(question.optionY + renderMetrics.bubbleLabelOffsetY),
            size: Math.max(renderMetrics.questionFontSize - 0.2, 8.5),
            font: fontBold,
            color: rgb(0.059, 0.09, 0.165),
          })
          return
        }

        const blockConfig = getQuestionBlockQuestionConfig(definition, question.questionNumber)
        blockConfig.optionLabels.forEach((option, optionIndex) => {
          const centerX = question.optionStartX + optionIndex * question.optionSpacing
          const centerY = toPdfY(question.optionY)
          page.drawCircle({
            x: centerX,
            y: centerY,
            size: metrics.bubbleRadius,
            borderColor: rgb(0.059, 0.09, 0.165),
            borderWidth: getQuestionStyleStrokeWidth(blockConfig.questionStyle, renderMetrics.bubbleStrokeWidthPdf),
          })
          page.drawText(option, {
            x: centerX - renderMetrics.bubbleLabelFontSize * 0.37,
            y: centerY - renderMetrics.bubbleLabelOffsetY,
            size: renderMetrics.bubbleLabelFontSize,
            font: fontRegular,
            color: getQuestionStyleLabelColor(blockConfig.questionStyle),
          })
        })
      })

      page.drawLine({
        start: { x: zones.footer.left, y: toPdfY(zones.footer.top) },
        end: { x: zones.footer.right, y: toPdfY(zones.footer.top) },
        thickness: 1,
        color: rgb(0.796, 0.835, 0.898),
      })
      if (definition.header.showInstitutionLogo) {
        if (logoImage) {
          const logoBox = getLogoBoxPlacement(definition.header, {
            x: zones.footer.logoX,
            y: zones.footer.top + 16,
            width: zones.footer.logoWidth,
            height: 38,
          })
          const scale = Math.min(logoBox.width / logoImage.width, logoBox.height / logoImage.height)
          const drawWidth = logoImage.width * scale
          const drawHeight = logoImage.height * scale
          page.drawImage(logoImage, {
            x: logoBox.x + (logoBox.width - drawWidth) / 2,
            y: toPdfRectY(logoBox.y + (logoBox.height - drawHeight) / 2, drawHeight),
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

      const footerFontSize = definition.header.footerMessageFontSize
      const footerLineGap = footerFontSize + 1.5
      const footerMaxChars = Math.max(16, Math.round(32 - (footerFontSize - 7) * 3))
      const footerLines = wrapFooterMessage(definition.header.footerMessage, { maxCharsPerLine: footerMaxChars, maxLines: 2 })
      const footerFont = definition.header.footerMessageWeight === 'semibold' ? fontBold : fontRegular
      const pageTextY = definition.header.footerPagePosition === 'top' ? zones.footer.top + 22 : zones.footer.bottom - 8
      const footerMessageStartY = definition.header.footerPagePosition === 'top' ? zones.footer.top + 42 : zones.footer.top + 30
      if (footerLines.length) {
        footerLines.forEach((line, index) => {
          page.drawText(line, {
            x: getFooterMessageX(
              definition.header.footerMessageAlignment,
              line,
              zones.footer.centerX,
              zones.footer.centerWidth,
              zones.footer.centerAnchorX,
              footerFont,
              footerFontSize,
            ),
            y: toPdfY(footerMessageStartY + index * footerLineGap),
            size: footerFontSize,
            font: footerFont,
            color: rgb(0.278, 0.349, 0.412),
          })
        })
      }
      const pageLabel = `Página ${pageIndex + 1}/${totalPages}`
      const pageFont = definition.header.footerPageTone === 'standard' ? fontBold : fontRegular
      page.drawText(pageLabel, {
        x: zones.footer.centerAnchorX - pageFont.widthOfTextAtSize(pageLabel, 7) / 2,
        y: toPdfY(pageTextY),
        size: 7,
        font: pageFont,
        color: definition.header.footerPageTone === 'standard' ? rgb(0.278, 0.349, 0.412) : rgb(0.392, 0.455, 0.545),
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
        const qrBoxX = zones.footer.codeBoxX + (zones.footer.codeBoxWidth - 92) / 2
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






