import { z } from 'zod'

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
    choicesPerQuestion: z.union([z.literal(4), z.literal(5)]).optional(),
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
  totalQuestions: z.number().int().positive(),
  choicesPerQuestion: z.union([z.literal(4), z.literal(5)]),
  columns: z.number().int().positive(),
  rowsPerColumn: z.number().int().positive(),
  numberingMode: z.enum(['continuous', 'by-block']),
  groupByArea: z.boolean(),
  showBlockTitles: z.boolean(),
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
    omrGuidance: z.string(),
    showInstitutionLogo: z.boolean(),
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
  totalQuestions: z.number().int().positive(),
  presetId: cardPresetSchema,
  definition: cardDefinitionSchema,
  visualTheme: cardVisualThemeSchema,
  omrConfig: omrConfigSchema,
})

export const updateTemplateSchema = createTemplateSchema.extend({
  id: z.string().min(1).optional(),
})
