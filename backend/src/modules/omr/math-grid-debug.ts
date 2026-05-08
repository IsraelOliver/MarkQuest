import fs from 'node:fs/promises'
import path from 'node:path'
import Jimp from 'jimp'
import type { MathGridImageCellGrid, MathGridImageReadResult } from './math-grid-reader.js'

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function drawCircleOutline(image: Jimp, centerX: number, centerY: number, radius: number, color: number) {
  const xMin = Math.max(0, Math.floor(centerX - radius - 1))
  const xMax = Math.min(image.bitmap.width - 1, Math.ceil(centerX + radius + 1))
  const yMin = Math.max(0, Math.floor(centerY - radius - 1))
  const yMax = Math.min(image.bitmap.height - 1, Math.ceil(centerY + radius + 1))

  for (let y = yMin; y <= yMax; y += 1) {
    for (let x = xMin; x <= xMax; x += 1) {
      const dx = x - centerX
      const dy = y - centerY
      const distance = Math.sqrt(dx * dx + dy * dy)
      if (Math.abs(distance - radius) <= 1.2) {
        image.setPixelColor(color, x, y)
      }
    }
  }
}

function drawCross(image: Jimp, centerX: number, centerY: number, size: number, color: number) {
  for (let offset = -size; offset <= size; offset += 1) {
    const x = clamp(centerX + offset, 0, image.bitmap.width - 1)
    const y = clamp(centerY + offset, 0, image.bitmap.height - 1)
    const y2 = clamp(centerY - offset, 0, image.bitmap.height - 1)
    image.setPixelColor(color, x, centerY)
    image.setPixelColor(color, centerX, clamp(centerY + offset, 0, image.bitmap.height - 1))
    image.setPixelColor(color, x, y)
    image.setPixelColor(color, x, y2)
  }
}

async function maybeLoadFont() {
  try {
    return await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK)
  } catch {
    return null
  }
}

export async function generateMathTypeBDebugOverlay(params: {
  imagePath: string
  questionNumber: number
  pageNumber: number
  cellGrid: MathGridImageCellGrid
  readResult: MathGridImageReadResult
}): Promise<{ debugOverlayPath?: string; warning?: string }> {
  try {
    const image = await Jimp.read(params.imagePath)
    const font = await maybeLoadFont()
    const debugDir = path.resolve(process.cwd(), 'uploads', 'omr-debug')
    await fs.mkdir(debugDir, { recursive: true })

    const gray = Jimp.rgbaToInt(100, 116, 139, 255)
    const blue = Jimp.rgbaToInt(37, 99, 235, 255)
    const orange = Jimp.rgbaToInt(234, 88, 12, 255)
    const red = Jimp.rgbaToInt(220, 38, 38, 255)
    const green = Jimp.rgbaToInt(22, 163, 74, 255)
    const yellow = Jimp.rgbaToInt(234, 179, 8, 255)

    for (const column of params.cellGrid.columns) {
      const diagnostic = params.readResult.columnDiagnostics.find((item) => item.columnNumber === column.columnNumber)
      const markedCell = params.readResult.markedCells.find((item) => item.columnNumber === column.columnNumber)

      for (const cell of column.cells) {
        const evaluation = diagnostic?.cellEvaluations.find((item) => item.symbol === cell.symbol)
        const isMarked = markedCell?.rowSymbol === cell.symbol
        const isTopCandidate = diagnostic?.topCandidate?.symbol === cell.symbol
        const isNegativeCell = column.columnNumber === 1 && cell.symbol === '-'
        let color = gray

        if (isMarked) {
          color = green
        } else if (diagnostic?.status === 'multiple' && isTopCandidate) {
          color = red
        } else if (diagnostic?.status === 'blank' && isTopCandidate) {
          color = orange
        } else if (isTopCandidate) {
          color = blue
        } else if (isNegativeCell) {
          color = yellow
        }

        drawCircleOutline(image, cell.centerX, cell.centerY, cell.radius, color)
        drawCross(image, cell.centerX, cell.centerY, 3, color)

        if (font) {
          const fillRatio = evaluation ? evaluation.fillRatio.toFixed(2) : 'n/a'
          image.print(font, cell.centerX + cell.radius + 4, cell.centerY - 8, `${cell.symbol}:${fillRatio}`)
        }
      }

      if (font && diagnostic?.topCandidate) {
        image.print(
          font,
          diagnostic.topCandidate.centerX - 18,
          Math.max(0, diagnostic.topCandidate.centerY - diagnostic.topCandidate.radius - 24),
          `T:${diagnostic.thresholdUsed.toFixed(2)}`,
        )
      }
    }

    const outputPath = path.join(
      debugDir,
      `math-q${params.questionNumber}-page${params.pageNumber}-${Date.now()}.png`,
    )
    await image.writeAsync(outputPath)

    return {
      debugOverlayPath: outputPath,
    }
  } catch (error) {
    return {
      warning:
        error instanceof Error
          ? `Nao foi possivel gerar overlay tecnico da questao ${params.questionNumber}: ${error.message}`
          : `Nao foi possivel gerar overlay tecnico da questao ${params.questionNumber}.`,
    }
  }
}
