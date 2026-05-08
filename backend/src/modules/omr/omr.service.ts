import { correctAnswers } from '../results/correction.service.js'
import { AnswerKeyService } from '../../services/answer-key.service.js'
import { TemplateService } from '../../services/template.service.js'
import { db } from '../../repositories/in-memory.repository.js'
import type { OMRResult, OMRUploadProcessingReport, ProcessingJob, StudentResult, Template, UploadFile } from '../../types/entities.js'
import { AppError } from '../../utils/app-error.js'
import { generateId } from '../../utils/id.js'
import { analyzeAnswerSheetImage } from './omr.engine.js'
import { compareMathReadWithAnswerKey } from './math-diagnostic.js'
import { generateMathTypeBDebugOverlay } from './math-grid-debug.js'
import {
  buildMathTypeBAllowedSymbols,
  readMathTypeBGridFromImage,
  readMathTypeBGridFromImageCells,
  type MathGridImageCellGrid,
  type MathGridImageGeometry,
} from './math-grid-reader.js'
import { deriveMathOperationalGeometryInRuntime } from './math-runtime-geometry.js'
import { cleanupRasterizedPdfImages, rasterizePdfFirstPage, type PdfRasterizationResult } from './pdf-rasterizer.js'
import { buildTemplatePageMapDiagnostic } from './template-page-map.js'

const templateService = new TemplateService()
const answerKeyService = new AnswerKeyService()

function getStudentName(studentId: string) {
  const student = db.students.find((item) => item.id === studentId)
  if (!student) return 'Aluno sem identificacao'
  return [student.firstName, student.middleName, student.lastName].filter(Boolean).join(' ')
}

function buildStudentResult(params: {
  examId: string
  upload: UploadFile
  omrResultId: string
  score: number
  correct: number
  incorrect: number
  blank: number
  multiple: number
}): StudentResult {
  return {
    id: generateId('res'),
    examId: params.examId,
    studentId: params.upload.studentId,
    studentName: getStudentName(params.upload.studentId),
    score: params.score,
    correctAnswers: params.correct,
    incorrectAnswers: params.incorrect,
    blankAnswers: params.blank,
    multipleAnswers: params.multiple,
    processedAt: new Date().toISOString(),
    omrResultId: params.omrResultId,
  }
}

function getErrorInfo(error: unknown): OMRUploadProcessingReport['error'] {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    }
  }

  return {
    name: 'UnknownError',
    message: String(error),
  }
}

function isPdfUpload(upload: UploadFile) {
  return upload.mimeType === 'application/pdf'
}

function buildFallbackMathGeometry(params: {
  pageWidth: number
  pageHeight: number
  columns: number
  rowSymbols: string[]
}): MathGridImageGeometry {
  return {
    startX: Math.round(params.pageWidth * 0.62),
    startY: Math.round(params.pageHeight * 0.2),
    columnGap: Math.round(params.pageWidth * 0.075),
    rowGap: Math.round(params.pageHeight * 0.032),
    bubbleRadius: Math.max(8, Math.round(params.pageWidth * 0.01)),
    rowSymbols: params.rowSymbols,
    markThreshold: 0.45,
    ambiguityThreshold: 0.08,
    spatialTolerancePx: 2,
  }
}

function getMathRowSymbols(allowedSymbols: string[]) {
  const separators = allowedSymbols.filter((symbol) => symbol === '-' || symbol === ',' || symbol === '.')
  const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
  return [...separators, ...digits]
}

function buildPersistedMathCellGrid(params: {
  mathBlock: Extract<Template['definition']['questionBlocks'][number], { sectionType: 'math' }>
  rasterizedPage: NonNullable<PdfRasterizationResult['rasterizedPages']>[number]
}): {
  cellGrid: MathGridImageCellGrid | null
  source: 'operationalCellGrid' | 'fallbackDiagnosticGeometry'
  scaled: boolean
  warnings: string[]
} {
  const cellGrid = params.mathBlock.operationalCellGrid
  if (!cellGrid || cellGrid.columns.length === 0) {
    return {
      cellGrid: null,
      source: 'fallbackDiagnosticGeometry',
      scaled: false,
      warnings: ['Malha operacional por célula ausente no template; seguindo para os caminhos legados de geometria.'],
    }
  }

  const pageWidth = cellGrid.pageWidth > 0 ? cellGrid.pageWidth : 595.28
  const pageHeight = cellGrid.pageHeight > 0 ? cellGrid.pageHeight : 841.89
  const scaledCellGrid: MathGridImageCellGrid = {
    markThreshold: 0.45,
    ambiguityThreshold: 0.08,
    spatialTolerancePx: 2,
    columns: cellGrid.columns.map((column) => ({
      columnNumber: column.columnNumber,
      cells: column.cells.map((cell) => {
        const normalizedCenterX = cell.normalizedCenterX > 0 ? cell.normalizedCenterX : cell.centerX / pageWidth
        const normalizedCenterY = cell.normalizedCenterY > 0 ? cell.normalizedCenterY : cell.centerY / pageHeight
        const normalizedRadius = cell.normalizedRadius > 0 ? cell.normalizedRadius : cell.radius / pageWidth

        return {
          symbol: cell.symbol,
          centerX: Math.round(normalizedCenterX * params.rasterizedPage.width),
          centerY: Math.round(normalizedCenterY * params.rasterizedPage.height),
          radius: Math.max(4, Math.round(normalizedRadius * params.rasterizedPage.width)),
        }
      }),
    })),
  }

  const isValid = scaledCellGrid.columns.every(
    (column) =>
      Number.isInteger(column.columnNumber) &&
      column.columnNumber > 0 &&
      column.cells.length > 0 &&
      column.cells.every(
        (cell) =>
          Boolean(cell.symbol) &&
          cell.centerX >= 0 &&
          cell.centerY >= 0 &&
          cell.radius > 0,
      ),
  )

  if (!isValid) {
    return {
      cellGrid: null,
      source: 'fallbackDiagnosticGeometry',
      scaled: false,
      warnings: ['Malha operacional por célula persistida está inválida para a página rasterizada; seguindo para os caminhos legados de geometria.'],
    }
  }

  return {
    cellGrid: scaledCellGrid,
    source: 'operationalCellGrid',
    scaled: true,
    warnings: [],
  }
}

function buildPersistedMathGeometry(params: {
  mathBlock: Extract<Template['definition']['questionBlocks'][number], { sectionType: 'math' }>
  rasterizedPage: NonNullable<PdfRasterizationResult['rasterizedPages']>[number]
}): {
  geometry: MathGridImageGeometry | null
  source: 'persistedOperationalGeometry' | 'derivedRuntimeGeometry' | 'fallbackDiagnosticGeometry'
  scaled: boolean
  warnings: string[]
} {
  const geometry = params.mathBlock.operationalGeometry
  if (!geometry) {
    return {
      geometry: null,
      source: 'fallbackDiagnosticGeometry',
      scaled: false,
      warnings: ['Geometria operacional ausente no template; usando fallback diagnostico.'],
    }
  }

  const pageWidth = geometry.pageWidth > 0 ? geometry.pageWidth : 595.28
  const pageHeight = geometry.pageHeight > 0 ? geometry.pageHeight : 841.89
  const startXRatio = geometry.startXRatio || geometry.startX / pageWidth
  const startYRatio = geometry.startYRatio || geometry.startY / pageHeight
  const columnGapRatio = geometry.columnGapRatio || geometry.columnGap / pageWidth
  const rowGapRatio = geometry.rowGapRatio || geometry.rowGap / pageHeight
  const bubbleRadiusRatio = geometry.bubbleRadiusRatio || geometry.bubbleRadius / pageWidth
  const source =
    geometry.startXRatio > 0 &&
    geometry.startYRatio > 0 &&
    geometry.columnGapRatio >= 0 &&
    geometry.rowGapRatio >= 0 &&
    geometry.bubbleRadiusRatio > 0
      ? 'persistedOperationalGeometry'
      : 'derivedRuntimeGeometry'

  const scaledGeometry: MathGridImageGeometry = {
    startX: Math.round(startXRatio * params.rasterizedPage.width),
    startY: Math.round(startYRatio * params.rasterizedPage.height),
    columnGap: Math.round(columnGapRatio * params.rasterizedPage.width),
    rowGap: Math.round(rowGapRatio * params.rasterizedPage.height),
    bubbleRadius: Math.max(4, Math.round(bubbleRadiusRatio * params.rasterizedPage.width)),
    rowSymbols: geometry.rowSymbols,
    markThreshold: 0.45,
    ambiguityThreshold: 0.08,
    spatialTolerancePx: 2,
  }

  const isValid =
    scaledGeometry.startX >= 0 &&
    scaledGeometry.startY >= 0 &&
    scaledGeometry.columnGap >= 0 &&
    scaledGeometry.rowGap >= 0 &&
    scaledGeometry.bubbleRadius > 0 &&
    scaledGeometry.rowSymbols.length > 0

  if (!isValid) {
    return {
      geometry: null,
      source: 'fallbackDiagnosticGeometry',
      scaled: false,
      warnings: ['Geometria operacional persistida está inválida para a página rasterizada; usando fallback diagnostico.'],
    }
  }

  return {
    geometry: scaledGeometry,
    source,
    scaled: true,
    warnings:
      source === 'derivedRuntimeGeometry'
        ? ['Geometria operacional persistida reutilizada com derivacao runtime de razoes normalizadas.']
        : [],
  }
}

function getMathGeometrySourceWarning(source: NonNullable<OMRUploadProcessingReport['mathReadReports']>[number]['geometrySource']) {
  switch (source) {
    case 'operationalCellGrid':
      return 'Malha operacional por célula persistida do template foi usada e escalada para a pagina rasterizada.'
    case 'persistedOperationalGeometry':
      return 'Geometria operacional persistida do template foi usada e escalada para a pagina rasterizada.'
    case 'derivedRuntimeGeometry':
      return 'Geometria operacional foi derivada em runtime a partir da estrutura do template e escalada para a pagina rasterizada.'
    default:
      return 'Geometria da grade matematica foi inferida por fallback diagnostico.'
  }
}

function resolveMathGeometry(params: {
  template: Template
  mathBlock: Extract<Template['definition']['questionBlocks'][number], { sectionType: 'math' }>
  rasterizedPage: NonNullable<PdfRasterizationResult['rasterizedPages']>[number]
  pageBlocks: Template['definition']['questionBlocks']
}): {
  cellGrid: MathGridImageCellGrid | null
  geometry: MathGridImageGeometry | null
  source: 'operationalCellGrid' | 'persistedOperationalGeometry' | 'derivedRuntimeGeometry' | 'fallbackDiagnosticGeometry'
  scaled: boolean
  warnings: string[]
} {
  if (params.mathBlock.operationalCellGrid) {
    const persistedCellGrid = buildPersistedMathCellGrid({
      mathBlock: params.mathBlock,
      rasterizedPage: params.rasterizedPage,
    })

    if (persistedCellGrid.cellGrid) {
      return {
        cellGrid: persistedCellGrid.cellGrid,
        geometry: null,
        source: 'operationalCellGrid',
        scaled: true,
        warnings: persistedCellGrid.warnings,
      }
    }
  }

  if (params.mathBlock.operationalGeometry) {
    const persistedGeometry = buildPersistedMathGeometry({
      mathBlock: params.mathBlock,
      rasterizedPage: params.rasterizedPage,
    })

    return {
      cellGrid: null,
      ...persistedGeometry,
    }
  }

  const derivedGeometry = deriveMathOperationalGeometryInRuntime({
    template: params.template,
    pageBlocks: params.pageBlocks,
    mathBlockId: params.mathBlock.id,
    rasterizedPage: params.rasterizedPage,
  })

  if (derivedGeometry) {
    return {
      cellGrid: null,
      geometry: derivedGeometry,
      source: 'derivedRuntimeGeometry',
      scaled: true,
      warnings: ['Geometria operacional derivada em runtime para template legado sem coordenadas persistidas.'],
    }
  }

  return {
    cellGrid: null,
    geometry: null,
    source: 'fallbackDiagnosticGeometry',
    scaled: false,
    warnings: ['Geometria operacional ausente no template e nao foi possivel deriva-la em runtime; usando fallback diagnostico.'],
  }
}

async function buildMathReadReports(params: {
  template: Template
  answerKey: NonNullable<ReturnType<AnswerKeyService['findById']>>
  rasterizedPdf: PdfRasterizationResult | null
  templatePageMap: OMRUploadProcessingReport['templatePageMap']
}) {
  if (!params.rasterizedPdf?.rasterizedPages?.length || !params.templatePageMap?.pages?.length) {
    return undefined
  }

  const reports: NonNullable<OMRUploadProcessingReport['mathReadReports']> = []

  for (const pageDiagnostic of params.templatePageMap.pages) {
    const rasterizedPage = params.rasterizedPdf.rasterizedPages.find((page) => page.pageNumber === pageDiagnostic.pageNumber)
    if (!rasterizedPage) continue

    const mathBlocks = pageDiagnostic.blocksFound
      .filter((block) => block.sectionType === 'math')
      .map((block) => params.template.definition.questionBlocks.find((item) => item.id === block.id))
      .filter((block): block is Extract<(typeof params.template.definition.questionBlocks)[number], { sectionType: 'math' }> => Boolean(block))
    const pageBlocks = pageDiagnostic.blocksFound
      .map((block) => params.template.definition.questionBlocks.find((item) => item.id === block.id))
      .filter((block): block is (typeof params.template.definition.questionBlocks)[number] => Boolean(block))

    for (const mathBlock of mathBlocks) {
      const questionNumber = mathBlock.linkedQuestionNumber ?? 0
      const answerKeyQuestion = params.answerKey.questions?.find(
        (question) => question.questionNumber === questionNumber && question.questionType === 'math',
      )
      const allowedSymbols = buildMathTypeBAllowedSymbols({
        allowNegative: mathBlock.separatorMode === 'negative' || mathBlock.separatorMode === 'negative-comma' || mathBlock.separatorMode === 'negative-dot',
        decimalSeparator:
          mathBlock.separatorMode === 'comma' || mathBlock.separatorMode === 'negative-comma'
            ? ','
            : mathBlock.separatorMode === 'dot' || mathBlock.separatorMode === 'negative-dot'
              ? '.'
              : null,
      })
      const rowSymbols = getMathRowSymbols(allowedSymbols)
      const geometryResolution = resolveMathGeometry({
        template: params.template,
        mathBlock,
        rasterizedPage,
        pageBlocks,
      })
      const geometry =
        geometryResolution.cellGrid || geometryResolution.geometry
          ? geometryResolution.geometry
          : buildFallbackMathGeometry({
              pageWidth: rasterizedPage.width,
              pageHeight: rasterizedPage.height,
              columns: mathBlock.columns,
              rowSymbols,
            })
      const geometrySource =
        geometryResolution.cellGrid || geometryResolution.geometry
          ? geometryResolution.source
          : 'fallbackDiagnosticGeometry'
      const geometryScaled =
        geometryResolution.cellGrid || geometryResolution.geometry
          ? geometryResolution.scaled
          : false

      try {
        const mathRead = geometryResolution.cellGrid
          ? await readMathTypeBGridFromImageCells({
              imagePath: rasterizedPage.imagePath,
              questionNumber,
              allowedSymbols,
              cellGrid: geometryResolution.cellGrid,
            })
          : await readMathTypeBGridFromImage({
              imagePath: rasterizedPage.imagePath,
              questionNumber,
              columns: mathBlock.columns,
              allowedSymbols,
              geometry: geometry!,
            })
        const overlayResult = geometryResolution.cellGrid
          ? await generateMathTypeBDebugOverlay({
              imagePath: rasterizedPage.imagePath,
              questionNumber,
              pageNumber: rasterizedPage.pageNumber,
              cellGrid: geometryResolution.cellGrid,
              readResult: mathRead,
            })
          : { debugOverlayPath: undefined, warning: undefined }
        const diagnosticComparison = compareMathReadWithAnswerKey({
          detectedAnswer: mathRead.answer,
          multipleMarkedColumns: mathRead.multipleMarkedColumns,
          answerKeyQuestion,
        })
        const blankColumnDiagnostic = mathRead.blankColumns
          .map((columnNumber) => mathRead.columnDiagnostics.find((entry) => entry.columnNumber === columnNumber))
          .find((entry) => entry?.topCandidate)
        const columnDiagnosticWarnings = blankColumnDiagnostic?.topCandidate
          ? [
              `Coluna ${blankColumnDiagnostic.columnNumber} ficou em branco porque o melhor candidato foi "${blankColumnDiagnostic.topCandidate.symbol}" com fillRatio ${blankColumnDiagnostic.topCandidate.fillRatio.toFixed(3)} abaixo do threshold ${(blankColumnDiagnostic.topCandidate.thresholdUsed ?? blankColumnDiagnostic.thresholdUsed).toFixed(3)}.`,
            ]
          : []
        const diagnosticWarnings = [
          ...diagnosticComparison.diagnosticWarnings,
          ...columnDiagnosticWarnings,
          ...(overlayResult.warning ? [overlayResult.warning] : []),
        ]

        reports.push({
          questionNumber,
          pageNumber: rasterizedPage.pageNumber,
          answer: mathRead.answer,
          expectedAnswer: diagnosticComparison.expectedAnswer,
          detectedAnswer: diagnosticComparison.detectedAnswer,
          diagnosticMatch: diagnosticComparison.diagnosticMatch,
          diagnosticStatus: diagnosticComparison.diagnosticStatus,
          diagnosticWarnings,
          confidence: mathRead.confidence,
          geometrySource,
          geometryScaled,
          markThresholdUsed: mathRead.markThresholdUsed,
          ambiguityThresholdUsed: mathRead.ambiguityThresholdUsed,
          debugOverlayPath: overlayResult.debugOverlayPath,
          markedCells: mathRead.markedCells,
          blankColumns: mathRead.blankColumns,
          multipleMarkedColumns: mathRead.multipleMarkedColumns,
          columnDiagnostics: mathRead.columnDiagnostics,
          warnings: [
            'Leitura tipo B executada apenas em modo diagnostico; o resultado ainda nao altera nota nem correcao.',
            ...geometryResolution.warnings,
            ...mathRead.warnings,
          ],
        })
      } catch (error) {
        reports.push({
          questionNumber,
          pageNumber: rasterizedPage.pageNumber,
          answer: '',
          expectedAnswer: answerKeyQuestion?.correctAnswer?.trim() || null,
          detectedAnswer: '',
          diagnosticMatch: false,
          diagnosticStatus: answerKeyQuestion?.correctAnswer?.trim() ? 'blank' : 'missingAnswerKey',
          diagnosticWarnings: answerKeyQuestion?.correctAnswer?.trim()
            ? ['Leitura tipo B falhou antes da comparação diagnóstica completa; resposta esperada do gabarito foi mantida apenas para referência.']
            : ['Questão tipo B sem resposta cadastrada no gabarito para comparação diagnóstica.'],
          confidence: 0,
          geometrySource,
          geometryScaled,
          markThresholdUsed: geometryResolution.cellGrid?.markThreshold ?? geometry?.markThreshold ?? 0.45,
          ambiguityThresholdUsed:
            geometryResolution.cellGrid?.ambiguityThreshold ?? geometry?.ambiguityThreshold ?? 0.08,
          markedCells: [],
          blankColumns: [],
          multipleMarkedColumns: [],
          columnDiagnostics: [],
          warnings: [
            'Leitura tipo B executada apenas em modo diagnostico; o resultado ainda nao altera nota nem correcao.',
            ...geometryResolution.warnings,
          ],
          error: getErrorInfo(error),
        })
      }
    }
  }

  const normalizedReports = reports.map((report) => {
    const [diagnosticWarning, ...otherWarnings] = report.warnings

    return {
      ...report,
      warnings: [
        diagnosticWarning ?? 'Leitura tipo B executada apenas em modo diagnostico; o resultado ainda nao altera nota nem correcao.',
        getMathGeometrySourceWarning(report.geometrySource),
        ...otherWarnings,
      ],
    }
  })

  return normalizedReports.length > 0 ? normalizedReports : undefined
}

export type OMRProcessingResponse = {
  job: ProcessingJob
  totalFiles: number
  processedFiles: number
  failedFiles: number
  results: OMRResult[]
}

export class OMRService {
  async process(input: {
    examId: string
    uploadIds: string[]
    templateId: string
    answerKeyId: string
  }): Promise<OMRProcessingResponse> {
    const exam = db.exams.find((item) => item.id === input.examId)
    if (!exam) {
      throw new AppError('EXAM_NOT_FOUND', 'Prova não encontrada para processamento.', 404)
    }

    const template = templateService.findById(input.templateId)
    if (!template) {
      throw new AppError('TEMPLATE_NOT_FOUND', 'Template não encontrado. Crie um template antes do processamento.', 404)
    }

    if (template.examId !== input.examId) {
      throw new AppError('PROCESS_TEMPLATE_EXAM_MISMATCH', 'O template selecionado não pertence à prova ativa.', 400)
    }

    const answerKey = answerKeyService.findById(input.answerKeyId)
    if (!answerKey) {
      throw new AppError('ANSWER_KEY_NOT_FOUND', 'Gabarito não encontrado. Crie um gabarito para o template selecionado.', 404)
    }

    if (answerKey.examId !== input.examId) {
      throw new AppError('PROCESS_ANSWER_KEY_EXAM_MISMATCH', 'O gabarito selecionado não pertence à prova ativa.', 400)
    }

    if (answerKey.templateId !== template.id) {
      throw new AppError('PROCESS_ANSWER_KEY_TEMPLATE_MISMATCH', 'O gabarito selecionado não corresponde ao template informado.', 400)
    }

    const uploads = input.uploadIds.map((uploadId) => {
      const upload = db.uploads.find((item) => item.id === uploadId)
      if (!upload) {
        throw new AppError('UPLOAD_NOT_FOUND', `Upload ${uploadId} não encontrado.`, 404)
      }

      if (upload.examId !== input.examId) {
        throw new AppError('PROCESS_UPLOAD_EXAM_MISMATCH', 'Todos os uploads precisam pertencer à prova ativa.', 400)
      }

      return upload
    })

    const job: ProcessingJob = {
      id: generateId('job'),
      examId: input.examId,
      uploadIds: input.uploadIds,
      templateId: template.id,
      templateVersion: template.version ?? 'v1',
      answerKeyId: answerKey.id,
      answerKeyVersion: answerKey.name,
      status: 'queued',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      uploadReports: [],
    }

    db.jobs.push(job)
    db.persist()

    job.status = 'processing'
    job.updatedAt = new Date().toISOString()
    db.persist()

    const results: OMRResult[] = []
    let failedFiles = 0

    for (const upload of uploads) {
      let rasterizedPdf: PdfRasterizationResult | null = null
      let rasterizedPagePaths: string[] = []
      let templatePageMap: OMRUploadProcessingReport['templatePageMap']
      let mathReadReports: OMRUploadProcessingReport['mathReadReports']

      try {
        const originalFileWasPdf = isPdfUpload(upload)
        rasterizedPdf = originalFileWasPdf ? await rasterizePdfFirstPage(upload.path) : null
        rasterizedPagePaths = rasterizedPdf?.rasterizedPages?.map((page) => page.imagePath) ?? []
        templatePageMap =
          rasterizedPdf?.rasterizedPages && rasterizedPdf.rasterizedPages.length > 0
            ? buildTemplatePageMapDiagnostic({
                template,
                rasterizedPageCount: rasterizedPdf.rasterizedPages.length,
              })
            : undefined
        mathReadReports = await buildMathReadReports({
          template,
          answerKey,
          rasterizedPdf,
          templatePageMap,
        })

        const detection = await analyzeAnswerSheetImage({
          imagePath: rasterizedPdf?.imagePath ?? upload.path,
          templateName: template.name,
          templateConfig: template.omrConfig,
        })

        const correction = correctAnswers({ detection, answerKey })

        const result: OMRResult = {
          id: generateId('omr'),
          jobId: job.id,
          uploadId: upload.id,
          fileName: upload.originalName,
          templateUsedId: template.id,
          answerKeyUsedId: answerKey.id,
          totalQuestions: detection.totalQuestions,
          answers: correction.answers,
          blankQuestions: detection.blankQuestions,
          multipleMarkedQuestions: detection.multipleMarkedQuestions,
          totalCorrect: correction.totalCorrect,
          totalIncorrect: correction.totalIncorrect,
          score: correction.score,
          confidenceAverage: correction.confidenceAverage,
          metadata: {
            ...detection.metadata,
            templateName: `${template.name} (${template.version ?? 'v1'})`,
            processedAt: new Date().toISOString(),
          },
        }

        const report: OMRUploadProcessingReport = {
          uploadId: upload.id,
          fileName: upload.originalName,
          mimeType: upload.mimeType,
          status: 'processed',
          processedAt: result.metadata.processedAt,
          originalMimeType: upload.mimeType,
          processedMimeType: rasterizedPdf?.processedMimeType ?? upload.mimeType,
          originalFileWasPdf,
          processedPage: rasterizedPdf?.processedPage,
          pdfPageCount: rasterizedPdf?.pdfPageCount,
          rasterizationDpi: rasterizedPdf?.rasterizationDpi,
          rasterizedPages: rasterizedPdf?.rasterizedPages?.map((page) => ({
            pageNumber: page.pageNumber,
            pageCount: page.pageCount,
            rasterizationDpi: page.rasterizationDpi,
            width: page.width,
            height: page.height,
            imagePath: page.imagePath,
            processedMimeType: page.processedMimeType,
          })),
          templatePageMap,
          mathReadReports,
          warning: rasterizedPdf?.warning,
          width: detection.metadata.width,
          height: detection.metadata.height,
          autoRotationAngle: detection.metadata.autoRotationAngle,
          rotationCandidates: detection.metadata.rotationCandidates,
          rotationConfidence: detection.metadata.rotationConfidence,
          lowConfidenceWarning: detection.metadata.lowConfidenceWarning,
          boundingBoxDetected: detection.metadata.boundingBoxDetected,
          cropApplied: detection.metadata.cropApplied,
          cropFallbackUsed: detection.metadata.cropFallbackUsed,
          originalWidth: detection.metadata.originalWidth,
          originalHeight: detection.metadata.originalHeight,
          processedWidth: detection.metadata.processedWidth,
          processedHeight: detection.metadata.processedHeight,
          displacementAverage: detection.metadata.displacementAverage,
          maxDisplacementDetected: detection.metadata.maxDisplacementDetected,
          spatialCorrectionApplied: detection.metadata.spatialCorrectionApplied,
          confidenceAverage: correction.confidenceAverage,
          blankQuestionsCount: detection.blankQuestions.length,
          multipleMarkedQuestionsCount: detection.multipleMarkedQuestions.length,
        }

        job.uploadReports?.push(report)
        results.push(result)
        db.results.push(result)
        db.studentResults.push(
          buildStudentResult({
            examId: input.examId,
            upload,
            omrResultId: result.id,
            score: result.score,
            correct: result.totalCorrect,
            incorrect: result.totalIncorrect,
            blank: result.blankQuestions.length,
            multiple: result.multipleMarkedQuestions.length,
          }),
        )
      } catch (error) {
        failedFiles += 1
        job.uploadReports?.push({
          uploadId: upload.id,
          fileName: upload.originalName,
          mimeType: upload.mimeType,
          status: 'failed',
          processedAt: new Date().toISOString(),
          originalMimeType: upload.mimeType,
          processedMimeType: rasterizedPdf?.processedMimeType,
          originalFileWasPdf: isPdfUpload(upload),
          processedPage: rasterizedPdf?.processedPage,
          pdfPageCount: rasterizedPdf?.pdfPageCount,
          rasterizationDpi: rasterizedPdf?.rasterizationDpi,
          rasterizedPages: rasterizedPdf?.rasterizedPages?.map((page) => ({
            pageNumber: page.pageNumber,
            pageCount: page.pageCount,
            rasterizationDpi: page.rasterizationDpi,
            width: page.width,
            height: page.height,
            imagePath: page.imagePath,
            processedMimeType: page.processedMimeType,
          })),
          templatePageMap,
          mathReadReports,
          warning: rasterizedPdf?.warning,
          error: getErrorInfo(error),
        })
      } finally {
        await cleanupRasterizedPdfImages(rasterizedPagePaths.length ? rasterizedPagePaths : [rasterizedPdf?.imagePath ?? null])
      }

      job.updatedAt = new Date().toISOString()
      db.persist()
    }

    job.status = results.length > 0 ? 'completed' : 'failed'
    job.finishedAt = new Date().toISOString()
    job.updatedAt = job.finishedAt
    db.persist()

    return {
      job,
      totalFiles: uploads.length,
      processedFiles: results.length,
      failedFiles,
      results,
    }
  }
}
