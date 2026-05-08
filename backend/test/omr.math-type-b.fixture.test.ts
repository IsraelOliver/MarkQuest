import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import Jimp from 'jimp'
import { describe, expect, it } from 'vitest'
import {
  buildMathTypeBAllowedSymbols,
  readMathTypeBGridFromImageCells,
  readMathTypeBGridFromSvgFixture,
} from '../src/modules/omr/math-grid-reader.js'
import { compareMathReadWithAnswerKey } from '../src/modules/omr/math-diagnostic.js'

const mathTypeBFixture = {
  fixturePath: path.resolve(process.cwd(), 'test/fixtures/omr-math-type-b-q33.svg'),
  questionNumber: 33,
  questionType: 'math',
  markerLabel: 'TIPO B',
  columns: 3,
  separatorMode: 'negative',
  expectedFutureAnswer: '-12',
} as const

const operationalCellGridFixture = {
  geometryVersion: 'math-cell-grid-v1',
  pageNumber: 2,
  pageWidth: 320,
  pageHeight: 460,
  blockId: 'section-math-33',
  questionNumber: 33,
  columns: [1, 2, 3].map((columnNumber, columnIndex) => ({
    columnNumber,
    cells: ['-', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].map((symbol, rowIndex) => {
      const centerX = 80 + columnIndex * 90
      const centerY = 80 + rowIndex * 34
      const radius = 11

      return {
        symbol,
        centerX,
        centerY,
        radius,
        normalizedCenterX: centerX / 320,
        normalizedCenterY: centerY / 460,
        normalizedRadius: radius / 320,
      }
    }),
  })),
} as const

function drawFilledCircle(image: Jimp, centerX: number, centerY: number, radius: number, color: number) {
  const xMin = Math.max(0, Math.floor(centerX - radius))
  const xMax = Math.min(image.bitmap.width - 1, Math.ceil(centerX + radius))
  const yMin = Math.max(0, Math.floor(centerY - radius))
  const yMax = Math.min(image.bitmap.height - 1, Math.ceil(centerY + radius))

  for (let y = yMin; y <= yMax; y += 1) {
    for (let x = xMin; x <= xMax; x += 1) {
      const dx = x - centerX
      const dy = y - centerY
      if (dx * dx + dy * dy <= radius * radius) {
        image.setPixelColor(color, x, y)
      }
    }
  }
}

async function createRasterMathFixturePng() {
  const width = operationalCellGridFixture.pageWidth
  const height = operationalCellGridFixture.pageHeight
  const white = Jimp.rgbaToInt(255, 255, 255, 255)
  const dark = Jimp.rgbaToInt(20, 20, 20, 255)
  const image = new Jimp(width, height, white)
  const selectedByColumn = new Map([
    [1, '-'],
    [2, '1'],
    [3, '2'],
  ] as const)

  operationalCellGridFixture.columns.forEach((column) => {
    column.cells.forEach((cell) => {
      drawFilledCircle(image, cell.centerX, cell.centerY, cell.radius, white)

      if (selectedByColumn.get(column.columnNumber) === cell.symbol) {
        drawFilledCircle(image, cell.centerX, cell.centerY, cell.radius - 2, dark)
      }
    })
  })

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'markquest-math-type-b-'))
  const imagePath = path.join(tempDir, 'omr-math-type-b-q33.png')
  await image.writeAsync(imagePath)
  return imagePath
}

describe('Controlled OMR fixture for future math type B reading', () => {
  it('documents the controlled question 33 fixture without enabling math OMR yet', async () => {
    const svg = await fs.readFile(mathTypeBFixture.fixturePath, 'utf-8')
    const selectedMarks = [...svg.matchAll(/data-selected="true"/g)]

    expect(mathTypeBFixture).toMatchObject({
      questionNumber: 33,
      questionType: 'math',
      markerLabel: 'TIPO B',
      columns: 3,
      separatorMode: 'negative',
      expectedFutureAnswer: '-12',
    })
    expect(svg).toContain('<svg')
    expect(svg).toContain('data-question-number="33"')
    expect(svg).toContain('data-question-type="math"')
    expect(svg).toContain('data-columns="3"')
    expect(svg).toContain('data-separator-mode="negative"')
    expect(svg).toContain('data-expected-answer="-12"')
    expect(svg).toContain('data-symbol="-"')
    expect(svg).toContain('data-symbol="1"')
    expect(svg).toContain('data-symbol="2"')
    expect(selectedMarks).toHaveLength(3)
  })

  it('detects the answer "-12" from the controlled question 33 type B fixture in an isolated reader', async () => {
    const result = await readMathTypeBGridFromSvgFixture({
      fixturePath: mathTypeBFixture.fixturePath,
      questionNumber: mathTypeBFixture.questionNumber,
      columns: mathTypeBFixture.columns,
      allowedSymbols: buildMathTypeBAllowedSymbols({
        allowNegative: true,
        decimalSeparator: null,
      }),
      geometry: {
        rowSymbols: ['-', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
      },
    })

    expect(result).toMatchObject({
      questionNumber: 33,
      detectedAnswer: '-12',
      columns: [
        { columnNumber: 1, selectedSymbol: '-' },
        { columnNumber: 2, selectedSymbol: '1' },
        { columnNumber: 3, selectedSymbol: '2' },
      ],
    })
  })

  it('detects the answer "-12" from a controlled rasterized PNG using the operationalCellGrid of question 33', async () => {
    const imagePath = await createRasterMathFixturePng()
    const result = await readMathTypeBGridFromImageCells({
      imagePath,
      questionNumber: mathTypeBFixture.questionNumber,
      allowedSymbols: buildMathTypeBAllowedSymbols({
        allowNegative: true,
        decimalSeparator: null,
      }),
      cellGrid: {
        columns: operationalCellGridFixture.columns.map((column) => ({
          columnNumber: column.columnNumber,
          cells: column.cells.map((cell) => ({
            symbol: cell.symbol,
            centerX: cell.centerX,
            centerY: cell.centerY,
            radius: cell.radius,
          })),
        })),
        markThreshold: 0.22,
        ambiguityThreshold: 0.1,
        spatialTolerancePx: 1,
      },
    })
    const diagnosticRead = {
      geometrySource: 'operationalCellGrid' as const,
      ...result,
    }

    expect(diagnosticRead.geometrySource).toBe('operationalCellGrid')
    expect(diagnosticRead.answer).toBe('-12')
    expect(diagnosticRead.confidence).toBeGreaterThan(0.5)
    expect(diagnosticRead.blankColumns).toEqual([])
    expect(diagnosticRead.multipleMarkedColumns).toEqual([])
    expect(diagnosticRead.warnings).toEqual([])
    expect(diagnosticRead.markedCells).toEqual([
      expect.objectContaining({ columnNumber: 1, rowSymbol: '-', fillRatio: expect.any(Number) }),
      expect.objectContaining({ columnNumber: 2, rowSymbol: '1', fillRatio: expect.any(Number) }),
      expect.objectContaining({ columnNumber: 3, rowSymbol: '2', fillRatio: expect.any(Number) }),
    ])
  })

  it('compares the detected answer "-12" with the answer key in diagnostic mode', () => {
    const diagnostic = compareMathReadWithAnswerKey({
      detectedAnswer: '-12',
      multipleMarkedColumns: [],
      answerKeyQuestion: {
        correctAnswer: '-12',
      },
    })

    expect(diagnostic).toEqual({
      expectedAnswer: '-12',
      detectedAnswer: '-12',
      diagnosticMatch: true,
      diagnosticStatus: 'match',
      diagnosticWarnings: [],
    })
  })

  it('marks the diagnostic comparison as blank when the type B reading is empty', () => {
    const diagnostic = compareMathReadWithAnswerKey({
      detectedAnswer: '',
      multipleMarkedColumns: [],
      answerKeyQuestion: {
        correctAnswer: '-12',
      },
    })

    expect(diagnostic).toEqual({
      expectedAnswer: '-12',
      detectedAnswer: '',
      diagnosticMatch: false,
      diagnosticStatus: 'blank',
      diagnosticWarnings: ['Leitura tipo B sem resposta detectada; comparação diagnóstica marcada como em branco.'],
    })
  })
})
