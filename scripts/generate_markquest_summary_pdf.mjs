import fs from 'node:fs'
import path from 'node:path'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

const rootDir = process.cwd()
const sourcePath = path.join(rootDir, 'docs', 'markquest-resumo-projeto.md')
const outputPath = path.join(rootDir, 'docs', 'MarkQuest-Resumo-Projeto.pdf')

const source = fs.readFileSync(sourcePath, 'utf8').replace(/\r\n/g, '\n')
const blocks = parseDocument(source)

const pdf = await PDFDocument.create()
const fontRegular = await pdf.embedFont(StandardFonts.Helvetica)
const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold)

const pageSize = { width: 595.28, height: 841.89 }
const layout = { marginTop: 56, marginBottom: 54, marginLeft: 54, marginRight: 54, footerGap: 22 }
const colors = {
  ink: rgb(0.07, 0.11, 0.2),
  muted: rgb(0.39, 0.45, 0.55),
  accent: rgb(0.15, 0.39, 0.92),
  rule: rgb(0.86, 0.9, 0.95),
}

let page = addPage()
let cursorY = pageSize.height - layout.marginTop

for (const block of blocks) {
  if (block.type === 'pagebreak') {
    page = addPage()
    cursorY = pageSize.height - layout.marginTop
    continue
  }

  if (block.type === 'h1') {
    ensureSpace(70)
    cursorY = drawWrappedText(block.text, {
      x: layout.marginLeft,
      y: cursorY,
      size: 24,
      lineHeight: 29,
      maxWidth: contentWidth(),
      font: fontBold,
      color: colors.ink,
      spacingAfter: 10,
    })
    continue
  }

  if (block.type === 'h2') {
    ensureSpace(48)
    cursorY = drawWrappedText(block.text, {
      x: layout.marginLeft,
      y: cursorY,
      size: 16,
      lineHeight: 20,
      maxWidth: contentWidth(),
      font: fontBold,
      color: colors.accent,
      spacingAfter: 8,
    })
    page.drawLine({
      start: { x: layout.marginLeft, y: cursorY + 2 },
      end: { x: pageSize.width - layout.marginRight, y: cursorY + 2 },
      thickness: 1,
      color: colors.rule,
    })
    cursorY -= 10
    continue
  }

  if (block.type === 'bullet') {
    const bulletIndent = 14
    ensureSpace(34)
    page.drawText('•', {
      x: layout.marginLeft,
      y: cursorY - 12,
      size: 12,
      font: fontBold,
      color: colors.accent,
    })
    cursorY = drawWrappedText(block.text, {
      x: layout.marginLeft + bulletIndent,
      y: cursorY,
      size: 11,
      lineHeight: 16,
      maxWidth: contentWidth() - bulletIndent,
      font: fontRegular,
      color: colors.ink,
      spacingAfter: 5,
    })
    continue
  }

  ensureSpace(44)
  cursorY = drawWrappedText(block.text, {
    x: layout.marginLeft,
    y: cursorY,
    size: 11,
    lineHeight: 16,
    maxWidth: contentWidth(),
    font: fontRegular,
    color: colors.ink,
    spacingAfter: 9,
  })
}

const pages = pdf.getPages()
pages.forEach((currentPage, index) => {
  currentPage.drawText(`MarkQuest | Resumo do projeto | Página ${index + 1}`, {
    x: layout.marginLeft,
    y: layout.footerGap,
    size: 9,
    font: fontRegular,
    color: colors.muted,
  })
})

fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, await pdf.save())

console.log(`PDF gerado em: ${outputPath}`)
console.log(`Total de páginas: ${pages.length}`)

function addPage() {
  return pdf.addPage([pageSize.width, pageSize.height])
}

function contentWidth() {
  return pageSize.width - layout.marginLeft - layout.marginRight
}

function availableBottom() {
  return layout.marginBottom + 18
}

function ensureSpace(minHeight) {
  if (cursorY - minHeight < availableBottom()) {
    page = addPage()
    cursorY = pageSize.height - layout.marginTop
  }
}

function drawWrappedText(text, options) {
  const lines = wrapText(text, options.font, options.size, options.maxWidth)
  let y = options.y

  for (const line of lines) {
    if (y - options.lineHeight < availableBottom()) {
      page = addPage()
      y = pageSize.height - layout.marginTop
    }

    page.drawText(line, {
      x: options.x,
      y: y - options.size,
      size: options.size,
      font: options.font,
      color: options.color,
    })
    y -= options.lineHeight
  }

  return y - options.spacingAfter
}

function wrapText(text, font, size, maxWidth) {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (!normalized) return ['']

  const words = normalized.split(' ')
  const lines = []
  let currentLine = ''

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      currentLine = candidate
      continue
    }
    if (currentLine) {
      lines.push(currentLine)
      currentLine = word
    } else {
      lines.push(word)
    }
  }

  if (currentLine) lines.push(currentLine)
  return lines
}

function parseDocument(raw) {
  const lines = raw.split('\n')
  const parsedBlocks = []
  let paragraphLines = []

  const flushParagraph = () => {
    const text = paragraphLines.join(' ').trim()
    if (text) parsedBlocks.push({ type: 'p', text })
    paragraphLines = []
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed === '<!-- PAGEBREAK -->') {
      flushParagraph()
      parsedBlocks.push({ type: 'pagebreak' })
      continue
    }
    if (!trimmed) {
      flushParagraph()
      continue
    }
    if (trimmed.startsWith('# ')) {
      flushParagraph()
      parsedBlocks.push({ type: 'h1', text: trimmed.slice(2).trim() })
      continue
    }
    if (trimmed.startsWith('## ')) {
      flushParagraph()
      parsedBlocks.push({ type: 'h2', text: trimmed.slice(3).trim() })
      continue
    }
    if (trimmed.startsWith('- ')) {
      flushParagraph()
      parsedBlocks.push({ type: 'bullet', text: trimmed.slice(2).trim() })
      continue
    }
    paragraphLines.push(trimmed)
  }

  flushParagraph()
  return parsedBlocks
}
