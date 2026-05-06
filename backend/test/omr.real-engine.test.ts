import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import Jimp from 'jimp'
import { describe, expect, it } from 'vitest'
import { correctAnswers } from '../src/modules/results/correction.service.js'
import { analyzeAnswerSheetImage } from '../src/modules/omr/omr.engine.js'
import { preprocessImage } from '../src/modules/omr/image-preprocessing.js'
import type { AnswerKey, OMRTemplateConfig } from '../src/types/entities.js'

const fixturePath = path.resolve(process.cwd(), 'test/fixtures/omr-10q-controlled.png')

const controlledTemplateConfig: OMRTemplateConfig = {
  totalQuestions: 10,
  choicesPerQuestion: 5,
  columns: 1,
  rowsPerColumn: 10,
  startXRatio: 0.25,
  startYRatio: 0.18,
  columnGapRatio: 0,
  rowGapRatio: 0.065,
  optionGapRatio: 0.065,
  bubbleRadiusRatio: 0.022,
  markThreshold: 0.25,
  ambiguityThreshold: 0.15,
}

const answerKey: AnswerKey = {
  id: 'key_controlled_10q',
  name: 'Gabarito controlado 10Q',
  examId: 'exam_controlled_10q',
  templateId: 'tpl_controlled_10q',
  answers: ['A', 'C', 'D', 'A', 'B', 'D', 'E', 'A', 'B', 'C'],
  createdAt: '2026-04-29T00:00:00.000Z',
}

const detectedOptions = ['A', 'C', 'E', null, 'B', 'D', null, 'A', null, 'C'] as const
const detectedStatuses = [
  'marked',
  'marked',
  'marked',
  'blank',
  'marked',
  'marked',
  'multiple',
  'marked',
  'blank',
  'marked',
] as const
const lowConfidenceWarning = 'Leitura OMR com baixa confiança. Revise o cartão processado.'

function drawFilledCircle(image: Jimp, centerX: number, centerY: number, radius: number, color: number): void {
  const xMin = Math.max(0, Math.floor(centerX - radius))
  const xMax = Math.min(image.bitmap.width - 1, Math.ceil(centerX + radius))
  const yMin = Math.max(0, Math.floor(centerY - radius))
  const yMax = Math.min(image.bitmap.height - 1, Math.ceil(centerY + radius))

  for (let y = yMin; y <= yMax; y += 1) {
    for (let x = xMin; x <= xMax; x += 1) {
      const dx = x - centerX
      const dy = y - centerY
      if (dx * dx + dy * dy <= radius * radius) image.setPixelColor(color, x, y)
    }
  }
}

async function createShiftedMarksFixture(offsetX: number, offsetY: number): Promise<string> {
  const image = await Jimp.read(fixturePath)
  const black = Jimp.rgbaToInt(28, 28, 28, 255)
  const white = Jimp.rgbaToInt(255, 255, 255, 255)
  const questionMarks: Array<Array<'A' | 'B' | 'C' | 'D' | 'E'>> = [
    ['A'],
    ['C'],
    ['E'],
    [],
    ['B'],
    ['D'],
    ['B', 'D'],
    ['A'],
    [],
    ['C'],
  ]
  const options = ['A', 'B', 'C', 'D', 'E'] as const
  const eraseRadius = Math.round(image.bitmap.width * controlledTemplateConfig.bubbleRadiusRatio * 0.72)
  const fillRadius = Math.round(image.bitmap.width * controlledTemplateConfig.bubbleRadiusRatio * 0.66)

  questionMarks.forEach((markedOptions, questionIndex) => {
    const yCenter = Math.round(
      image.bitmap.height * (controlledTemplateConfig.startYRatio + questionIndex * controlledTemplateConfig.rowGapRatio),
    )

    markedOptions.forEach((option) => {
      const optionIndex = options.indexOf(option)
      const xCenter = Math.round(
        image.bitmap.width * (controlledTemplateConfig.startXRatio + optionIndex * controlledTemplateConfig.optionGapRatio),
      )

      drawFilledCircle(image, xCenter, yCenter, eraseRadius, white)
      drawFilledCircle(image, xCenter + offsetX, yCenter + offsetY, fillRadius, black)
    })
  })

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'markquest-omr-shifted-'))
  const shiftedPath = path.join(tempDir, `omr-shifted-${offsetX}-${offsetY}.png`)
  await image.writeAsync(shiftedPath)
  return shiftedPath
}

async function createPaddedFixture(options?: { shadowAndNoise?: boolean }): Promise<string> {
  const source = await Jimp.read(fixturePath)
  const padding = 80
  const white = Jimp.rgbaToInt(255, 255, 255, 255)
  const lightGray = Jimp.rgbaToInt(224, 224, 224, 255)
  const noiseGray = Jimp.rgbaToInt(232, 232, 232, 255)
  const image = new Jimp(source.bitmap.width + padding * 2, source.bitmap.height + padding * 2, white)

  if (options?.shadowAndNoise) {
    image.scan(padding + 12, padding + 14, source.bitmap.width, source.bitmap.height, function shadow(_x, _y, idx) {
      this.bitmap.data.writeUInt32BE(lightGray, idx)
    })
  }

  image.composite(source, padding, padding)

  if (options?.shadowAndNoise) {
    for (let y = padding + 40; y < padding + source.bitmap.height - 40; y += 97) {
      for (let x = padding + 40; x < padding + source.bitmap.width - 40; x += 113) {
        image.setPixelColor(noiseGray, x, y)
        image.setPixelColor(noiseGray, x + 1, y)
      }
    }
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'markquest-omr-padded-'))
  const paddedPath = path.join(tempDir, options?.shadowAndNoise ? 'omr-padded-shadow-noise.png' : 'omr-padded.png')
  await image.writeAsync(paddedPath)
  return paddedPath
}

async function createWithoutCornerMarkersFixture(): Promise<string> {
  const image = await Jimp.read(fixturePath)
  const white = Jimp.rgbaToInt(255, 255, 255, 255)
  const radius = 30
  const corners = [
    [12, 12],
    [image.bitmap.width - 12, 12],
    [12, image.bitmap.height - 12],
    [image.bitmap.width - 12, image.bitmap.height - 12],
  ] as const

  corners.forEach(([x, y]) => drawFilledCircle(image, x, y, radius, white))

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'markquest-omr-no-corners-'))
  const noCornersPath = path.join(tempDir, 'omr-no-corner-markers.png')
  await image.writeAsync(noCornersPath)
  return noCornersPath
}

async function createRotatedFixture(angle: number): Promise<string> {
  const image = await Jimp.read(fixturePath)
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'markquest-omr-rotated-'))
  const rotatedPath = path.join(tempDir, `omr-rotated-${angle}.png`)
  await image.rotate(angle, false).writeAsync(rotatedPath)
  return rotatedPath
}

async function createDegradedMarksFixture(): Promise<string> {
  const image = await Jimp.read(fixturePath)
  const white = Jimp.rgbaToInt(255, 255, 255, 255)
  const gray = Jimp.rgbaToInt(140, 140, 140, 255)
  const questionMarks: Array<Array<'A' | 'B' | 'C' | 'D' | 'E'>> = [
    ['A'],
    ['C'],
    ['E'],
    [],
    ['B'],
    ['D'],
    ['B', 'D'],
    ['A'],
    [],
    ['C'],
  ]
  const options = ['A', 'B', 'C', 'D', 'E'] as const
  const eraseRadius = Math.round(image.bitmap.width * controlledTemplateConfig.bubbleRadiusRatio * 0.72)
  const fillRadius = Math.round(image.bitmap.width * controlledTemplateConfig.bubbleRadiusRatio * 0.25)

  questionMarks.forEach((markedOptions, questionIndex) => {
    const yCenter = Math.round(
      image.bitmap.height * (controlledTemplateConfig.startYRatio + questionIndex * controlledTemplateConfig.rowGapRatio),
    )

    markedOptions.forEach((option) => {
      const optionIndex = options.indexOf(option)
      const xCenter = Math.round(
        image.bitmap.width * (controlledTemplateConfig.startXRatio + optionIndex * controlledTemplateConfig.optionGapRatio),
      )

      drawFilledCircle(image, xCenter, yCenter, eraseRadius, white)
      drawFilledCircle(image, xCenter, yCenter, fillRadius, gray)
    })
  })

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'markquest-omr-degraded-'))
  const degradedPath = path.join(tempDir, 'omr-degraded-marks.png')
  await image.writeAsync(degradedPath)
  return degradedPath
}

describe('OMR real engine with controlled MarkQuest-style raster fixture', () => {
  it('detects marked, blank and multiple answers without mocking the engine', async () => {
    const detection = await analyzeAnswerSheetImage({
      imagePath: fixturePath,
      templateName: 'Controlled 10Q raster fixture',
      templateConfig: controlledTemplateConfig,
    })

    const correction = correctAnswers({ detection, answerKey })

    expect(detection.totalQuestions).toBe(10)
    expect(detection.answers.map((answer) => answer.selectedOption)).toEqual(detectedOptions)
    expect(detection.answers.map((answer) => answer.status)).toEqual(detectedStatuses)
    expect(detection.blankQuestions).toEqual([4, 9])
    expect(detection.multipleMarkedQuestions).toEqual([7])
    expect(detection.metadata.boundingBoxDetected).toBe(true)
    expect(detection.metadata.cropApplied).toBe(false)
    expect(detection.metadata.cropFallbackUsed).toBe(false)
    expect(detection.metadata.originalWidth).toBe(1200)
    expect(detection.metadata.originalHeight).toBe(1700)
    expect(detection.metadata.processedWidth).toBe(1200)
    expect(detection.metadata.processedHeight).toBe(1700)
    expect(detection.metadata.autoRotationAngle).toBe(0)
    expect(detection.metadata.rotationCandidates).toEqual(
      expect.arrayContaining([expect.objectContaining({ angle: 0, score: expect.any(Number) })]),
    )
    expect(detection.metadata.rotationConfidence).toBeGreaterThan(0)
    expect(detection.metadata.lowConfidenceWarning).toBeUndefined()

    expect(correction.totalCorrect).toBe(6)
    expect(correction.totalIncorrect).toBe(4)
    expect(correction.score).toBe(60)
    expect(correction.confidenceAverage).toBeGreaterThan(0.55)
  })

  it('detects the same answers when filled marks are shifted a few pixels right and down', async () => {
    const shiftedFixturePath = await createShiftedMarksFixture(4, 3)

    const originalDetection = await analyzeAnswerSheetImage({
      imagePath: fixturePath,
      templateName: 'Controlled 10Q raster fixture',
      templateConfig: controlledTemplateConfig,
    })
    const shiftedDetection = await analyzeAnswerSheetImage({
      imagePath: shiftedFixturePath,
      templateName: 'Controlled 10Q shifted marks raster fixture',
      templateConfig: controlledTemplateConfig,
    })

    const correction = correctAnswers({ detection: shiftedDetection, answerKey })
    const originalAverageConfidence =
      originalDetection.answers.reduce((sum, answer) => sum + answer.confidence, 0) / originalDetection.answers.length
    const shiftedAverageConfidence =
      shiftedDetection.answers.reduce((sum, answer) => sum + answer.confidence, 0) / shiftedDetection.answers.length

    expect(shiftedDetection.answers.map((answer) => answer.selectedOption)).toEqual(detectedOptions)
    expect(shiftedDetection.answers.map((answer) => answer.status)).toEqual(detectedStatuses)
    expect(shiftedDetection.blankQuestions).toEqual([4, 9])
    expect(shiftedDetection.multipleMarkedQuestions).toEqual([7])
    expect(shiftedDetection.metadata.spatialTolerancePx).toBe(4)
    expect(shiftedDetection.metadata.maxDisplacementDetected).toBeGreaterThan(0)
    expect(shiftedDetection.metadata.spatialCorrectionApplied).toBe(true)
    expect(shiftedAverageConfidence).toBeGreaterThanOrEqual(originalAverageConfidence - 0.15)

    expect(correction.totalCorrect).toBe(6)
    expect(correction.totalIncorrect).toBe(4)
    expect(correction.score).toBe(60)
  })

  it('reads a lightly rotated image and records the selected rotation candidate', async () => {
    const rotatedFixturePath = await createRotatedFixture(2)
    const detection = await analyzeAnswerSheetImage({
      imagePath: rotatedFixturePath,
      templateName: 'Controlled 10Q lightly rotated raster fixture',
      templateConfig: controlledTemplateConfig,
    })

    const correction = correctAnswers({ detection, answerKey })

    expect(detection.answers.map((answer) => answer.selectedOption)).toEqual(detectedOptions)
    expect(detection.answers.map((answer) => answer.status)).toEqual(detectedStatuses)
    expect(detection.metadata.autoRotationAngle).toBeGreaterThanOrEqual(-3)
    expect(detection.metadata.autoRotationAngle).toBeLessThanOrEqual(3)
    expect(detection.metadata.rotationCandidates).toHaveLength(7)
    expect(detection.metadata.lowConfidenceWarning).toBeUndefined()
    expect(correction.score).toBe(60)
  })

  it('flags low confidence when rotation is above the current correction capacity', async () => {
    const rotatedFixturePath = await createRotatedFixture(7)
    const detection = await analyzeAnswerSheetImage({
      imagePath: rotatedFixturePath,
      templateName: 'Controlled 10Q over-rotated raster fixture',
      templateConfig: controlledTemplateConfig,
    })

    expect(Math.abs(detection.metadata.autoRotationAngle)).toBe(3)
    expect(detection.metadata.lowConfidenceWarning).toBe(lowConfidenceWarning)
    expect(detection.answers).toHaveLength(10)
  })

  it('flags low confidence when marks are visually degraded', async () => {
    const degradedFixturePath = await createDegradedMarksFixture()
    const detection = await analyzeAnswerSheetImage({
      imagePath: degradedFixturePath,
      templateName: 'Controlled 10Q degraded marks raster fixture',
      templateConfig: controlledTemplateConfig,
    })

    const correction = correctAnswers({ detection, answerKey })

    expect(detection.metadata.lowConfidenceWarning).toBe(lowConfidenceWarning)
    expect(detection.answers.map((answer) => answer.selectedOption)).toEqual(detectedOptions)
    expect(detection.answers.map((answer) => answer.status)).toEqual(detectedStatuses)
    expect(correction.score).toBe(60)
  })

  it('detects the card area and reads answers from an image with extra page margin', async () => {
    const paddedFixturePath = await createPaddedFixture()
    const detection = await analyzeAnswerSheetImage({
      imagePath: paddedFixturePath,
      templateName: 'Controlled 10Q raster fixture with margin',
      templateConfig: controlledTemplateConfig,
    })

    const correction = correctAnswers({ detection, answerKey })

    expect(detection.answers.map((answer) => answer.selectedOption)).toEqual(detectedOptions)
    expect(detection.answers.map((answer) => answer.status)).toEqual(detectedStatuses)
    expect(detection.blankQuestions).toEqual([4, 9])
    expect(detection.multipleMarkedQuestions).toEqual([7])
    expect(detection.metadata.boundingBoxDetected).toBe(true)
    expect(detection.metadata.cropApplied).toBe(true)
    expect(detection.metadata.cropFallbackUsed).toBe(false)
    expect(detection.metadata.originalWidth).toBe(1360)
    expect(detection.metadata.originalHeight).toBe(1860)
    expect(detection.metadata.processedWidth).toBe(1200)
    expect(detection.metadata.processedHeight).toBe(1700)
    expect(correction.score).toBe(60)
  })

  it('keeps reading answers with light shadow and simple noise around the card', async () => {
    const noisyFixturePath = await createPaddedFixture({ shadowAndNoise: true })
    const detection = await analyzeAnswerSheetImage({
      imagePath: noisyFixturePath,
      templateName: 'Controlled 10Q raster fixture with shadow and noise',
      templateConfig: controlledTemplateConfig,
    })

    const correction = correctAnswers({ detection, answerKey })

    expect(detection.answers.map((answer) => answer.selectedOption)).toEqual(detectedOptions)
    expect(detection.answers.map((answer) => answer.status)).toEqual(detectedStatuses)
    expect(detection.metadata.boundingBoxDetected).toBe(true)
    expect(detection.metadata.cropApplied).toBe(true)
    expect(detection.metadata.cropFallbackUsed).toBe(false)
    expect(correction.score).toBe(60)
  })

  it('uses the legacy dark-pixel crop fallback when corner markers are unavailable', async () => {
    const noCornersFixturePath = await createWithoutCornerMarkersFixture()
    const preprocessed = await preprocessImage(noCornersFixturePath)

    expect(preprocessed.boundingBoxDetected).toBe(false)
    expect(preprocessed.cropFallbackUsed).toBe(true)
    expect(preprocessed.originalWidth).toBe(1200)
    expect(preprocessed.originalHeight).toBe(1700)
    expect(preprocessed.processedWidth).toBe(1200)
    expect(preprocessed.processedHeight).toBe(1700)
  })
})
