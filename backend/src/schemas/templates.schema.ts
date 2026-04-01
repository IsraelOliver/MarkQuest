import { z } from 'zod'
import { MAX_QUESTIONS } from '../constants/question-limits.js'

const cardPresetSchema = z.enum([
  'enem-a4',
  'school-a4',
  'quiz-20',
  'quiz-45',
  'quiz-60',
  'answer-sheet-4',
  'answer-sheet-5',
])

const omrConfigSchema = z
  .object({
    choicesPerQuestion: z.union([z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).optional(),
    columns: z.number().int().positive().optional(),
    rowsPerColumn: z.number().int().positive().optional(),
    startXRatio: z.number().min(0).max(1).optional(),
    startYRatio: z.number().min(0).max(1).optional(),
    columnGapRatio: z.number().min(0).max(1).optional(),
    rowGapRatio: z.number().min(0).max(1).optional(),
    optionGapRatio: z.number().min(0).max(1).optional(),
    bubbleRadiusRatio: z.number().min(0.001).max(0.2).optional(),
    markThreshold: z.number().min(0).max(1).optional(),
    ambiguityThreshold: z.number().min(0).max(1).optional(),
  })
  .optional()

const cardDefinitionSchema = z.object({
  pageSize: z.literal('A4'),
  totalQuestions: z.number().int().positive().max(MAX_QUESTIONS),
  choicesPerQuestion: z.union([z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  optionLabels: z.array(z.string().regex(/^[A-Z0-9]$/)).min(2).max(5),
  columns: z.number().int().positive(),
  rowsPerColumn: z.number().int().positive(),
  numberingFormat: z.enum(['numeric', 'numericAlpha', 'alphaNumeric', 'numericLower', 'numericDash']),
  bubbleSize: z.enum(['large', 'medium', 'small']),
  rowSpacing: z.enum(['compact', 'uniform']),
  columnLayoutMode: z.enum(['left', 'distributed']),
  columnGap: z.number().min(0).max(40),
  optionAlignment: z.enum(['auto', 'left', 'right', 'center', 'justify']),
  enableQuestionBlocks: z.boolean(),
  showQuestionBlockTitles: z.boolean(),
  questionBlocks: z.array(
    z.object({
      startQuestion: z.number().int().positive(),
  endQuestion: z.number().int().positive().max(MAX_QUESTIONS),
      title: z.string(),
      choicesPerQuestion: z.union([z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
      optionLabels: z.array(z.string().regex(/^[A-Z0-9]$/)).min(2).max(5),
      questionStyle: z.enum(['classic', 'lined', 'minimal']),
    }),
  ),
  identification: z.object({
    showStudentName: z.boolean(),
    showStudentCode: z.boolean(),
    showClassroom: z.boolean(),
    showDate: z.boolean(),
    showExamCode: z.boolean(),
    showSignature: z.boolean(),
    showManualIdGrid: z.boolean(),
    extraFields: z.array(z.string()),
  }),
  header: z.object({
    institutionName: z.string(),
    examName: z.string(),
    subtitle: z.string(),
    classroomLabel: z.string(),
    instructions: z.string(),
    showInstructions: z.boolean(),
    omrGuidance: z.string(),
    footerMessage: z.string(),
    footerMessageAlignment: z.enum(['left', 'center', 'right']),
    footerMessageWeight: z.enum(['regular', 'semibold']),
    footerMessageFontSize: z.number().min(7).max(11),
    footerPagePosition: z.enum(['top', 'bottom']),
    footerPageTone: z.enum(['subtle', 'standard']),
    showInstitutionLogo: z.boolean(),
    institutionLogoDataUrl: z.string(),
    logoAlignment: z.enum(['left', 'center', 'right']),
    logoScale: z.number().min(0.6).max(1.2),
    logoMonochrome: z.boolean(),
  }),
})

const cardVisualThemeSchema = z.object({
  visualStyle: z.enum(['institutional', 'vestibular', 'compact']),
  density: z.enum(['compact', 'balanced', 'spacious']),
  softBorders: z.boolean(),
  showSectionSeparators: z.boolean(),
  refinedAlignment: z.boolean(),
  highlightHeader: z.boolean(),
  answerGridStyle: z.enum(['classic', 'lined', 'minimal']),
})

export const createTemplateSchema = z.object({
  name: z.string().min(3),
  examId: z.string().min(1),
  totalQuestions: z.number().int().positive().max(MAX_QUESTIONS),
  presetId: cardPresetSchema,
  definition: cardDefinitionSchema,
  visualTheme: cardVisualThemeSchema,
  omrConfig: omrConfigSchema,
})

export const updateTemplateSchema = createTemplateSchema.extend({
  id: z.string().min(1).optional(),
})

export const templateListQuerySchema = z.object({
  examId: z.string().min(1).optional(),
})
