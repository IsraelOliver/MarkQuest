import fs from 'node:fs/promises'
import Jimp from 'jimp'
import { getBestBubbleFillRatio } from './bubble-analysis.js'

export type MathGridGeometry = {
  rowSymbols: string[]
}

export type MathGridImageGeometry = MathGridGeometry & {
  startX: number
  startY: number
  columnGap: number
  rowGap: number
  bubbleRadius: number
  markThreshold?: number
  ambiguityThreshold?: number
  spatialTolerancePx?: number
}

export type MathGridImageCell = {
  symbol: string
  centerX: number
  centerY: number
  radius: number
}

export type MathGridImageCellColumn = {
  columnNumber: number
  cells: MathGridImageCell[]
}

export type MathGridImageCellGrid = {
  columns: MathGridImageCellColumn[]
  markThreshold?: number
  ambiguityThreshold?: number
  spatialTolerancePx?: number
}

export type MathGridMarkedCell = {
  columnNumber: number
  rowSymbol: string
  fillRatio: number
}

export type MathGridCellEvaluation = {
  symbol: string
  fillRatio: number
  thresholdUsed: number
  centerX: number
  centerY: number
  radius: number
}

export type MathGridColumnCandidate = {
  symbol: string
  fillRatio: number
  thresholdUsed: number
  centerX: number
  centerY: number
  radius: number
}

export type MathGridColumnDiagnostic = {
  columnNumber: number
  status: 'marked' | 'blank' | 'multiple'
  thresholdUsed: number
  ambiguityThresholdUsed: number
  topCandidate?: MathGridColumnCandidate
  secondCandidate?: MathGridColumnCandidate
  cellEvaluations: MathGridCellEvaluation[]
}

export type MathGridReadColumn = {
  columnNumber: number
  selectedSymbol: string | null
}

export type MathGridReadResult = {
  questionNumber: number
  detectedAnswer: string
  columns: MathGridReadColumn[]
}

export type MathGridImageReadResult = {
  questionNumber: number
  answer: string
  confidence: number
  markThresholdUsed: number
  ambiguityThresholdUsed: number
  markedCells: MathGridMarkedCell[]
  columnDiagnostics: MathGridColumnDiagnostic[]
  blankColumns: number[]
  multipleMarkedColumns: number[]
  warnings: string[]
}

const DEFAULT_MARK_THRESHOLD = 0.45
const DEFAULT_SPECIAL_SYMBOL_THRESHOLD = 0.4
const DEFAULT_AMBIGUITY_THRESHOLD = 0.08
const DIGITS = new Set(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'])
const SPECIAL_SYMBOLS = new Set(['-', ',', '.'])

function buildColumns(columns: number) {
  return Array.from({ length: columns }, (_, index) => ({
    columnNumber: index + 1,
    selectedSymbol: null as string | null,
  }))
}

function validateAllowedSymbol(symbol: string, allowedSymbols: string[], geometry: MathGridGeometry) {
  if (!geometry.rowSymbols.includes(symbol)) {
    throw new Error(`Leitura matematica invalida: simbolo "${symbol}" nao existe na grade configurada.`)
  }

  if (!allowedSymbols.includes(symbol)) {
    throw new Error(`Leitura matematica invalida: simbolo "${symbol}" nao esta habilitado para esta questao.`)
  }
}

function buildAnswerWarnings(answer: string, allowedSymbols: string[]) {
  const warnings: string[] = []
  const allowsNegative = allowedSymbols.includes('-')
  const decimalSeparators = allowedSymbols.filter((symbol) => symbol === ',' || symbol === '.')

  let negativeCount = 0
  let separatorCount = 0

  for (const [index, symbol] of [...answer].entries()) {
    if (DIGITS.has(symbol)) continue

    if (symbol === '-') {
      negativeCount += 1
      if (!allowsNegative || index !== 0 || negativeCount > 1) {
        warnings.push('Sinal negativo detectado fora da primeira posicao ou repetido.')
      }
      continue
    }

    if (symbol === ',' || symbol === '.') {
      separatorCount += 1
      if (!decimalSeparators.includes(symbol) || separatorCount > 1) {
        warnings.push('Separador decimal detectado fora da configuracao habilitada ou repetido.')
      }
      continue
    }

    warnings.push(`Simbolo "${symbol}" nao e permitido para esta grade matematica.`)
  }

  return [...new Set(warnings)]
}

function buildColumnDiagnostic(params: {
  columnNumber: number
  status: 'marked' | 'blank' | 'multiple'
  thresholdUsed: number
  ambiguityThresholdUsed: number
  evaluations: MathGridCellEvaluation[]
}) {
  const sorted = [...params.evaluations].sort((left, right) => right.fillRatio - left.fillRatio)
  const top = sorted[0]
  const second = sorted[1]

  return {
    columnNumber: params.columnNumber,
    status: params.status,
    thresholdUsed: params.thresholdUsed,
    ambiguityThresholdUsed: params.ambiguityThresholdUsed,
    topCandidate: top
      ? {
        symbol: top.symbol,
        fillRatio: top.fillRatio,
        thresholdUsed: top.thresholdUsed,
        centerX: top.centerX,
        centerY: top.centerY,
        radius: top.radius,
        }
      : undefined,
    secondCandidate: second
      ? {
        symbol: second.symbol,
        fillRatio: second.fillRatio,
        thresholdUsed: second.thresholdUsed,
        centerX: second.centerX,
        centerY: second.centerY,
        radius: second.radius,
        }
      : undefined,
    cellEvaluations: sorted,
  } satisfies MathGridColumnDiagnostic
}

function getThresholdForSymbol(symbol: string, markThreshold: number) {
  return SPECIAL_SYMBOLS.has(symbol) ? DEFAULT_SPECIAL_SYMBOL_THRESHOLD : markThreshold
}

export async function readMathTypeBGridFromSvgFixture(params: {
  fixturePath: string
  questionNumber: number
  columns: number
  allowedSymbols: string[]
  geometry: MathGridGeometry
}): Promise<MathGridReadResult> {
  const svg = await fs.readFile(params.fixturePath, 'utf-8')
  const selectedMarks = [...svg.matchAll(/<circle\b[^>]*data-column="(\d+)"[^>]*data-symbol="([^"]+)"[^>]*data-selected="true"[^>]*\/>/g)]
  const columns = buildColumns(params.columns)

  for (const match of selectedMarks) {
    const columnNumber = Number(match[1])
    const selectedSymbol = match[2]

    if (!Number.isInteger(columnNumber) || columnNumber < 1 || columnNumber > params.columns) {
      throw new Error(`Leitura matematica invalida: coluna ${match[1]} esta fora da grade esperada.`)
    }

    validateAllowedSymbol(selectedSymbol, params.allowedSymbols, params.geometry)

    const column = columns[columnNumber - 1]
    if (column.selectedSymbol) {
      throw new Error(`Leitura matematica invalida: multiplas marcacoes detectadas na coluna ${columnNumber}.`)
    }

    column.selectedSymbol = selectedSymbol
  }

  const missingColumn = columns.find((column) => !column.selectedSymbol)
  if (missingColumn) {
    throw new Error(`Leitura matematica invalida: nenhuma marcacao encontrada na coluna ${missingColumn.columnNumber}.`)
  }

  const detectedAnswer = columns.map((column) => column.selectedSymbol).join('')
  const warnings = buildAnswerWarnings(detectedAnswer, params.allowedSymbols)
  if (warnings.length > 0) {
    throw new Error(`Leitura matematica invalida: ${warnings.join(' ')}`)
  }

  return {
    questionNumber: params.questionNumber,
    detectedAnswer,
    columns,
  }
}

export async function readMathTypeBGridFromImage(params: {
  imagePath: string
  questionNumber: number
  columns: number
  allowedSymbols: string[]
  geometry: MathGridImageGeometry
}): Promise<MathGridImageReadResult> {
  const image = await Jimp.read(params.imagePath)
  const markThreshold = params.geometry.markThreshold ?? DEFAULT_MARK_THRESHOLD
  const ambiguityThreshold = params.geometry.ambiguityThreshold ?? DEFAULT_AMBIGUITY_THRESHOLD
  const tolerance = params.geometry.spatialTolerancePx ?? 0
  const markedCells: MathGridMarkedCell[] = []
  const columnDiagnostics: MathGridColumnDiagnostic[] = []
  const blankColumns: number[] = []
  const multipleMarkedColumns: number[] = []
  const columnResults = buildColumns(params.columns)
  const warnings: string[] = []
  let confidenceSum = 0

  for (let columnIndex = 0; columnIndex < params.columns; columnIndex += 1) {
    const columnNumber = columnIndex + 1
    const centerX = params.geometry.startX + columnIndex * params.geometry.columnGap
    const evaluations = params.geometry.rowSymbols.map((rowSymbol, rowIndex) => {
      const centerY = params.geometry.startY + rowIndex * params.geometry.rowGap
      const probe = getBestBubbleFillRatio(image, centerX, centerY, params.geometry.bubbleRadius, tolerance)
      const thresholdUsed = getThresholdForSymbol(rowSymbol, markThreshold)

      return {
        symbol: rowSymbol,
        fillRatio: probe.fillRatio,
        thresholdUsed,
        centerX,
        centerY,
        radius: params.geometry.bubbleRadius,
      }
    })

    const sorted = [...evaluations].sort((left, right) => right.fillRatio - left.fillRatio)
    const top = sorted[0]
    const second = sorted[1]

    if (!top || top.fillRatio < top.thresholdUsed) {
      blankColumns.push(columnNumber)
      warnings.push(`Nenhuma marcacao detectada na coluna ${columnNumber}.`)
      columnDiagnostics.push(
        buildColumnDiagnostic({
          columnNumber,
          status: 'blank',
          thresholdUsed: markThreshold,
          ambiguityThresholdUsed: ambiguityThreshold,
          evaluations,
        }),
      )
      continue
    }

    if (second && top.fillRatio - second.fillRatio < ambiguityThreshold) {
      multipleMarkedColumns.push(columnNumber)
      warnings.push(`Multiplas marcacoes detectadas na coluna ${columnNumber}.`)
      columnDiagnostics.push(
        buildColumnDiagnostic({
          columnNumber,
          status: 'multiple',
          thresholdUsed: markThreshold,
          ambiguityThresholdUsed: ambiguityThreshold,
          evaluations,
        }),
      )
      continue
    }

    validateAllowedSymbol(top.symbol, params.allowedSymbols, params.geometry)
    columnResults[columnIndex].selectedSymbol = top.symbol
    markedCells.push({
      columnNumber,
      rowSymbol: top.symbol,
      fillRatio: top.fillRatio,
    })
    if (SPECIAL_SYMBOLS.has(top.symbol) && top.thresholdUsed < markThreshold) {
      warnings.push(
        `Coluna ${columnNumber} usou threshold especial ${top.thresholdUsed.toFixed(2)} para detectar o simbolo "${top.symbol}".`,
      )
    }
    columnDiagnostics.push(
      buildColumnDiagnostic({
        columnNumber,
        status: 'marked',
        thresholdUsed: markThreshold,
        ambiguityThresholdUsed: ambiguityThreshold,
        evaluations,
      }),
    )
    confidenceSum += Math.max(0, Math.min(1, top.fillRatio - (second?.fillRatio ?? 0) + 0.4))
  }

  const answer = columnResults
    .map((column) => column.selectedSymbol)
    .filter((symbol): symbol is string => Boolean(symbol))
    .join('')

  warnings.push(...buildAnswerWarnings(answer, params.allowedSymbols))

  return {
    questionNumber: params.questionNumber,
    answer,
    confidence: markedCells.length > 0 ? confidenceSum / markedCells.length : 0,
    markThresholdUsed: markThreshold,
    ambiguityThresholdUsed: ambiguityThreshold,
    markedCells,
    columnDiagnostics,
    blankColumns,
    multipleMarkedColumns,
    warnings: [...new Set(warnings)],
  }
}

export async function readMathTypeBGridFromImageCells(params: {
  imagePath: string
  questionNumber: number
  allowedSymbols: string[]
  cellGrid: MathGridImageCellGrid
}): Promise<MathGridImageReadResult> {
  const image = await Jimp.read(params.imagePath)
  const markThreshold = params.cellGrid.markThreshold ?? DEFAULT_MARK_THRESHOLD
  const ambiguityThreshold = params.cellGrid.ambiguityThreshold ?? DEFAULT_AMBIGUITY_THRESHOLD
  const tolerance = params.cellGrid.spatialTolerancePx ?? 0
  const markedCells: MathGridMarkedCell[] = []
  const columnDiagnostics: MathGridColumnDiagnostic[] = []
  const blankColumns: number[] = []
  const multipleMarkedColumns: number[] = []
  const warnings: string[] = []
  const columnResults = params.cellGrid.columns
    .slice()
    .sort((left, right) => left.columnNumber - right.columnNumber)
    .map((column) => ({
      columnNumber: column.columnNumber,
      selectedSymbol: null as string | null,
    }))
  let confidenceSum = 0

  for (const column of params.cellGrid.columns) {
    const evaluations = column.cells.map((cell) => {
      const probe = getBestBubbleFillRatio(image, cell.centerX, cell.centerY, cell.radius, tolerance)
      const thresholdUsed = getThresholdForSymbol(cell.symbol, markThreshold)

      return {
        symbol: cell.symbol,
        fillRatio: probe.fillRatio,
        thresholdUsed,
        centerX: cell.centerX,
        centerY: cell.centerY,
        radius: cell.radius,
      }
    })

    const sorted = [...evaluations].sort((left, right) => right.fillRatio - left.fillRatio)
    const top = sorted[0]
    const second = sorted[1]

    if (!top || top.fillRatio < top.thresholdUsed) {
      blankColumns.push(column.columnNumber)
      warnings.push(`Nenhuma marcacao detectada na coluna ${column.columnNumber}.`)
      columnDiagnostics.push(
        buildColumnDiagnostic({
          columnNumber: column.columnNumber,
          status: 'blank',
          thresholdUsed: markThreshold,
          ambiguityThresholdUsed: ambiguityThreshold,
          evaluations,
        }),
      )
      continue
    }

    if (second && top.fillRatio - second.fillRatio < ambiguityThreshold) {
      multipleMarkedColumns.push(column.columnNumber)
      warnings.push(`Multiplas marcacoes detectadas na coluna ${column.columnNumber}.`)
      columnDiagnostics.push(
        buildColumnDiagnostic({
          columnNumber: column.columnNumber,
          status: 'multiple',
          thresholdUsed: markThreshold,
          ambiguityThresholdUsed: ambiguityThreshold,
          evaluations,
        }),
      )
      continue
    }

    validateAllowedSymbol(
      top.symbol,
      params.allowedSymbols,
      {
        rowSymbols: column.cells.map((cell) => cell.symbol),
      },
    )

    const resultColumn = columnResults.find((item) => item.columnNumber === column.columnNumber)
    if (resultColumn) {
      resultColumn.selectedSymbol = top.symbol
    }

    markedCells.push({
      columnNumber: column.columnNumber,
      rowSymbol: top.symbol,
      fillRatio: top.fillRatio,
    })
    if (SPECIAL_SYMBOLS.has(top.symbol) && top.thresholdUsed < markThreshold) {
      warnings.push(
        `Coluna ${column.columnNumber} usou threshold especial ${top.thresholdUsed.toFixed(2)} para detectar o simbolo "${top.symbol}".`,
      )
    }
    columnDiagnostics.push(
      buildColumnDiagnostic({
        columnNumber: column.columnNumber,
        status: 'marked',
        thresholdUsed: markThreshold,
        ambiguityThresholdUsed: ambiguityThreshold,
        evaluations,
      }),
    )
    confidenceSum += Math.max(0, Math.min(1, top.fillRatio - (second?.fillRatio ?? 0) + 0.4))
  }

  const answer = columnResults
    .map((column) => column.selectedSymbol)
    .filter((symbol): symbol is string => Boolean(symbol))
    .join('')

  warnings.push(...buildAnswerWarnings(answer, params.allowedSymbols))

  return {
    questionNumber: params.questionNumber,
    answer,
    confidence: markedCells.length > 0 ? confidenceSum / markedCells.length : 0,
    markThresholdUsed: markThreshold,
    ambiguityThresholdUsed: ambiguityThreshold,
    markedCells,
    columnDiagnostics,
    blankColumns,
    multipleMarkedColumns,
    warnings: [...new Set(warnings)],
  }
}

export function buildMathTypeBAllowedSymbols(params: {
  allowNegative?: boolean
  decimalSeparator?: ',' | '.' | null
}) {
  const symbols = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

  if (params.allowNegative) {
    symbols.unshift('-')
  }

  if (params.decimalSeparator) {
    symbols.unshift(params.decimalSeparator)
  }

  return symbols
}
