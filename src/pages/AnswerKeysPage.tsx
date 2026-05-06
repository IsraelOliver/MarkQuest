import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { Link, useBlocker, useNavigate, useParams } from 'react-router-dom'
import type { Location } from 'react-router-dom'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { ApiErrorState } from '../components/ApiErrorState'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { SectionTitle } from '../components/SectionTitle'
import { useAcademicScope } from '../hooks/useAcademicScope'
import { omrService } from '../services/omrService'
import type { AnnulledScoringMode, AnswerKey, AnswerKeyQuestion, Template } from '../types/omr'
import { buildAnswerKeyQuestionModel, buildLegacyAnswers, calculateAnswerKeyScore, calculateQuestionFinalScore, getMathAnswerCharacters, getQuestionBaseScore } from '../utils/answerKeyModel'
import { setSelectedExamId } from '../utils/domainSelection'
import { formatApiErrorMessage } from '../utils/display'

type RangeFormState = {
  start: number
  end: number
  score: number
  weight: number
}

type ScoreRangeState = Pick<RangeFormState, 'start' | 'end' | 'score'>

type SaveIntent = 'stay' | 'leave'
type SidePanelTab = 'score' | 'weight' | 'summary'
type PopoverPlacement = 'top' | 'bottom'
type PopoverPosition = {
  top: number
  left: number
  width: number
  placement: PopoverPlacement
}

const ANNULLED_SCORING_OPTIONS: Array<{ value: AnnulledScoringMode; label: string }> = [
  { value: 'redistribute-group', label: 'Redistribuir no grupo' },
  { value: 'redistribute-exam', label: 'Redistribuir na prova' },
  { value: 'grant-student', label: 'Dar ponto ao aluno' },
]

function getTemplateTimestamp(template: Pick<Template, 'createdAt' | 'updatedAt'>) {
  return new Date(template.updatedAt ?? template.createdAt).getTime()
}

function getAnswerKeyTimestamp(answerKey: Pick<AnswerKey, 'createdAt' | 'updatedAt'>) {
  return new Date(answerKey.updatedAt ?? answerKey.createdAt).getTime()
}

function getQuestionTypeLabel(question: AnswerKeyQuestion) {
  if (question.questionType === 'math') return question.groupLabel ?? 'Matemática'
  if (question.questionType === 'open') return question.groupLabel ?? 'Discursiva'
  if (question.questionType === 'essay') return 'Redação'
  return question.groupLabel ?? question.validOptions.join('')
}

function isCompactObjectiveQuestion(question: AnswerKeyQuestion) {
  return question.questionType === 'objective'
}

function getAnswerKeyGridMinWidth(maxVisibleOptions: number) {
  if (maxVisibleOptions >= 5) return '12.4rem'
  if (maxVisibleOptions === 4) return '10.9rem'
  if (maxVisibleOptions === 2) return '8.4rem'
  return '9.6rem'
}

function normalizeNumber(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback
}

function sanitizeMathAnswer(question: AnswerKeyQuestion, rawValue: string) {
  const allowedCharacters = new Set(getMathAnswerCharacters(question))
  const allowsNegative = allowedCharacters.has('-')
  const allowedDecimalSeparators = [',', '.'].filter((character) => allowedCharacters.has(character))
  const normalizedCharacters: string[] = []
  let hasNegative = false
  let hasDecimalSeparator = false

  for (const character of rawValue) {
    if (!allowedCharacters.has(character)) continue

    if (character >= '0' && character <= '9') {
      normalizedCharacters.push(character)
      continue
    }

    if (character === '-') {
      if (!allowsNegative || hasNegative || normalizedCharacters.length > 0) continue
      normalizedCharacters.push(character)
      hasNegative = true
      continue
    }

    if ((character === ',' || character === '.') && allowedDecimalSeparators.includes(character)) {
      if (hasDecimalSeparator) continue
      normalizedCharacters.push(character)
      hasDecimalSeparator = true
    }
  }

  const normalized = normalizedCharacters.join('')
  const safeLength = question.responseColumns ?? normalized.length
  return normalized.slice(0, safeLength)
}

function isQuestionMissingAnswer(question: AnswerKeyQuestion) {
  if (question.status === 'annulled') return false
  if (question.questionType === 'objective' || question.questionType === 'math') {
    return !question.correctAnswer
  }
  return false
}

function isScoreBearingQuestion(question: AnswerKeyQuestion) {
  return question.questionType !== 'image' && question.status !== 'annulled'
}

function replaceQuestion(
  questions: AnswerKeyQuestion[],
  questionNumber: number,
  patch: Partial<AnswerKeyQuestion>,
) {
  return questions.map((question) => (question.questionNumber === questionNumber ? { ...question, ...patch } : question))
}

function setQuestionScore(questions: AnswerKeyQuestion[], questionNumber: number, nextScore: number) {
  return questions.map((question) => {
    if (question.questionNumber !== questionNumber) return question
    if (question.questionType === 'open' || question.questionType === 'essay') {
      return { ...question, maxScore: nextScore }
    }
    return { ...question, score: nextScore }
  })
}

function applyScoreToQuestions(
  questions: AnswerKeyQuestion[],
  predicate: (question: AnswerKeyQuestion) => boolean,
  nextScore: number,
) {
  return questions.map((question) => {
    if (!predicate(question)) return question
    if (question.questionType === 'open' || question.questionType === 'essay') {
      return { ...question, maxScore: nextScore }
    }
    return { ...question, score: nextScore }
  })
}

function applyWeightToQuestions(
  questions: AnswerKeyQuestion[],
  predicate: (question: AnswerKeyQuestion) => boolean,
  nextWeight: number,
) {
  return questions.map((question) => (predicate(question) ? { ...question, weight: nextWeight } : question))
}

function distributeScoreAcrossQuestions(questions: AnswerKeyQuestion[], totalScore: number) {
  const scoreBearingQuestions = questions.filter(isScoreBearingQuestion)
  if (!scoreBearingQuestions.length) return questions
  const equalScore = totalScore / scoreBearingQuestions.length
  return questions.map((question) => {
    if (!isScoreBearingQuestion(question)) return question
    if (question.questionType === 'open' || question.questionType === 'essay') {
      return { ...question, score: equalScore, maxScore: equalScore }
    }
    return { ...question, score: equalScore }
  })
}

function getExistingAnswerKey(answerKeys: AnswerKey[], templateId: string | null) {
  if (!templateId) return null
  const matches = answerKeys.filter((answerKey) => answerKey.templateId === templateId)
  if (!matches.length) return null
  return [...matches].sort((left, right) => getAnswerKeyTimestamp(right) - getAnswerKeyTimestamp(left))[0]
}

function getAnswerKeySnapshot(input: {
  questions: AnswerKeyQuestion[]
  defaultScore: number
  defaultWeight: number
  essayMaxScore: number
  annulledScoringMode: AnnulledScoringMode
  templateId: string | null
}) {
  return JSON.stringify({
    templateId: input.templateId,
    defaultScore: input.defaultScore,
    defaultWeight: input.defaultWeight,
    essayMaxScore: input.essayMaxScore,
    annulledScoringMode: input.annulledScoringMode,
    questions: input.questions.map((question) => ({
      questionNumber: question.questionNumber,
      correctAnswer: question.correctAnswer,
      score: question.score,
      weight: question.weight,
      maxScore: question.maxScore ?? null,
      status: question.status,
    })),
  })
}

function buildLocationPath(location: Location) {
  return `${location.pathname}${location.search}${location.hash}`
}

export function AnswerKeysPage() {
  const { unitId, classroomId, examId } = useParams()
  const navigate = useNavigate()
  const { selectedUnit, selectedClassroom, selectedExam } = useAcademicScope()
  const [templates, setTemplates] = useState<Template[]>([])
  const [answerKeys, setAnswerKeys] = useState<AnswerKey[]>([])
  const [questions, setQuestions] = useState<AnswerKeyQuestion[]>([])
  const [defaultScore, setDefaultScore] = useState(1)
  const [defaultWeight, setDefaultWeight] = useState(1)
  const [distributionTotal, setDistributionTotal] = useState(10)
  const [essayMaxScore, setEssayMaxScore] = useState(0)
  const [annulledScoringMode, setAnnulledScoringMode] = useState<AnnulledScoringMode>('redistribute-group')
  const [selectedGroupKey, setSelectedGroupKey] = useState('all')
  const [showOnlyMissingAnswers, setShowOnlyMissingAnswers] = useState(false)
  const [rangeForm, setRangeForm] = useState<RangeFormState>({ start: 1, end: 1, score: 1, weight: 1 })
  const [groupScoreValue, setGroupScoreValue] = useState(1)
  const [groupWeightValue, setGroupWeightValue] = useState(1)
  const [activeSideTab, setActiveSideTab] = useState<SidePanelTab>('score')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [activePopoverQuestionNumber, setActivePopoverQuestionNumber] = useState<number | null>(null)
  const [popoverPosition, setPopoverPosition] = useState<PopoverPosition | null>(null)
  const [showIncompleteSaveDialog, setShowIncompleteSaveDialog] = useState(false)
  const [showLeaveDialog, setShowLeaveDialog] = useState(false)
  const [showConstructionToast, setShowConstructionToast] = useState(false)
  const [pendingSaveIntent, setPendingSaveIntent] = useState<SaveIntent>('stay')
  const popoverRef = useRef<HTMLDivElement | null>(null)
  const questionCardRefs = useRef(new Map<number, HTMLElement | null>())
  const questionAnnulledStateRef = useRef(
    new Map<number, Pick<AnswerKeyQuestion, 'correctAnswer' | 'status'>>(),
  )
  const persistedSnapshotRef = useRef('')
  const appliedDefaultScoreRef = useRef(1)
  const appliedDistributionTotalRef = useRef(10)
  const appliedRangeScoreRef = useRef<ScoreRangeState>({ start: 1, end: 1, score: 1 })
  const appliedGroupScoreRef = useRef<{ groupKey: string; score: number }>({ groupKey: 'all', score: 1 })
  const appliedDefaultWeightRef = useRef(1)
  const appliedRangeWeightRef = useRef<Pick<RangeFormState, 'start' | 'end' | 'weight'>>({
    start: 1,
    end: 1,
    weight: 1,
  })
  const appliedGroupWeightRef = useRef<{ groupKey: string; weight: number }>({ groupKey: 'all', weight: 1 })
  const pendingLocationRef = useRef<Location | null>(null)
  const shouldBypassBlockerRef = useRef(false)
  const constructionToastTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    if (examId) {
      setSelectedExamId(examId)
    }
  }, [examId])

  useEffect(() => {
    const essayQuestion = questions.find((question) => question.questionType === 'essay')
    const nextEssayMaxScore = essayQuestion?.maxScore ?? 0
    setEssayMaxScore((current) => (current === nextEssayMaxScore ? current : nextEssayMaxScore))
  }, [questions])

  useEffect(() => {
    return () => {
      if (constructionToastTimeoutRef.current) {
        window.clearTimeout(constructionToastTimeoutRef.current)
      }
    }
  }, [])

  const loadData = useCallback(async () => {
    if (!examId) {
      setTemplates([])
      setAnswerKeys([])
      setQuestions([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setLoadError(null)
    try {
      const [templatesResponse, answerKeysResponse] = await Promise.all([
        omrService.getTemplates({ examId }),
        omrService.getAnswerKeys({ examId }),
      ])

      setTemplates(templatesResponse.items)
      setAnswerKeys(answerKeysResponse.items)

      if (!templatesResponse.items.length && templatesResponse.warnings.length) {
        setLoadError(`Nenhum template compatível foi encontrado para o gabarito desta prova. ${templatesResponse.warnings[0].message}`)
      }
    } catch (loadError) {
      setTemplates([])
      setAnswerKeys([])
      setQuestions([])
      setLoadError(formatApiErrorMessage('Nao foi possivel carregar o gabarito desta prova.', loadError))
    } finally {
      setIsLoading(false)
    }
  }, [examId])

  useEffect(() => {
    void loadData()
  }, [loadData])

  useEffect(() => {
    if (activePopoverQuestionNumber === null) return

    const handlePointerDown = (event: MouseEvent) => {
      if (popoverRef.current?.contains(event.target as Node)) return
      setActivePopoverQuestionNumber(null)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActivePopoverQuestionNumber(null)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [activePopoverQuestionNumber])

  useEffect(() => {
    if (activePopoverQuestionNumber === null) {
      setPopoverPosition(null)
      return
    }

    const updatePopoverPosition = () => {
      const anchor = questionCardRefs.current.get(activePopoverQuestionNumber)
      if (!anchor) return

      const anchorRect = anchor.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const horizontalPadding = 12
      const viewportMargin = 12
      const gap = 8
      const width = Math.min(320, Math.max(240, viewportWidth - horizontalPadding * 2))
      const popoverHeight = popoverRef.current?.offsetHeight ?? 260
      const spaceBelow = viewportHeight - anchorRect.bottom - gap - viewportMargin
      const spaceAbove = anchorRect.top - gap - viewportMargin
      const placement: PopoverPlacement =
        spaceBelow >= popoverHeight || spaceBelow >= spaceAbove ? 'bottom' : 'top'

      const unclampedTop = placement === 'bottom' ? anchorRect.bottom + gap : anchorRect.top - popoverHeight - gap
      const top = Math.max(viewportMargin, Math.min(unclampedTop, viewportHeight - popoverHeight - viewportMargin))
      const unclampedLeft = anchorRect.left
      const left = Math.max(horizontalPadding, Math.min(unclampedLeft, viewportWidth - width - horizontalPadding))

      setPopoverPosition({ top, left, width, placement })
    }

    const frameId = window.requestAnimationFrame(updatePopoverPosition)
    window.addEventListener('resize', updatePopoverPosition)
    window.addEventListener('scroll', updatePopoverPosition, true)

    return () => {
      window.cancelAnimationFrame(frameId)
      window.removeEventListener('resize', updatePopoverPosition)
      window.removeEventListener('scroll', updatePopoverPosition, true)
    }
  }, [activePopoverQuestionNumber, questions, essayMaxScore])

  const activeTemplate = useMemo(() => {
    if (!templates.length) return null
    return [...templates].sort((left, right) => getTemplateTimestamp(right) - getTemplateTimestamp(left))[0]
  }, [templates])

  const existingAnswerKey = useMemo(
    () => getExistingAnswerKey(answerKeys, activeTemplate?.id ?? null),
    [activeTemplate?.id, answerKeys],
  )

  useEffect(() => {
    if (!activeTemplate) {
      setQuestions([])
      persistedSnapshotRef.current = ''
      return
    }

    const model = buildAnswerKeyQuestionModel(activeTemplate, existingAnswerKey)
    setQuestions(model)
      const nextDefaultScore = existingAnswerKey?.defaultScore ?? 1
      const nextDefaultWeight = existingAnswerKey?.defaultWeight ?? 1
      const nextEssayMaxScore = existingAnswerKey?.essayMaxScore ?? model.find((question) => question.questionType === 'essay')?.maxScore ?? 0
      const nextAnnulledScoringMode = existingAnswerKey?.annulledScoringMode ?? 'redistribute-group'
      setDefaultScore(nextDefaultScore)
      setDefaultWeight(nextDefaultWeight)
      setDistributionTotal(existingAnswerKey?.totalScore ?? (calculateAnswerKeyScore(model) || 10))
      setEssayMaxScore(nextEssayMaxScore)
      setAnnulledScoringMode(nextAnnulledScoringMode)
      setRangeForm({
        start: 1,
        end: Math.max(1, Math.min(activeTemplate.totalQuestions, model.length || 1)),
        score: nextDefaultScore,
        weight: nextDefaultWeight,
      })
      setGroupScoreValue(nextDefaultScore)
      setGroupWeightValue(nextDefaultWeight)
      appliedDefaultScoreRef.current = nextDefaultScore
      appliedDistributionTotalRef.current = existingAnswerKey?.totalScore ?? (calculateAnswerKeyScore(model) || 10)
      appliedRangeScoreRef.current = {
        start: 1,
        end: Math.max(1, Math.min(activeTemplate.totalQuestions, model.length || 1)),
        score: nextDefaultScore,
      }
      appliedGroupScoreRef.current = { groupKey: 'all', score: nextDefaultScore }
      appliedDefaultWeightRef.current = nextDefaultWeight
      appliedRangeWeightRef.current = {
        start: 1,
        end: Math.max(1, Math.min(activeTemplate.totalQuestions, model.length || 1)),
        weight: nextDefaultWeight,
      }
      appliedGroupWeightRef.current = { groupKey: 'all', weight: nextDefaultWeight }
      persistedSnapshotRef.current = getAnswerKeySnapshot({
        questions: model,
        defaultScore: nextDefaultScore,
        defaultWeight: nextDefaultWeight,
        essayMaxScore: nextEssayMaxScore,
        annulledScoringMode: nextAnnulledScoringMode,
        templateId: activeTemplate.id,
      })
  }, [activeTemplate, existingAnswerKey])

  const groupOptions = useMemo(() => {
    const uniqueGroups = new Map<string, string>()
    questions.forEach((question) => {
      if (!question.groupKey || !question.groupLabel) return
      uniqueGroups.set(question.groupKey, question.groupLabel)
    })

    return [...uniqueGroups.entries()].map(([value, label]) => ({ value, label }))
  }, [questions])

  const filteredQuestions = useMemo(() => {
    return questions.filter((question) => {
      if (selectedGroupKey !== 'all' && question.groupKey !== selectedGroupKey) return false
      if (showOnlyMissingAnswers && !isQuestionMissingAnswer(question)) return false
      return true
    })
  }, [questions, selectedGroupKey, showOnlyMissingAnswers])
  const activePopoverQuestion = useMemo(
    () => questions.find((question) => question.questionNumber === activePopoverQuestionNumber) ?? null,
    [activePopoverQuestionNumber, questions],
  )

  const missingAnswers = useMemo(() => questions.filter(isQuestionMissingAnswer), [questions])
  const totalFinalScore = useMemo(() => calculateAnswerKeyScore(questions), [questions])
  const scoreBearingCount = useMemo(() => questions.filter(isScoreBearingQuestion).length, [questions])
  const answeredCount = useMemo(() => questions.filter((question) => !isQuestionMissingAnswer(question)).length, [questions])
  const annulledCount = useMemo(() => questions.filter((question) => question.status === 'annulled').length, [questions])
  const maxVisibleObjectiveOptions = useMemo(
    () =>
      filteredQuestions.reduce((max, question) => {
        if (question.questionType !== 'objective') return max
        return Math.max(max, question.validOptions.length)
      }, 0),
    [filteredQuestions],
  )
  const answerKeyGridStyle = useMemo(
    () =>
      ({
        '--answer-key-grid-min': getAnswerKeyGridMinWidth(maxVisibleObjectiveOptions),
      }) as CSSProperties,
    [maxVisibleObjectiveOptions],
  )
  const officialName = selectedExam?.name ? `Gabarito oficial - ${selectedExam.name}` : 'Gabarito oficial'
  const hasBlockingLoadError = Boolean(loadError)
  const loadFailedWithoutData = Boolean(loadError && !templates.length && !answerKeys.length)
  const canSave = !isLoading && !isSubmitting && !hasBlockingLoadError && !!examId && !!activeTemplate && questions.length > 0
  const currentSnapshot = useMemo(
    () =>
        getAnswerKeySnapshot({
          questions,
          defaultScore,
          defaultWeight,
          essayMaxScore,
          annulledScoringMode,
          templateId: activeTemplate?.id ?? null,
        }),
    [activeTemplate?.id, annulledScoringMode, defaultScore, defaultWeight, essayMaxScore, questions],
  )
  const hasUnsavedChanges = Boolean(activeTemplate) && currentSnapshot !== persistedSnapshotRef.current
  const hasPendingDefaultScoreChange = questions.length > 0 && defaultScore !== appliedDefaultScoreRef.current
  const hasPendingDistributionTotalChange =
    scoreBearingCount > 0 && distributionTotal !== appliedDistributionTotalRef.current
  const hasPendingRangeScoreChange =
    questions.length > 0 &&
    (rangeForm.start !== appliedRangeScoreRef.current.start ||
      rangeForm.end !== appliedRangeScoreRef.current.end ||
      rangeForm.score !== appliedRangeScoreRef.current.score)
  const hasPendingGroupScoreChange =
    groupOptions.length > 1 &&
    selectedGroupKey !== 'all' &&
    (selectedGroupKey !== appliedGroupScoreRef.current.groupKey ||
      groupScoreValue !== appliedGroupScoreRef.current.score)
  const hasPendingDefaultWeightChange = questions.length > 0 && defaultWeight !== appliedDefaultWeightRef.current
  const hasPendingRangeWeightChange =
    questions.length > 0 &&
    (rangeForm.start !== appliedRangeWeightRef.current.start ||
      rangeForm.end !== appliedRangeWeightRef.current.end ||
      rangeForm.weight !== appliedRangeWeightRef.current.weight)
  const hasPendingGroupWeightChange =
    groupOptions.length > 1 &&
    selectedGroupKey !== 'all' &&
    (selectedGroupKey !== appliedGroupWeightRef.current.groupKey ||
      groupWeightValue !== appliedGroupWeightRef.current.weight)

  const navigationBlocker = useBlocker(({ currentLocation, nextLocation }) => {
    const isSameLocation =
      currentLocation.pathname === nextLocation.pathname &&
      currentLocation.search === nextLocation.search &&
      currentLocation.hash === nextLocation.hash

    if (shouldBypassBlockerRef.current || !hasUnsavedChanges || isSameLocation) {
      return false
    }

    pendingLocationRef.current = nextLocation
    return true
  })

  useEffect(() => {
    if (navigationBlocker.state === 'blocked') {
      pendingLocationRef.current = navigationBlocker.location
      setShowLeaveDialog(true)
    }
  }, [navigationBlocker.location, navigationBlocker.state])

  useEffect(() => {
    if (!hasUnsavedChanges) return

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  const handleScoreSectionEnter = (
    event: ReactKeyboardEvent<HTMLInputElement | HTMLSelectElement>,
    enabled: boolean,
    action: () => void,
  ) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    if (!enabled) return
    action()
  }

  const handleObjectiveAnswerSelect = (questionNumber: number, option: string) => {
    setQuestions((current) =>
      current.map((question) => {
        if (question.questionNumber !== questionNumber) return question
        return {
          ...question,
          correctAnswer: question.correctAnswer === option ? null : option,
          status: 'active',
        }
      }),
    )
  }

  const setQuestionCardRef = useCallback((questionNumber: number, node: HTMLElement | null) => {
    questionCardRefs.current.set(questionNumber, node)
  }, [])

  const handleQuestionPopoverOpen = (questionNumber: number) => {
    setActivePopoverQuestionNumber(questionNumber)
  }

  const handleQuestionScoreChange = (questionNumber: number, value: number) => {
    const safeValue = Math.max(0, value)
    setQuestions((current) => setQuestionScore(current, questionNumber, safeValue))
  }

  const handleQuestionWeightChange = (questionNumber: number, value: number) => {
    const safeValue = Math.max(0, value)
    setQuestions((current) => replaceQuestion(current, questionNumber, { weight: safeValue || 0 }))
  }

  const handleQuestionStatusToggle = (questionNumber: number, checked: boolean) => {
    setQuestions((current) =>
      current.map((question) => {
        if (question.questionNumber !== questionNumber) return question

        if (checked) {
          questionAnnulledStateRef.current.set(questionNumber, {
            correctAnswer: question.correctAnswer,
            status: question.status,
          })
          return {
            ...question,
            status: 'annulled',
          }
        }

        const previousState = questionAnnulledStateRef.current.get(questionNumber)
        return {
          ...question,
          correctAnswer: previousState?.correctAnswer ?? question.correctAnswer,
          status:
            previousState?.status ??
            (question.questionType === 'objective' ? 'active' : 'manual'),
        }
      }),
    )
  }

  const handleMathAnswerChange = (questionNumber: number, rawValue: string) => {
    setQuestions((current) =>
      current.map((question) =>
        question.questionNumber === questionNumber
          ? { ...question, correctAnswer: sanitizeMathAnswer(question, rawValue) }
          : question,
      ),
    )
  }

  const applyDefaultScore = () => {
    const safeScore = Math.max(0, defaultScore)
    setQuestions((current) => applyScoreToQuestions(current, isScoreBearingQuestion, safeScore))
    appliedDefaultScoreRef.current = defaultScore
  }

  const applyDefaultWeight = () => {
    const safeWeight = Math.max(0, defaultWeight)
    setQuestions((current) => applyWeightToQuestions(current, isScoreBearingQuestion, safeWeight))
    appliedDefaultWeightRef.current = defaultWeight
  }

  const applyRangeScore = () => {
    const start = Math.min(rangeForm.start, rangeForm.end)
    const end = Math.max(rangeForm.start, rangeForm.end)
    const safeScore = Math.max(0, rangeForm.score)
    setQuestions((current) => applyScoreToQuestions(current, (question) => question.questionNumber >= start && question.questionNumber <= end, safeScore))
    appliedRangeScoreRef.current = {
      start: rangeForm.start,
      end: rangeForm.end,
      score: rangeForm.score,
    }
  }

  const applyRangeWeight = () => {
    const start = Math.min(rangeForm.start, rangeForm.end)
    const end = Math.max(rangeForm.start, rangeForm.end)
    const safeWeight = Math.max(0, rangeForm.weight)
    setQuestions((current) => applyWeightToQuestions(current, (question) => question.questionNumber >= start && question.questionNumber <= end, safeWeight))
    appliedRangeWeightRef.current = {
      start: rangeForm.start,
      end: rangeForm.end,
      weight: rangeForm.weight,
    }
  }

  const applyGroupScore = () => {
    if (selectedGroupKey === 'all') return
    const safeScore = Math.max(0, groupScoreValue)
    setQuestions((current) => applyScoreToQuestions(current, (question) => question.groupKey === selectedGroupKey, safeScore))
    appliedGroupScoreRef.current = {
      groupKey: selectedGroupKey,
      score: groupScoreValue,
    }
  }

  const applyDistributionTotal = () => {
    const safeTotal = Math.max(0, distributionTotal)
    setQuestions((current) => distributeScoreAcrossQuestions(current, safeTotal))
    appliedDistributionTotalRef.current = distributionTotal
  }

  const applyGroupWeight = () => {
    if (selectedGroupKey === 'all') return
    const safeWeight = Math.max(0, groupWeightValue)
    setQuestions((current) => applyWeightToQuestions(current, (question) => question.groupKey === selectedGroupKey, safeWeight))
    appliedGroupWeightRef.current = {
      groupKey: selectedGroupKey,
      weight: groupWeightValue,
    }
  }

  const applyEssayScore = (value: number) => {
    const safeValue = Math.max(0, value)
    setEssayMaxScore(safeValue)
    setQuestions((current) =>
      current.map((question) =>
        question.questionType === 'essay' ? { ...question, maxScore: safeValue } : question,
      ),
    )
  }

  const allowNextNavigation = () => {
    shouldBypassBlockerRef.current = true
    window.setTimeout(() => {
      shouldBypassBlockerRef.current = false
    }, 0)
  }

  const closeLeaveDialog = () => {
    setShowLeaveDialog(false)
    pendingLocationRef.current = null
    navigationBlocker.reset?.()
  }

  const navigateToPendingLocation = () => {
    const nextLocation = pendingLocationRef.current
    setShowLeaveDialog(false)
    navigationBlocker.reset?.()

    if (!nextLocation) return

    allowNextNavigation()
    navigate(buildLocationPath(nextLocation))
    pendingLocationRef.current = null
  }

  const executeSave = async (saveIntent: SaveIntent) => {
    if (!examId) {
      setSubmitError('Nao foi possivel identificar a prova atual para salvar o gabarito.')
      return false
    }

    if (!activeTemplate) {
      setSubmitError('Esta prova ainda nao possui template vinculado.')
      return false
    }

    if (hasBlockingLoadError) {
      setSubmitError('Resolva o erro de carregamento do template antes de salvar o gabarito.')
      return false
    }

    if (!questions.length) {
      setSubmitError('O template atual nao possui itens suficientes para montar o gabarito.')
      return false
    }

    setIsSubmitting(true)
    setSubmitError(null)
    setMessage(null)

      try {
        const normalizedQuestions = questions.map((question) => {
          const score = Math.max(0, normalizeNumber(getQuestionBaseScore(question), defaultScore))
          const weight = Math.max(0, normalizeNumber(question.weight, defaultWeight))
          if (question.questionType === 'open' || question.questionType === 'essay') {
            return {
              ...question,
              score,
              weight,
              maxScore: score,
            }
          }

        if (question.questionType === 'math') {
          return {
            ...question,
            score,
            weight,
            correctAnswer: question.correctAnswer ? sanitizeMathAnswer(question, question.correctAnswer) : null,
          }
        }

        return {
          ...question,
          score,
          weight,
        }
      })

      const payload = {
        name: officialName,
        examId,
        templateId: activeTemplate.id,
        answers: buildLegacyAnswers(normalizedQuestions, activeTemplate.totalQuestions),
        questions: normalizedQuestions,
        defaultScore,
        defaultWeight,
        essayMaxScore,
        totalScore: calculateAnswerKeyScore(normalizedQuestions),
        annulledScoringMode,
      }

      const response = existingAnswerKey
        ? await omrService.updateAnswerKey(existingAnswerKey.id, payload)
        : await omrService.createAnswerKey(payload)

        setAnswerKeys((current) => {
          const withoutCurrent = current.filter((item) => item.id !== response.item.id)
          return [response.item, ...withoutCurrent]
        })
        setQuestions(buildAnswerKeyQuestionModel(activeTemplate, response.item))
        setDistributionTotal(response.item.totalScore ?? calculateAnswerKeyScore(normalizedQuestions))
        setAnnulledScoringMode(response.item.annulledScoringMode ?? annulledScoringMode)
        persistedSnapshotRef.current = getAnswerKeySnapshot({
          questions: response.item.questions ?? normalizedQuestions,
          defaultScore,
          defaultWeight,
          essayMaxScore,
          annulledScoringMode: response.item.annulledScoringMode ?? annulledScoringMode,
          templateId: activeTemplate.id,
        })
      setMessage(existingAnswerKey ? 'Gabarito atualizado com sucesso.' : 'Gabarito salvo com sucesso.')
      if (saveIntent === 'leave') {
        navigateToPendingLocation()
      }
      return true
    } catch (submitError) {
      setSubmitError(formatApiErrorMessage('Nao foi possivel salvar o gabarito.', submitError))
      return false
    } finally {
      setIsSubmitting(false)
    }
  }

  const requestSave = async (saveIntent: SaveIntent = 'stay') => {
    if (missingAnswers.length > 0) {
      setPendingSaveIntent(saveIntent)
      if (saveIntent === 'leave') {
        setShowLeaveDialog(false)
      }
      setShowIncompleteSaveDialog(true)
      return false
    }

    return executeSave(saveIntent)
  }

  const handleSubmit = async () => {
    await requestSave('stay')
  }

  const handleBackToExamClick = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    if (!hasUnsavedChanges) return
    event.preventDefault()
    pendingLocationRef.current = {
      pathname: `/app/units/${unitId}/classrooms/${classroomId}/exams/${examId}`,
      search: '',
      hash: '',
      state: null,
      key: 'answer-key-back',
    }
    setShowLeaveDialog(true)
  }

  const handleDiscardAndExit = () => {
    navigateToPendingLocation()
  }

  const handleSaveAndExit = async () => {
    await requestSave('leave')
  }

  const handleContentsTabClick = () => {
    setShowConstructionToast(true)
    if (constructionToastTimeoutRef.current) {
      window.clearTimeout(constructionToastTimeoutRef.current)
    }
    constructionToastTimeoutRef.current = window.setTimeout(() => {
      setShowConstructionToast(false)
      constructionToastTimeoutRef.current = null
    }, 2600)
  }

  return (
    <section>
      <Breadcrumbs
        items={[
          { label: 'Unidades', to: '/app/units' },
          { label: selectedUnit?.name ?? 'Turmas', to: `/app/units/${unitId}` },
          { label: selectedClassroom?.name ?? 'Turma', to: `/app/units/${unitId}/classrooms/${classroomId}` },
          { label: 'Provas', to: `/app/units/${unitId}/classrooms/${classroomId}/exams` },
          { label: selectedExam?.name ?? 'Prova', to: `/app/units/${unitId}/classrooms/${classroomId}/exams/${examId}` },
          { label: 'Gabarito' },
        ]}
      />

      <SectionTitle title="Gabarito" subtitle="Edite o gabarito oficial da prova atual com pontuação, peso e itens especiais." />

      <div className="answer-key-topbar">
        <div className="answer-key-topbar__primary">
          <Link to={`/app/units/${unitId}/classrooms/${classroomId}/exams/${examId}`} onClick={handleBackToExamClick}>
            <Button variant="secondary">Voltar para a prova</Button>
          </Link>
        </div>
        <div className="answer-key-topbar__secondary">
          <div className="answer-key-topbar__stats" aria-label="Resumo do gabarito">
            <div className="answer-key-topbar__stat">
              <strong>{Number(totalFinalScore.toFixed(2)).toLocaleString('pt-BR')}</strong>
              <span>ponto(s)</span>
            </div>
            <div className="answer-key-topbar__stat">
              <strong>{questions.length}</strong>
              <span>item(ns)</span>
            </div>
          </div>
            <Button
              type="button"
              className="answer-key-topbar__save-button"
              onClick={handleSubmit}
              disabled={!canSave || !hasUnsavedChanges}
            >
              {isSubmitting ? 'Salvando...' : existingAnswerKey ? 'Atualizar gabarito' : 'Salvar gabarito'}
            </Button>
        </div>
      </div>
      {message ? <p className="feedback feedback--success">{message}</p> : null}
      {submitError ? <p className="feedback feedback--error">{submitError}</p> : null}

      <div className="answer-key-layout">
        <div className="answer-key-layout__main">
          {isLoading ? <Card><p>Carregando gabarito...</p></Card> : null}
          {!isLoading && loadFailedWithoutData ? <ApiErrorState message={loadError ?? 'Nao foi possivel carregar o gabarito.'} onRetry={loadData} /> : null}
          {!isLoading && !loadFailedWithoutData && !activeTemplate ? (
            <Card>
              <div className="card-editor-empty-state">
                <strong>Esta prova ainda nao possui template vinculado.</strong>
                <p>Crie ou ajuste o layout da prova antes de montar o gabarito oficial.</p>
              </div>
            </Card>
          ) : null}

          {!isLoading && activeTemplate && !questions.length ? (
            <Card>
              <div className="card-editor-empty-state">
                <strong>O template atual nao gerou itens de gabarito.</strong>
                <p>Revise a estrutura do template da prova para incluir questoes objetivas, matematicas ou manuais.</p>
              </div>
            </Card>
          ) : null}

          {!isLoading && hasBlockingLoadError && activeTemplate ? <ApiErrorState message={loadError ?? 'Nao foi possivel carregar o gabarito.'} onRetry={loadData} /> : null}

          {!isLoading && !hasBlockingLoadError && activeTemplate && questions.length ? (
            <Card>
              <div className="answer-key-card-header">
                <div>
                  <h3>Itens da prova</h3>
                  <p>As respostas, pontuações e pesos abaixo refletem diretamente a estrutura real do template vinculado.</p>
                </div>
                <span>{filteredQuestions.length} visivel(is)</span>
              </div>

              <div className="stack-form answer-key-toolbar">
                <label className="field answer-key-toolbar__field">
                  <span>Filtro por grupo/tipo</span>
                  <select className="answer-key-toolbar__select" value={selectedGroupKey} onChange={(event) => setSelectedGroupKey(event.target.value)}>
                    <option value="all">Todos os itens</option>
                    {groupOptions.map((group) => (
                      <option key={group.value} value={group.value}>
                        {group.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="answer-key-toggle answer-key-toggle--panel answer-key-toolbar__toggle">
                  <input
                    type="checkbox"
                    checked={showOnlyMissingAnswers}
                    onChange={(event) => setShowOnlyMissingAnswers(event.target.checked)}
                  />
                  <span>Mostrar apenas itens sem resposta</span>
                </label>
              </div>

              <div className="answer-key-grid" style={answerKeyGridStyle}>
                {filteredQuestions.map((question) => {
                  const isAnnulled = question.status === 'annulled'
                  const isCompactObjective = isCompactObjectiveQuestion(question)
                  const isMath = question.questionType === 'math'
                  const isOpen = question.questionType === 'open'
                  const isEssay = question.questionType === 'essay'
                  return (
                    <article
                      ref={(node) => setQuestionCardRef(question.questionNumber, node)}
                      key={question.questionNumber}
                      className={`answer-key-question ${isAnnulled ? 'answer-key-question--annulled' : ''} ${
                        isCompactObjective ? 'answer-key-question--compact' : 'answer-key-question--special'
                      } ${isMath ? 'answer-key-question--special-math' : ''} ${isOpen ? 'answer-key-question--special-open' : ''} ${
                        isEssay ? 'answer-key-question--special-essay' : ''
                      }`}
                    >
                      {isCompactObjective ? (
                        <>
                          <div
                            className="answer-key-question__compact-top"
                            onClick={() => handleQuestionPopoverOpen(question.questionNumber)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault()
                                handleQuestionPopoverOpen(question.questionNumber)
                              }
                            }}
                          >
                            <div className="answer-key-question__compact-title">
                              <strong>{question.questionNumber}</strong>
                              <span>{getQuestionTypeLabel(question)}</span>
                            </div>
                            <button
                              type="button"
                              className="answer-key-question__compact-action"
                              aria-label={`Edicao avancada da questao ${question.questionNumber} em breve`}
                              title="Edição avançada em breve"
                              onClick={(event) => {
                                event.stopPropagation()
                                handleQuestionPopoverOpen(question.questionNumber)
                              }}
                            >
                              +
                            </button>
                          </div>

                          <div className="answer-key-question__options answer-key-question__options--compact" aria-label={`Alternativas da questao ${question.questionNumber}`}>
                            {question.validOptions.map((option) => (
                              <button
                                key={option}
                                type="button"
                                className={
                                  isAnnulled || question.correctAnswer === option
                                    ? 'answer-key-bubble answer-key-bubble--selected'
                                    : 'answer-key-bubble'
                                }
                                disabled={isAnnulled}
                                onClick={(event) => {
                                  event.stopPropagation()
                                  handleObjectiveAnswerSelect(question.questionNumber, option)
                                }}
                              >
                                {option}
                              </button>
                            ))}
                          </div>

                        </>
                      ) : (
                        <>
                          <div
                            className="answer-key-question__compact-top answer-key-question__compact-top--special"
                            onClick={() => handleQuestionPopoverOpen(question.questionNumber)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault()
                                handleQuestionPopoverOpen(question.questionNumber)
                              }
                            }}
                          >
                            <div className="answer-key-question__compact-title">
                              <strong>{question.questionNumber}</strong>
                              <span>{getQuestionTypeLabel(question)}</span>
                            </div>
                            <button
                              type="button"
                              className="answer-key-question__compact-action"
                              aria-label={`Editar questão ${question.questionNumber}`}
                              onClick={(event) => {
                                event.stopPropagation()
                                handleQuestionPopoverOpen(question.questionNumber)
                              }}
                            >
                              +
                            </button>
                          </div>

                          {isMath ? (
                            <div className="answer-key-question__mini-field" onClick={(event) => event.stopPropagation()}>
                              <input
                                className="answer-key-question__mini-input"
                                value={question.correctAnswer ?? ''}
                                maxLength={question.responseColumns}
                                placeholder={question.responseColumns ? `${question.responseColumns} dígitos` : 'Resposta'}
                                onChange={(event) => handleMathAnswerChange(question.questionNumber, event.target.value)}
                              />
                            </div>
                          ) : null}

                          {isOpen ? (
                            <p className="answer-key-question__special-hint">Configurar no +</p>
                          ) : null}

                          {isEssay ? (
                            <p className="answer-key-question__special-hint">Configurar no +</p>
                          ) : null}

                        </>
                      )}
                      {isAnnulled ? <span className="answer-key-question__annulled-badge">Anulada</span> : null}
                    </article>
                  )
                })}
              </div>
            </Card>
          ) : null}
        </div>

        <aside className="answer-key-layout__aside">
          <Card>
            <div className="answer-key-panel-tabs" role="tablist" aria-label="Seções do painel lateral do gabarito">
              <button
                type="button"
                className={
                  activeSideTab === 'score'
                    ? 'answer-key-panel-tab answer-key-panel-tab--score answer-key-panel-tab--active'
                    : 'answer-key-panel-tab answer-key-panel-tab--score'
                }
                onClick={() => setActiveSideTab('score')}
                role="tab"
                aria-selected={activeSideTab === 'score'}
              >
                Pontuação
              </button>
              <button
                type="button"
                className={
                  activeSideTab === 'weight'
                    ? 'answer-key-panel-tab answer-key-panel-tab--weight answer-key-panel-tab--active'
                    : 'answer-key-panel-tab answer-key-panel-tab--weight'
                }
                onClick={() => setActiveSideTab('weight')}
                role="tab"
                aria-selected={activeSideTab === 'weight'}
              >
                Peso
              </button>
              <button
                type="button"
                className={
                  activeSideTab === 'summary'
                    ? 'answer-key-panel-tab answer-key-panel-tab--summary answer-key-panel-tab--active'
                    : 'answer-key-panel-tab answer-key-panel-tab--summary'
                }
                onClick={handleContentsTabClick}
                role="tab"
                aria-selected={false}
              >
                Conteúdos
              </button>
            </div>

            {activeSideTab === 'score' ? (
              <div className="stack-form answer-key-panel-content">
                <div className="answer-key-control-block">
                  <label className="field">
                    <span>Pontuação padrão por questão</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={defaultScore}
                      onChange={(event) => setDefaultScore(Number(event.target.value))}
                      onKeyDown={(event) => handleScoreSectionEnter(event, hasPendingDefaultScoreChange, applyDefaultScore)}
                    />
                  </label>
                  <Button type="button" variant="secondary" onClick={applyDefaultScore} disabled={!hasPendingDefaultScoreChange}>
                    Aplicar pontuação padrão
                  </Button>
                </div>

                <div className="answer-key-control-block">
                  <label className="field">
                    <span>Pontuação geral da prova</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={distributionTotal}
                      onChange={(event) => setDistributionTotal(Number(event.target.value))}
                      onKeyDown={(event) => handleScoreSectionEnter(event, hasPendingDistributionTotalChange, applyDistributionTotal)}
                    />
                  </label>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={applyDistributionTotal}
                    disabled={!hasPendingDistributionTotalChange}
                  >
                    Distribuir igualmente entre itens pontuáveis
                  </Button>
                </div>

                <div className="answer-key-side-group answer-key-control-block">
                  <strong>Pontuação por intervalo</strong>
                  <div className="answer-key-side-grid answer-key-side-grid--score-range">
                    <label className="field">
                      <span>De</span>
                      <input
                        type="number"
                        min="1"
                        value={rangeForm.start}
                        onChange={(event) => setRangeForm((current) => ({ ...current, start: Number(event.target.value) }))}
                        onKeyDown={(event) => handleScoreSectionEnter(event, hasPendingRangeScoreChange, applyRangeScore)}
                      />
                    </label>
                    <label className="field">
                      <span>Até</span>
                      <input
                        type="number"
                        min="1"
                        value={rangeForm.end}
                        onChange={(event) => setRangeForm((current) => ({ ...current, end: Number(event.target.value) }))}
                        onKeyDown={(event) => handleScoreSectionEnter(event, hasPendingRangeScoreChange, applyRangeScore)}
                      />
                    </label>
                    <label className="field">
                      <span>Pontuação</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={rangeForm.score}
                        onChange={(event) => setRangeForm((current) => ({ ...current, score: Number(event.target.value) }))}
                        onKeyDown={(event) => handleScoreSectionEnter(event, hasPendingRangeScoreChange, applyRangeScore)}
                      />
                    </label>
                    <Button type="button" variant="secondary" onClick={applyRangeScore} disabled={!hasPendingRangeScoreChange}>
                      Aplicar pontuação ao intervalo
                    </Button>
                  </div>
                </div>

                {groupOptions.length > 1 ? (
                  <div className="answer-key-side-group answer-key-control-block">
                    <strong>Pontuação por grupo/tipo</strong>
                    <label className="field">
                      <span>Grupo</span>
                      <select value={selectedGroupKey} onChange={(event) => setSelectedGroupKey(event.target.value)}>
                        <option value="all">Selecione um grupo</option>
                        {groupOptions.map((group) => (
                          <option key={group.value} value={group.value}>
                            {group.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>Pontuação</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={groupScoreValue}
                        onChange={(event) => setGroupScoreValue(Number(event.target.value))}
                        onKeyDown={(event) => handleScoreSectionEnter(event, hasPendingGroupScoreChange, applyGroupScore)}
                      />
                    </label>
                    <Button type="button" variant="secondary" onClick={applyGroupScore} disabled={!hasPendingGroupScoreChange}>
                      Aplicar pontuação ao grupo
                    </Button>
                  </div>
                ) : null}

                <div className="answer-key-side-group answer-key-control-block">
                  <strong>Questões anuladas</strong>
                  <label className="field">
                    <span>Regra</span>
                    <select
                      value={annulledScoringMode}
                      onChange={(event) => setAnnulledScoringMode(event.target.value as AnnulledScoringMode)}
                    >
                      {ANNULLED_SCORING_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            ) : null}

            {activeSideTab === 'weight' ? (
              <div className="stack-form answer-key-panel-content">
                <div className="answer-key-control-block">
                <label className="field">
                  <span>Peso padrão</span>
                  <input type="number" min="0" step="0.01" value={defaultWeight} onChange={(event) => setDefaultWeight(Number(event.target.value))} onKeyDown={(event) => handleScoreSectionEnter(event, hasPendingDefaultWeightChange, applyDefaultWeight)} />
                </label>
                <Button type="button" variant="secondary" onClick={applyDefaultWeight} disabled={!hasPendingDefaultWeightChange}>
                  Aplicar peso padrão
                </Button>
                </div>

                <div className="answer-key-side-group answer-key-control-block">
                  <strong>Peso por intervalo</strong>
                  <div className="answer-key-side-grid answer-key-side-grid--score-range">
                    <label className="field">
                      <span>De</span>
                      <input
                        type="number"
                        min="1"
                        value={rangeForm.start}
                        onChange={(event) => setRangeForm((current) => ({ ...current, start: Number(event.target.value) }))}
                        onKeyDown={(event) => handleScoreSectionEnter(event, hasPendingRangeWeightChange, applyRangeWeight)}
                      />
                    </label>
                    <label className="field">
                      <span>Até</span>
                      <input
                        type="number"
                        min="1"
                        value={rangeForm.end}
                        onChange={(event) => setRangeForm((current) => ({ ...current, end: Number(event.target.value) }))}
                        onKeyDown={(event) => handleScoreSectionEnter(event, hasPendingRangeWeightChange, applyRangeWeight)}
                      />
                    </label>
                    <label className="field">
                      <span>Peso</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={rangeForm.weight}
                        onChange={(event) => setRangeForm((current) => ({ ...current, weight: Number(event.target.value) }))}
                        onKeyDown={(event) => handleScoreSectionEnter(event, hasPendingRangeWeightChange, applyRangeWeight)}
                      />
                    </label>
                    <Button type="button" variant="secondary" onClick={applyRangeWeight} disabled={!hasPendingRangeWeightChange}>
                      Aplicar peso ao intervalo
                    </Button>
                  </div>
                </div>

                {groupOptions.length > 1 ? (
                  <div className="answer-key-side-group answer-key-control-block">
                    <strong>Peso por grupo/tipo</strong>
                    <label className="field">
                      <span>Grupo</span>
                      <select value={selectedGroupKey} onChange={(event) => setSelectedGroupKey(event.target.value)}>
                        <option value="all">Selecione um grupo</option>
                        {groupOptions.map((group) => (
                          <option key={group.value} value={group.value}>
                            {group.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>Peso</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={groupWeightValue}
                        onChange={(event) => setGroupWeightValue(Number(event.target.value))}
                        onKeyDown={(event) => handleScoreSectionEnter(event, hasPendingGroupWeightChange, applyGroupWeight)}
                      />
                    </label>
                    <Button type="button" variant="secondary" onClick={applyGroupWeight} disabled={!hasPendingGroupWeightChange}>
                      Aplicar peso ao grupo
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}

            {activeSideTab === 'summary' ? (
              <div className="answer-key-panel-content">
                <div className="answer-key-summary">
                  <div>
                    <span>Total de itens</span>
                    <strong>{questions.length}</strong>
                  </div>
                  <div>
                    <span>Itens visíveis</span>
                    <strong>{filteredQuestions.length}</strong>
                  </div>
                  <div>
                    <span>Itens respondidos</span>
                    <strong>{answeredCount}</strong>
                  </div>
                  <div>
                    <span>Itens sem resposta</span>
                    <strong>{missingAnswers.length}</strong>
                  </div>
                  <div>
                    <span>Itens anulados</span>
                    <strong>{annulledCount}</strong>
                  </div>
                  <div>
                    <span>Pontuação total</span>
                    <strong>{Number(totalFinalScore.toFixed(2)).toLocaleString('pt-BR')}</strong>
                  </div>
                </div>
                {missingAnswers.length ? (
                  <p className="answer-key-panel-warning">
                    Existem itens sem resposta. Eles não entram na pontuação total e exigirão confirmação ao salvar.
                  </p>
                ) : null}
              </div>
            ) : null}
          </Card>

        </aside>
      </div>

      {activePopoverQuestion && popoverPosition && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={popoverRef}
              className={`answer-key-popover answer-key-popover--portal answer-key-popover--${popoverPosition.placement}`}
              style={{
                top: popoverPosition.top,
                left: popoverPosition.left,
                width: popoverPosition.width,
              }}
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-label={`Editar questão ${activePopoverQuestion.questionNumber}`}
            >
              <div className="answer-key-popover__header">
                <div>
                  <strong>Questão {activePopoverQuestion.questionNumber}</strong>
                  <span>{getQuestionTypeLabel(activePopoverQuestion)}</span>
                </div>
                <button
                  type="button"
                  className="answer-key-popover__close"
                  onClick={() => setActivePopoverQuestionNumber(null)}
                  aria-label="Fechar edição"
                >
                  ×
                </button>
              </div>

              {activePopoverQuestion.questionType === 'objective' ? (
                <div className="answer-key-popover__section">
                  <span>Resposta correta</span>
                  <div className="answer-key-popover__options">
                    {activePopoverQuestion.validOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        className={
                          activePopoverQuestion.status === 'annulled' ||
                          activePopoverQuestion.correctAnswer === option
                            ? 'answer-key-bubble answer-key-bubble--selected'
                            : 'answer-key-bubble'
                        }
                        disabled={activePopoverQuestion.status === 'annulled'}
                        onClick={() => handleObjectiveAnswerSelect(activePopoverQuestion.questionNumber, option)}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {activePopoverQuestion.questionType === 'math' ? (
                <div className="answer-key-popover__section">
                  <span>Resposta matemática</span>
                  <input
                    className="answer-key-popover__text-input"
                    value={activePopoverQuestion.correctAnswer ?? ''}
                    maxLength={activePopoverQuestion.responseColumns}
                    placeholder={
                      activePopoverQuestion.responseColumns
                        ? `${activePopoverQuestion.responseColumns} coluna(s)`
                        : 'Resposta'
                    }
                    onChange={(event) =>
                      handleMathAnswerChange(activePopoverQuestion.questionNumber, event.target.value)
                    }
                  />
                  <small className="answer-key-popover__help">
                    Permitidos: {getMathAnswerCharacters(activePopoverQuestion).join(' ')}
                  </small>
                </div>
              ) : null}

              <div className="answer-key-popover__fields">
                <label>
                  <span>
                    {activePopoverQuestion.questionType === 'open' ||
                    activePopoverQuestion.questionType === 'essay'
                      ? 'Pontuação máxima'
                      : 'Pontuação'}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                      value={
                        activePopoverQuestion.questionType === 'essay'
                          ? activePopoverQuestion.maxScore ?? activePopoverQuestion.score
                          : activePopoverQuestion.questionType === 'open'
                            ? activePopoverQuestion.maxScore ?? activePopoverQuestion.score
                            : activePopoverQuestion.score
                    }
                    onChange={(event) => {
                      const nextValue = Number(event.target.value)
                      if (activePopoverQuestion.questionType === 'essay') {
                        applyEssayScore(nextValue)
                        return
                      }
                      handleQuestionScoreChange(activePopoverQuestion.questionNumber, nextValue)
                    }}
                  />
                </label>
                <label>
                  <span>Peso</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={activePopoverQuestion.weight}
                    onChange={(event) =>
                      handleQuestionWeightChange(activePopoverQuestion.questionNumber, Number(event.target.value))
                    }
                  />
                </label>
              </div>

              <label className="answer-key-toggle answer-key-toggle--panel">
                <input
                  type="checkbox"
                  checked={activePopoverQuestion.status === 'annulled'}
                  onChange={(event) =>
                    handleQuestionStatusToggle(activePopoverQuestion.questionNumber, event.target.checked)
                  }
                />
                <span>Anular questão</span>
              </label>

              <div className="answer-key-popover__footer">
                <strong>
                  Valor final:{' '}
                  {Number(calculateQuestionFinalScore(activePopoverQuestion).toFixed(2)).toLocaleString('pt-BR')}
                </strong>
                <Button type="button" variant="secondary" onClick={() => setActivePopoverQuestionNumber(null)}>
                  Confirmar
                </Button>
              </div>
            </div>,
            document.body,
          )
        : null}

      {showIncompleteSaveDialog ? (
        <div className="dialog-backdrop" role="presentation">
          <div className="dialog-card" role="dialog" aria-modal="true" aria-labelledby="answer-key-incomplete-save-title">
            <h3 id="answer-key-incomplete-save-title">Alguns itens do seu cartão estão sem resposta. Deseja salvar mesmo assim?</h3>
            <p>Os itens sem resposta serão preservados como vazios e não contribuirão para a pontuação final calculada.</p>
            <div className="dialog-actions">
              <Button
                type="button"
                onClick={() => {
                  setShowIncompleteSaveDialog(false)
                  void executeSave(pendingSaveIntent)
                }}
                disabled={isSubmitting}
              >
                Salvar mesmo assim
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowIncompleteSaveDialog(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {showLeaveDialog ? (
        <div className="dialog-backdrop" role="presentation">
          <div className="dialog-card" role="dialog" aria-modal="true" aria-labelledby="answer-key-leave-title">
            <h3 id="answer-key-leave-title">O gabarito ainda não foi salvo. Como deseja prosseguir?</h3>
            <p>Escolha se quer sair agora, salvar antes de continuar ou cancelar a navegação.</p>
            <div className="dialog-actions">
              <Button type="button" variant="secondary" onClick={handleDiscardAndExit} disabled={isSubmitting}>
                Sair sem salvar
              </Button>
              <Button type="button" onClick={() => void handleSaveAndExit()} disabled={isSubmitting}>
                Salvar
              </Button>
              <Button type="button" variant="ghost" onClick={closeLeaveDialog} disabled={isSubmitting}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {showConstructionToast ? (
        <div className="toast-stack" aria-live="polite" aria-atomic="true">
          <div className="toast toast--success" role="status">
            <div className="toast__content">
              <strong>Seção em construção</strong>
              <span>Esse conteúdo ainda não está disponível.</span>
            </div>
            <button
              type="button"
              className="toast__close"
              aria-label="Fechar aviso"
              onClick={() => {
                setShowConstructionToast(false)
                if (constructionToastTimeoutRef.current) {
                  window.clearTimeout(constructionToastTimeoutRef.current)
                  constructionToastTimeoutRef.current = null
                }
              }}
            >
              ×
            </button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
