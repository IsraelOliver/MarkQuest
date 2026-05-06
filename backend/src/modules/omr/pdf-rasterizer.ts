import fs from 'node:fs/promises'
import path from 'node:path'
import { createCanvas } from '@napi-rs/canvas'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import { env } from '../../config/env.js'
import { AppError } from '../../utils/app-error.js'
import { generateId } from '../../utils/id.js'

const PDF_RASTERIZATION_DPI = 144
const PDF_SCALE = PDF_RASTERIZATION_DPI / 72

export type PdfRasterizationResult = {
  imagePath: string
  processedMimeType: 'image/png'
  processedPage: number
  pdfPageCount: number
  rasterizationDpi: number
  warning?: string
}

export async function rasterizePdfFirstPage(pdfPath: string): Promise<PdfRasterizationResult> {
  try {
    const pdfBytes = await fs.readFile(pdfPath)
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(pdfBytes),
      disableFontFace: true,
      useSystemFonts: true,
    })

    const document = await loadingTask.promise
    const pdfPageCount = document.numPages
    const page = await document.getPage(1)
    const viewport = page.getViewport({ scale: PDF_SCALE })
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height))
    const canvasContext = canvas.getContext('2d')

    await page.render({ canvasContext, viewport, canvas } as never).promise

    const outputDir = path.resolve(process.cwd(), env.UPLOAD_DIR, 'omr-rasterized')
    await fs.mkdir(outputDir, { recursive: true })

    const imagePath = path.join(outputDir, `${generateId('pdf_page')}.png`)
    await fs.writeFile(imagePath, canvas.toBuffer('image/png'))

    await document.destroy()

    return {
      imagePath,
      processedMimeType: 'image/png',
      processedPage: 1,
      pdfPageCount,
      rasterizationDpi: PDF_RASTERIZATION_DPI,
      warning: pdfPageCount > 1 ? 'PDF com múltiplas páginas: apenas a primeira página foi processada.' : undefined,
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new AppError(
      'PDF_RASTERIZATION_FAILED',
      `Não foi possível rasterizar o PDF para leitura OMR: ${detail}`,
      422,
    )
  }
}

export async function cleanupRasterizedPdfImage(imagePath: string | null) {
  if (!imagePath) return
  await fs.rm(imagePath, { force: true })
}
