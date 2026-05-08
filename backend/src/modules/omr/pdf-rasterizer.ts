import fs from 'node:fs/promises'
import path from 'node:path'
import { createCanvas } from '@napi-rs/canvas'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import { env } from '../../config/env.js'
import { AppError } from '../../utils/app-error.js'
import { generateId } from '../../utils/id.js'

const PDF_RASTERIZATION_DPI = 144
const PDF_SCALE = PDF_RASTERIZATION_DPI / 72

export type PdfRasterizedPage = {
  imagePath: string
  processedMimeType: 'image/png'
  pageNumber: number
  pageCount: number
  rasterizationDpi: number
  width: number
  height: number
}

export type PdfRasterizationResult = {
  imagePath: string
  processedMimeType: 'image/png'
  processedPage: number
  pdfPageCount: number
  rasterizationDpi: number
  warning?: string
  width: number
  height: number
  rasterizedPages?: PdfRasterizedPage[]
}

type LoadedPdfDocument = Awaited<ReturnType<typeof pdfjsLib.getDocument>>['promise'] extends Promise<infer T> ? T : never

async function renderPdfPage(document: LoadedPdfDocument, pageNumber: number): Promise<PdfRasterizedPage> {
  const page = await document.getPage(pageNumber)
  const viewport = page.getViewport({ scale: PDF_SCALE })
  const width = Math.ceil(viewport.width)
  const height = Math.ceil(viewport.height)
  const canvas = createCanvas(width, height)
  const canvasContext = canvas.getContext('2d')

  await page.render({ canvasContext, viewport, canvas } as never).promise

  const outputDir = path.resolve(process.cwd(), env.UPLOAD_DIR, 'omr-rasterized')
  await fs.mkdir(outputDir, { recursive: true })

  const imagePath = path.join(outputDir, `${generateId('pdf_page')}.png`)
  await fs.writeFile(imagePath, canvas.toBuffer('image/png'))

  return {
    imagePath,
    processedMimeType: 'image/png',
    pageNumber,
    pageCount: document.numPages,
    rasterizationDpi: PDF_RASTERIZATION_DPI,
    width,
    height,
  }
}

export async function rasterizePdfAllPages(pdfPath: string): Promise<PdfRasterizedPage[]> {
  try {
    const pdfBytes = await fs.readFile(pdfPath)
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(pdfBytes),
      disableFontFace: true,
      useSystemFonts: true,
    })

    const document = await loadingTask.promise

    try {
      return await Promise.all(
        Array.from({ length: document.numPages }, (_, index) => renderPdfPage(document, index + 1)),
      )
    } finally {
      await document.destroy()
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new AppError(
      'PDF_RASTERIZATION_FAILED',
      `NÃ£o foi possÃ­vel rasterizar o PDF para leitura OMR: ${detail}`,
      422,
    )
  }
}

export async function rasterizePdfFirstPage(pdfPath: string): Promise<PdfRasterizationResult> {
  const rasterizedPages = await rasterizePdfAllPages(pdfPath)
  const firstPage = rasterizedPages[0]

  if (!firstPage) {
    throw new AppError('PDF_RASTERIZATION_FAILED', 'NÃ£o foi possÃ­vel rasterizar a primeira pÃ¡gina do PDF.', 422)
  }

  return {
    imagePath: firstPage.imagePath,
    processedMimeType: firstPage.processedMimeType,
    processedPage: firstPage.pageNumber,
    pdfPageCount: firstPage.pageCount,
    rasterizationDpi: firstPage.rasterizationDpi,
    width: firstPage.width,
    height: firstPage.height,
    rasterizedPages,
    warning:
      firstPage.pageCount > 1
        ? 'PDF com mÃºltiplas pÃ¡ginas rasterizado integralmente; apenas a primeira pÃ¡gina foi usada na leitura OMR objetiva.'
        : undefined,
  }
}

export async function cleanupRasterizedPdfImages(imagePaths: Array<string | null | undefined>) {
  const uniquePaths = [...new Set(imagePaths.filter((imagePath): imagePath is string => Boolean(imagePath)))]
  await Promise.all(uniquePaths.map((imagePath) => fs.rm(imagePath, { force: true })))
}

export async function cleanupRasterizedPdfImage(imagePath: string | null) {
  if (!imagePath) return
  await cleanupRasterizedPdfImages([imagePath])
}
