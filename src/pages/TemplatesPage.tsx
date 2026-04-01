import { useEffect, useRef, useState } from 'react'
import { Link, useBlocker, useNavigate, useParams } from 'react-router-dom'
import type { Location } from 'react-router-dom'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { Button } from '../components/Button'
import { Cabecalho } from '../components/Cabecalho'
import { Card } from '../components/Card'
import { CardTemplatePreview } from '../components/CardTemplatePreview'
import { useAcademicScope } from '../hooks/useAcademicScope'
import { academicService } from '../services/academicService'
import { omrService } from '../services/omrService'
import type {
  CardNumberingFormat,
  CardPresetId,
  CardQuestionBlock,
  CardTemplateEditorState,
  Template,
} from '../types/omr'
import { formatApiErrorMessage } from '../utils/display'
import { setSelectedExamId } from '../utils/domainSelection'
import {
  applySafeCardLayout,
  createEditorStateFromPreset,
  createEditorStateFromTemplate,
} from '../utils/cardTemplatePresets'
import { getTemplateLayoutBlueprint } from '../utils/templateLayoutBlueprint'
import {
  getConfidenceLabel,
  getReadModeFromConfig,
  normalizeEditorState,
  validateCardTemplateEditorState,
} from '../utils/cardTemplateValidator'
import { getDefaultOptionLabels, isValidOptionLabel } from '../utils/optionLabels'
import { MAX_QUESTIONS } from '../utils/questionLimits'
import { appendQuestionBlockWithDistribution, applyQuestionBlockBoundaryChange, buildNormalizedRenderModel, duplicateQuestionBlockAtIndex } from '../utils/questionBlocks'

type EditorSectionId =
  | 'savedTemplates'
  | 'structure'
  | 'questionBlocks'
  | 'studentIdentification'
  | 'header'
  | 'appearance'
  | 'omr'

type EditorFocusMode = 'visual' | 'reading'

type PersistTemplateOptions = {
  redirectOnCreate?: boolean
  successMessage?: string
}

const editorSections: Array<{ id: EditorSectionId; title: string; description: string }> = [
  { id: 'structure', title: 'Estrutura da prova', description: 'Defina a base do cartão: nome, número de questões, alternativas e distribuição.' },
  { id: 'questionBlocks', title: 'Blocos de questões', description: 'Agrupe intervalos de questões e defina títulos para aparecer antes de cada bloco.' },
  { id: 'studentIdentification', title: 'Identificação do aluno', description: 'Escolha os campos de identificação que realmente precisam aparecer no cartão.' },
  { id: 'header', title: 'Cabeçalho e informações', description: 'Ajuste o conteúdo institucional e os textos visíveis do topo do cartão.' },
  { id: 'appearance', title: 'Aparência', description: 'Controle o estilo visual do cartão sem tirar o preview do lugar.' },
  { id: 'omr', title: 'Leitura OMR', description: 'Veja o perfil de leitura e abra os diagnósticos técnicos quando precisar.' },
  { id: 'savedTemplates', title: 'Templates salvos', description: 'Abra para escolher rapidamente um template já salvo nesta prova.' },
]

const readingSectionIds: EditorSectionId[] = ['structure', 'questionBlocks', 'omr']
const visualSectionIds: EditorSectionId[] = ['studentIdentification', 'header', 'appearance', 'savedTemplates']

const numberingFormatOptions: Array<{
  value: CardNumberingFormat
  label: string
  example: string
}> = [
  { value: 'numeric', label: 'Numérica', example: '1, 2, 3' },
  { value: 'numericAlpha', label: 'Numérica + letra do bloco', example: '1A, 1B, 1C' },
  { value: 'alphaNumeric', label: 'Sequência + letra da coluna', example: '1A, 2A, 3A' },
  { value: 'numericLower', label: 'Numérica + letra minúscula', example: '1a, 1b, 1c' },
  { value: 'numericDash', label: 'Numérica com hífen', example: '1-a, 1-b, 1-c' },
]

function getTemplateTimestamp(template: Pick<Template, 'createdAt' | 'updatedAt'>) {
  return new Date(template.updatedAt ?? template.createdAt).getTime()
}

function applyExamContext(state: CardTemplateEditorState, context: { unitName: string; classroomName: string; examName: string }) {
  const nextState = structuredClone(state)
  nextState.definition.header.institutionName = context.unitName || nextState.definition.header.institutionName
  nextState.definition.header.examName = context.examName || nextState.definition.header.examName
  nextState.definition.header.classroomLabel = context.classroomName || nextState.definition.header.classroomLabel
  nextState.name = nextState.name || context.examName || nextState.definition.header.examName
  return normalizeEditorState(nextState)
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo da logo.'))
    reader.readAsDataURL(file)
  })
}

function getDistributionLabel(totalQuestions: number, _choicesPerQuestion: 2 | 3 | 4 | 5, columns: number) {
  const selectedColumns = Math.max(columns, 1)
  const rowsPerColumn = Math.max(1, Math.ceil(totalQuestions / selectedColumns))
  const columnLabel = selectedColumns === 1 ? '1 coluna' : `${selectedColumns} colunas`
  const rowLabel = rowsPerColumn === 1 ? '1 linha por coluna' : `${rowsPerColumn} linhas por coluna`

  return `${columnLabel} | ${rowLabel}`
}

function getStateSnapshot(state: CardTemplateEditorState) {
  return JSON.stringify(state)
}

function buildLocationPath(location: Location) {
  return `${location.pathname}${location.search}${location.hash}`
}

function getPersistedSnapshot(state: CardTemplateEditorState) {
  return getStateSnapshot(validateCardTemplateEditorState(state).sanitizedState)
}

function EditorSectionIcon({ id }: { id: EditorSectionId }) {
  if (id === 'structure') {
    return (
      <svg viewBox="0 0 24 24" focusable="false">
        <path d="M12 8.75A3.25 3.25 0 1 0 12 15.25A3.25 3.25 0 1 0 12 8.75Z" />
        <path d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.33 7.33 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.49-.42h-3.84a.5.5 0 0 0-.49.42l-.36 2.54c-.58.22-1.12.54-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.7 8.84a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94L2.82 14.52a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .6.22l2.39-.96c.5.4 1.05.72 1.63.94l.36 2.54a.5.5 0 0 0 .49.42h3.84a.5.5 0 0 0 .49-.42l.36-2.54c.58-.22 1.12-.54 1.63-.94l2.39.96a.5.5 0 0 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58Z" />
      </svg>
    )
  }

  if (id === 'questionBlocks') {
    return (
      <svg viewBox="0 0 24 24" focusable="false">
        <rect x="4" y="5" width="16" height="4" rx="1.5" />
        <rect x="4" y="10" width="10" height="4" rx="1.5" />
        <rect x="4" y="15" width="13" height="4" rx="1.5" />
      </svg>
    )
  }

  if (id === 'studentIdentification') {
    return (
      <svg viewBox="0 0 24 24" focusable="false">
        <path d="M12 12a4 4 0 1 0 0-8a4 4 0 0 0 0 8Z" />
        <path d="M4 20a8 8 0 0 1 16 0v1H4v-1Z" />
      </svg>
    )
  }

  if (id === 'header') {
    return (
      <svg viewBox="0 0 24 24" focusable="false">
        <rect x="4" y="4" width="16" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M7 9h10M7 13h7M7 17h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    )
  }

  if (id === 'appearance') {
    return (
      <svg viewBox="0 0 24 24" focusable="false">
        <path d="M12 3a9 9 0 1 0 0 18h1.2a2.8 2.8 0 0 0 0-5.6H12A2.2 2.2 0 0 1 12 11h4.8A4.2 4.2 0 0 0 21 6.8A3.8 3.8 0 0 0 17.2 3H12Z" />
        <circle cx="7.5" cy="10" r="1.2" fill="#f8fafc" />
        <circle cx="10.5" cy="7.2" r="1.2" fill="#f8fafc" />
        <circle cx="15" cy="7.8" r="1.2" fill="#f8fafc" />
      </svg>
    )
  }

  if (id === 'omr') {
    return (
      <svg viewBox="0 0 24 24" focusable="false">
        <path d="M5 8V6a1 1 0 0 1 1-1h2M19 8V6a1 1 0 0 0-1-1h-2M5 16v2a1 1 0 0 0 1 1h2M19 16v2a1 1 0 0 1-1 1h-2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M7 12h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="12" cy="12" r="2.6" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" focusable="false">
      <path d="M6 4h9l3 3v13H6V4Zm8 1.5V8h2.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9 12h6M9 16h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function TemplatesPage() {
  const { unitId, classroomId, examId, templateId } = useParams()
  const navigate = useNavigate()
  const { selectedUnit, selectedClassroom, selectedExam, refresh } = useAcademicScope()
  const [templates, setTemplates] = useState<Template[]>([])
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(templateId ?? null)
  const [editorState, setEditorState] = useState<CardTemplateEditorState>(() => createEditorStateFromPreset('enem-a4'))
  const [activeSection, setActiveSection] = useState<EditorSectionId>('structure')
  const [focusMode, setFocusMode] = useState<EditorFocusMode>('reading')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [showLeaveDialog, setShowLeaveDialog] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [questionBlockDrafts, setQuestionBlockDrafts] = useState<Array<{ startQuestion: string; endQuestion: string }>>([])
  const [activeQuestionBlockIndex, setActiveQuestionBlockIndex] = useState<number | null>(0)
  const [blockSearch, setBlockSearch] = useState('')
  const lastValidStateRef = useRef<CardTemplateEditorState | null>(null)
  const persistedStateSnapshotRef = useRef(getStateSnapshot(editorState))
  const pendingLocationRef = useRef<Location | null>(null)
  const shouldBypassBlockerRef = useRef(false)

  useEffect(() => {
    if (examId) setSelectedExamId(examId)
  }, [examId])

  useEffect(() => {
    setActiveTemplateId(templateId ?? null)
  }, [templateId])

  useEffect(() => {
    if (!selectedExam) return

    const loadTemplates = async () => {
      setIsLoading(true)

      try {
        const response = await omrService.getTemplates({ examId: selectedExam.id })
        const examTemplates = response.items
        setTemplates(examTemplates)
        const latestTemplate = [...examTemplates].sort((left, right) => getTemplateTimestamp(right) - getTemplateTimestamp(left))[0]

        const context = {
          unitName: selectedUnit?.name ?? 'Instituição',
          classroomName: selectedClassroom?.name ?? 'Turma',
          examName: selectedExam.name,
        }

        if (templateId) {
          const currentTemplate = examTemplates.find((item) => item.id === templateId)
          if (currentTemplate) {
            const nextState = normalizeEditorState(createEditorStateFromTemplate(currentTemplate))
            setEditorState(nextState)
            persistedStateSnapshotRef.current = getPersistedSnapshot(nextState)
            setActiveTemplateId(currentTemplate.id)
            setMessage(null)
            setError(null)
          }
        } else if (latestTemplate) {
          const nextState = normalizeEditorState(createEditorStateFromTemplate(latestTemplate))
          setEditorState(nextState)
          persistedStateSnapshotRef.current = getPersistedSnapshot(nextState)
          setActiveTemplateId(latestTemplate.id)
          setMessage(null)
          setError(null)
        } else {
          setEditorState((current) => {
            const nextState = applyExamContext(current, context)
            persistedStateSnapshotRef.current = getPersistedSnapshot(nextState)
            return nextState
          })
          setActiveTemplateId(null)
        }
      } catch (loadError) {
        setError(formatApiErrorMessage('Não foi possível carregar os templates da prova.', loadError))
      } finally {
        setIsLoading(false)
      }
    }

    void loadTemplates()
  }, [selectedClassroom?.name, selectedExam, selectedUnit?.name, templateId])

  const validation = validateCardTemplateEditorState(editorState)
  const currentState = validation.sanitizedState
  const hasUnsavedChanges = getStateSnapshot(currentState) !== persistedStateSnapshotRef.current
  const currentReadMode = getReadModeFromConfig(currentState.omrConfig)
  const confidenceLabel = getConfidenceLabel(currentState.omrConfig)
  const blueprint = getTemplateLayoutBlueprint(currentState)
  const renderModel = buildNormalizedRenderModel(currentState.definition, currentState.visualTheme.answerGridStyle)
  const activeTemplate = activeTemplateId ? templates.find((item) => item.id === activeTemplateId) ?? null : null
  const visibleSections = editorSections.filter((section) =>
    focusMode === 'reading' ? readingSectionIds.includes(section.id) : visualSectionIds.includes(section.id),
  )
  const validationErrors = validation.issues.filter((issue) => issue.severity === 'error')
  const validationWarnings = validation.issues.filter((issue) => issue.severity === 'warning')
  const safeStructureLabel = getDistributionLabel(
    currentState.definition.totalQuestions,
    currentState.definition.choicesPerQuestion,
    currentState.definition.columns,
  )
  const focusModeLabel = focusMode === 'reading' ? 'Modo leitura' : 'Modo visual'
  const focusModeDescription =
    focusMode === 'reading'
      ? 'Revise estrutura, blocos e parâmetros OMR que impactam a leitura e a API.'
      : 'Ajuste cabeçalho, identificação e estilo sem perder o preview do cartão.'

  useEffect(() => {
    if (validation.isValid) lastValidStateRef.current = structuredClone(currentState)
  }, [currentState, validation.isValid])

  useEffect(() => {
    if (visibleSections.some((section) => section.id === activeSection)) return
    setActiveSection(visibleSections[0]?.id ?? 'structure')
  }, [activeSection, visibleSections])

  useEffect(() => {
    setQuestionBlockDrafts(
      editorState.definition.questionBlocks.map((block) => ({
        startQuestion: String(block.startQuestion),
        endQuestion: String(block.endQuestion),
      })),
    )
  }, [editorState.definition.questionBlocks.length, editorState.definition.questionBlocks.map((block) => `${block.startQuestion}-${block.endQuestion}`).join('|')])

  useEffect(() => {
    if (!editorState.definition.enableQuestionBlocks || editorState.definition.questionBlocks.length === 0) {
      setActiveQuestionBlockIndex(null)
      return
    }

    setActiveQuestionBlockIndex((current) => {
      if (current === null || current < 0 || current >= editorState.definition.questionBlocks.length) return 0
      return current
    })
  }, [editorState.definition.enableQuestionBlocks, editorState.definition.questionBlocks.length])

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

  useEffect(() => {
    if (!message) return
    const timeoutId = window.setTimeout(() => {
      setMessage(null)
    }, 8000)

    return () => window.clearTimeout(timeoutId)
  }, [message])

  useEffect(() => {
    if (!error) return
    const timeoutId = window.setTimeout(() => {
      setError(null)
    }, 8000)

    return () => window.clearTimeout(timeoutId)
  }, [error])

  const applyState = (updater: (current: CardTemplateEditorState) => CardTemplateEditorState) => {
    setEditorState((current) => validateCardTemplateEditorState(updater(current)).sanitizedState)
    setError(null)
    setMessage(null)
  }

  const allowNextNavigation = () => {
    shouldBypassBlockerRef.current = true
    window.setTimeout(() => {
      shouldBypassBlockerRef.current = false
    }, 0)
  }

  const handlePresetChange = (presetId: CardPresetId) => {
    if (!selectedExam) return

    const presetState = applyExamContext(createEditorStateFromPreset(presetId), {
      unitName: selectedUnit?.name ?? 'Instituição',
      classroomName: selectedClassroom?.name ?? 'Turma',
      examName: selectedExam.name,
    })

    applyState(() => presetState)
  }

  const handleFriendlyStructureChange = <K extends keyof CardTemplateEditorState['definition']>(
    field: K,
    value: CardTemplateEditorState['definition'][K],
  ) => {
    applyState((current) => {
      const nextState = structuredClone(current)
      nextState.definition[field] = value
      return applySafeCardLayout(nextState)
    })
  }

  const handleChoicesPerQuestionChange = (choicesPerQuestion: 2 | 3 | 4 | 5) => {
    applyState((current) => {
      const nextState = structuredClone(current)
      nextState.definition.choicesPerQuestion = choicesPerQuestion
      nextState.definition.optionLabels = getDefaultOptionLabels(choicesPerQuestion)
      return applySafeCardLayout(nextState)
    })
  }

  const handleOptionLabelChange = (index: number, value: string) => {
    applyState((current) => {
      const nextState = structuredClone(current)
      const normalizedValue = value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 1)
      const nextLabels = [...nextState.definition.optionLabels]
      nextLabels[index] = normalizedValue
      nextState.definition.optionLabels = nextLabels
      return nextState
    })
  }

  const handleQuestionBlockChoicesChange = (index: number, choicesPerQuestion: 2 | 3 | 4 | 5) => {
    applyState((current) => {
      const nextState = structuredClone(current)
      const block = nextState.definition.questionBlocks[index]
      if (!block) return nextState
      block.choicesPerQuestion = choicesPerQuestion
      block.optionLabels = getDefaultOptionLabels(choicesPerQuestion)
      return applySafeCardLayout(nextState)
    })
  }

  const handleQuestionBlockOptionLabelChange = (blockIndex: number, optionIndex: number, value: string) => {
    applyState((current) => {
      const nextState = structuredClone(current)
      const block = nextState.definition.questionBlocks[blockIndex]
      if (!block) return nextState
      const normalizedValue = value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 1)
      const nextLabels = [...block.optionLabels]
      nextLabels[optionIndex] = normalizedValue
      block.optionLabels = nextLabels
      return nextState
    })
  }

  const handleDefinitionFlagChange = (
    section: 'identification',
    field: keyof CardTemplateEditorState['definition']['identification'],
    value: boolean,
  ) => {
    applyState((current) => {
      const nextState = structuredClone(current)
      nextState.definition[section][field] = value as never
      return nextState
    })
  }

  const handleHeaderChange = (field: keyof CardTemplateEditorState['definition']['header'], value: string | boolean | number) => {
    applyState((current) => {
      const nextState = structuredClone(current)
      nextState.definition.header[field] = value as never
      return nextState
    })
  }

  const handleInstitutionLogoUpload = async (file: File | null) => {
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Selecione um arquivo de imagem válido para a logo.')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('A logo deve ter no máximo 2 MB.')
      return
    }

    try {
      const dataUrl = await readFileAsDataUrl(file)
      setError(null)
      setMessage('Logo institucional carregada no layout atual.')
      handleHeaderChange('institutionLogoDataUrl', dataUrl)
      handleHeaderChange('showInstitutionLogo', true)
    } catch (logoError) {
      setError(formatApiErrorMessage('Não foi possível carregar a logo.', logoError))
    }
  }

  const handleInstitutionLogoRemove = () => {
    setError(null)
    setMessage('Logo institucional removida do layout atual.')
    handleHeaderChange('institutionLogoDataUrl', '')
  }

  const handleExtraFieldsChange = (value: string) => {
    applyState((current) => {
      const nextState = structuredClone(current)
      nextState.definition.identification.extraFields = value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
      return nextState
    })
  }

  const handleThemeChange = (field: keyof CardTemplateEditorState['visualTheme'], value: string | boolean) => {
    applyState((current) => {
      const nextState = structuredClone(current)
      nextState.visualTheme[field] = value as never
      return field === 'density' ? applySafeCardLayout(nextState) : nextState
    })
  }

  const handleQuestionBlocksToggle = (enabled: boolean) => {
    if (enabled) {
      setActiveQuestionBlockIndex(0)
    } else {
      setActiveQuestionBlockIndex(null)
    }

    applyState((current) => {
      const nextState = structuredClone(current)
      nextState.definition.enableQuestionBlocks = enabled
      if (enabled && nextState.definition.questionBlocks.length === 0) {
        nextState.definition.questionBlocks = [
          {
            startQuestion: 1,
            endQuestion: Math.min(10, nextState.definition.totalQuestions),
            title: 'Novo bloco',
            choicesPerQuestion: nextState.definition.choicesPerQuestion,
            optionLabels: [...nextState.definition.optionLabels],
            questionStyle: nextState.visualTheme.answerGridStyle,
          },
        ]
      }
      return applySafeCardLayout(nextState)
    })
  }

  const handleQuestionBlockChange = (
    index: number,
    field: keyof CardQuestionBlock,
    value: string | number,
  ) => {
    applyState((current) => {
      const nextState = structuredClone(current)
      const block = nextState.definition.questionBlocks[index]
      if (!block) return nextState
      block[field] = value as never
      return nextState
    })
  }

  const handleQuestionBlockDraftChange = (
    index: number,
    field: 'startQuestion' | 'endQuestion',
    value: string,
  ) => {
    const normalizedValue = value.replace(/\D/g, '')
    setQuestionBlockDrafts((current) =>
      current.map((draft, draftIndex) =>
        draftIndex === index ? { ...draft, [field]: normalizedValue } : draft,
      ),
    )
  }

  const handleQuestionBlockNumberCommit = (
    index: number,
    field: 'startQuestion' | 'endQuestion',
  ) => {
    const draft = questionBlockDrafts[index]
    const currentBlock = currentState.definition.questionBlocks[index]
    if (!draft || !currentBlock) return

    const rawValue = draft[field]
    const parsedValue = Number(rawValue)
    const fallbackValue = currentBlock[field]
    const upperLimit = field === 'endQuestion' ? MAX_QUESTIONS : currentState.definition.totalQuestions
    const safeValue =
      Number.isFinite(parsedValue) && rawValue.trim().length > 0
        ? Math.min(upperLimit, Math.max(1, parsedValue))
        : fallbackValue

    applyState((current) => {
      const nextState = structuredClone(current)
      nextState.definition.questionBlocks = applyQuestionBlockBoundaryChange(
        nextState.definition.questionBlocks,
        index,
        field,
        safeValue,
        MAX_QUESTIONS,
      )
      return applySafeCardLayout(nextState)
    })
  }

  const handleAddQuestionBlock = () => {
    setActiveQuestionBlockIndex(currentState.definition.questionBlocks.length)
    applyState((current) => {
      const nextState = structuredClone(current)
      const nextBlocks = appendQuestionBlockWithDistribution(
        nextState.definition.questionBlocks,
        nextState.definition.totalQuestions,
        {
          choicesPerQuestion: nextState.definition.choicesPerQuestion,
          optionLabels: nextState.definition.optionLabels,
          questionStyle: nextState.visualTheme.answerGridStyle,
        },
      )
      nextState.definition.questionBlocks = nextBlocks
      const latestQuestion = nextBlocks[nextBlocks.length - 1]?.endQuestion ?? nextState.definition.totalQuestions
      nextState.definition.totalQuestions = Math.min(MAX_QUESTIONS, Math.max(nextState.definition.totalQuestions, latestQuestion))
      return applySafeCardLayout(nextState)
    })
  }

  const handleDuplicateQuestionBlock = (index: number) => {
    setActiveQuestionBlockIndex(index + 1)
    applyState((current) => {
      const nextState = structuredClone(current)
      const nextBlocks = duplicateQuestionBlockAtIndex(
        nextState.definition.questionBlocks,
        index,
        nextState.definition.totalQuestions,
      )
      nextState.definition.questionBlocks = nextBlocks
      const latestQuestion = nextBlocks[nextBlocks.length - 1]?.endQuestion ?? nextState.definition.totalQuestions
      nextState.definition.totalQuestions = Math.min(MAX_QUESTIONS, Math.max(nextState.definition.totalQuestions, latestQuestion))
      return applySafeCardLayout(nextState)
    })
  }

  const handleRemoveQuestionBlock = (index: number) => {
    setActiveQuestionBlockIndex((current) => {
      if (current === null) return null
      if (current === index) {
        if (index > 0) return index - 1
        return currentState.definition.questionBlocks.length > 1 ? 0 : null
      }
      if (current > index) return current - 1
      return current
    })

    applyState((current) => {
      const nextState = structuredClone(current)
      nextState.definition.questionBlocks.splice(index, 1)
      return applySafeCardLayout(nextState)
    })
  }

  const handleMoveQuestionBlock = (index: number, direction: -1 | 1) => {
    setActiveQuestionBlockIndex((current) => {
      if (current === null) return null
      const nextIndex = index + direction
      if (nextIndex < 0 || nextIndex >= currentState.definition.questionBlocks.length) return current
      if (current === index) return nextIndex
      if (current === nextIndex) return index
      return current
    })

    applyState((current) => {
      const nextState = structuredClone(current)
      const nextIndex = index + direction
      if (nextIndex < 0 || nextIndex >= nextState.definition.questionBlocks.length) return nextState
      const [block] = nextState.definition.questionBlocks.splice(index, 1)
      nextState.definition.questionBlocks.splice(nextIndex, 0, block)
      return applySafeCardLayout(nextState)
    })
  }

  const handleRestorePreset = () => handlePresetChange(currentState.presetId)

  const handleRestoreLastValid = () => {
    if (!lastValidStateRef.current) return
    setEditorState(structuredClone(lastValidStateRef.current))
    setError(null)
    setMessage('Último estado válido restaurado.')
  }

  const refreshTemplates = async () => {
    if (!selectedExam) return
    const response = await omrService.getTemplates({ examId: selectedExam.id })
    setTemplates(response.items)
  }

  const persistTemplate = async (mode: 'create' | 'update' | 'duplicate', options: PersistTemplateOptions = {}) => {
    if (!selectedExam) {
      setError('Selecione uma prova ativa antes de salvar o cartão.')
      return null
    }

    const effectiveTotalQuestions = currentState.definition.totalQuestions

    const payload = {
      name: mode === 'duplicate' ? `${currentState.name} Cópia` : currentState.name,
      examId: selectedExam.id,
      totalQuestions: effectiveTotalQuestions,
      presetId: currentState.presetId,
      definition: currentState.definition,
      visualTheme: currentState.visualTheme,
      omrConfig: currentState.omrConfig,
    }

    setIsSaving(true)
    setError(null)
    setMessage('Salvando alterações...')

    try {
      const shouldSyncExamTotal = selectedExam.totalQuestions !== effectiveTotalQuestions

      if (shouldSyncExamTotal) {
        await academicService.updateExam(selectedExam.id, {
          classroomId: selectedExam.classroomId,
          title: selectedExam.name,
          subject: selectedExam.subject,
          totalQuestions: effectiveTotalQuestions,
        })
      }

      const response =
        mode === 'update' && activeTemplateId
          ? await omrService.updateTemplate(activeTemplateId, payload)
          : await omrService.createTemplate(payload)

      if (shouldSyncExamTotal) {
        await refresh()
      }

      await refreshTemplates()
      const nextState = normalizeEditorState(createEditorStateFromTemplate(response.item))
      setEditorState(nextState)
      setActiveTemplateId(response.item.id)
      persistedStateSnapshotRef.current = getPersistedSnapshot(nextState)
      setMessage(
        options.successMessage ??
          (mode === 'duplicate'
            ? `Template ${response.item.name} duplicado com sucesso.`
            : 'Alterações salvas com sucesso.'),
      )

      if (mode !== 'update' && options.redirectOnCreate !== false) {
        allowNextNavigation()
        navigate(`/app/units/${unitId}/classrooms/${classroomId}/exams/${examId}/layout/${response.item.id}/edit`, { replace: true })
      }

      return response.item
    } catch (saveError) {
      setMessage(null)
      setError(formatApiErrorMessage('Não foi possível salvar o template.', saveError))
      return null
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveChanges = async () => {
    await persistTemplate(activeTemplateId ? 'update' : 'create', {
      redirectOnCreate: false,
      successMessage: 'Alterações salvas com sucesso.',
    })
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

  const handleDiscardAndExit = () => {
    navigateToPendingLocation()
  }

  const handleSaveAndExit = async () => {
    const savedTemplate = await persistTemplate(activeTemplateId ? 'update' : 'create', {
      redirectOnCreate: false,
      successMessage: 'Alterações salvas com sucesso.',
    })

    if (!savedTemplate) return

    navigateToPendingLocation()
  }

  const activeQuestionBlock =
    activeQuestionBlockIndex !== null ? currentState.definition.questionBlocks[activeQuestionBlockIndex] ?? null : null
  const activeBlockPreviousIndex =
    activeQuestionBlockIndex !== null && activeQuestionBlockIndex > 0 ? activeQuestionBlockIndex - 1 : null
  const activeBlockNextIndex =
    activeQuestionBlockIndex !== null && activeQuestionBlockIndex < currentState.definition.questionBlocks.length - 1
      ? activeQuestionBlockIndex + 1
      : null
  const collapsedQuestionBlocks = currentState.definition.questionBlocks
    .map((block, index) => ({ block, index }))
    .filter(({ index }) => index !== activeQuestionBlockIndex)
  const normalizedBlockSearch = blockSearch.trim().toLowerCase()
  const filteredCollapsedQuestionBlocks = collapsedQuestionBlocks.filter(({ block, index }) => {
    if (!normalizedBlockSearch) return true
    const label = `bloco ${index + 1}`.toLowerCase()
    const range = `${block.startQuestion}-${block.endQuestion}`.toLowerCase()
    const rangeSingle = `${block.startQuestion}`.toLowerCase()
    const title = block.title.trim().toLowerCase()
    return (
      label.includes(normalizedBlockSearch) ||
      range.includes(normalizedBlockSearch) ||
      rangeSingle.includes(normalizedBlockSearch) ||
      title.includes(normalizedBlockSearch)
    )
  })
  const getQuestionBlockStatus = (index: number) => {
    const block = currentState.definition.questionBlocks[index]
    if (!block) return 'default'
    const previousBlock = currentState.definition.questionBlocks[index - 1]
    const nextBlock = currentState.definition.questionBlocks[index + 1]
    const hasGapBefore = index === 0 ? block.startQuestion > 1 : previousBlock.endQuestion + 1 < block.startQuestion
    const hasGapAfter = Boolean(nextBlock) && block.endQuestion + 1 < nextBlock.startQuestion
    const hasOverlapBefore = Boolean(previousBlock) && previousBlock.endQuestion >= block.startQuestion
    const hasOverlapAfter = Boolean(nextBlock) && block.endQuestion >= nextBlock.startQuestion
    const isOutOfRange = block.endQuestion > MAX_QUESTIONS

    return hasGapBefore || hasGapAfter || hasOverlapBefore || hasOverlapAfter || isOutOfRange ? 'warning' : 'default'
  }
  const technicalSummary = {
    lastRenderedQuestion: renderModel.lastRenderedQuestion,
    totalRenderedQuestions: renderModel.totalRenderedQuestions,
    activeBlocks: renderModel.blocks.length,
    uncoveredQuestions: renderModel.gapRanges.reduce(
      (total, range) => total + (range.endQuestion - range.startQuestion + 1),
      0,
    ),
    gapCount: renderModel.gapRanges.length,
    overlapCount: renderModel.overlappingQuestions.length,
  }

  const renderQuestionBlockEditor = (block: CardQuestionBlock, index: number) => (
    <Card className="card-editor-question-block" key={`question-block-active-${index}`}>
      <div className="card-editor-question-block__header">
        <strong>Bloco {index + 1}</strong>
        <div className="card-editor-question-block__toolbar">
          <button
            type="button"
            className="card-editor-icon-button"
            onClick={() => setActiveQuestionBlockIndex(activeBlockPreviousIndex)}
            disabled={activeBlockPreviousIndex === null}
            aria-label="Bloco anterior"
          >
            <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
              <path d="M14.5 6.5L9 12l5.5 5.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="card-editor-nav__tooltip" role="tooltip">Bloco anterior</span>
          </button>
          <button
            type="button"
            className="card-editor-icon-button"
            onClick={() => setActiveQuestionBlockIndex(activeBlockNextIndex)}
            disabled={activeBlockNextIndex === null}
            aria-label="Próximo bloco"
          >
            <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
              <path d="M9.5 6.5L15 12l-5.5 5.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="card-editor-nav__tooltip" role="tooltip">Próximo bloco</span>
          </button>
          <button
            type="button"
            className="card-editor-icon-button"
            onClick={() => handleMoveQuestionBlock(index, -1)}
            disabled={index === 0}
            aria-label="Subir"
          >
            <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
              <path d="M12 17.5v-11" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M7.5 11 12 6.5 16.5 11" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="card-editor-nav__tooltip" role="tooltip">Subir</span>
          </button>
          <button
            type="button"
            className="card-editor-icon-button"
            onClick={() => handleMoveQuestionBlock(index, 1)}
            disabled={index === currentState.definition.questionBlocks.length - 1}
            aria-label="Descer"
          >
            <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
              <path d="M12 6.5v11" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M7.5 13 12 17.5 16.5 13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="card-editor-nav__tooltip" role="tooltip">Descer</span>
          </button>
          <button
            type="button"
            className="card-editor-icon-button"
            onClick={() => handleDuplicateQuestionBlock(index)}
            aria-label="Duplicar"
          >
            <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
              <rect x="8" y="8" width="9" height="9" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M6 14V7a2 2 0 0 1 2-2h7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="card-editor-nav__tooltip" role="tooltip">Duplicar</span>
          </button>
          <button
            type="button"
            className="card-editor-icon-button"
            onClick={() => handleRemoveQuestionBlock(index)}
            aria-label="Remover"
          >
            <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
              <path d="M5.5 7.5h13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M9 7.5V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M8.5 9.5v7a2 2 0 0 0 2 2h3a2 2 0 0 0 2-2v-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M10.5 11.5v4M13.5 11.5v4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="card-editor-nav__tooltip" role="tooltip">Remover</span>
          </button>
        </div>
      </div>
      <div className="card-editor-grid card-editor-grid--two">
        <label className="field">
          <span>Início</span>
          <input
            type="number"
            min="1"
            max={MAX_QUESTIONS}
            value={questionBlockDrafts[index]?.startQuestion ?? String(block.startQuestion)}
            onChange={(event) => handleQuestionBlockDraftChange(index, 'startQuestion', event.target.value)}
            onBlur={() => handleQuestionBlockNumberCommit(index, 'startQuestion')}
          />
          <small>Primeira questão do intervalo.</small>
        </label>
        <label className="field">
          <span>Fim</span>
          <input
            type="number"
            min="1"
            max={MAX_QUESTIONS}
            value={questionBlockDrafts[index]?.endQuestion ?? String(block.endQuestion)}
            onChange={(event) => handleQuestionBlockDraftChange(index, 'endQuestion', event.target.value)}
            onBlur={() => handleQuestionBlockNumberCommit(index, 'endQuestion')}
          />
          <small>Última questão coberta pelo bloco.</small>
        </label>
        <label className="field card-editor-grid__full">
          <span>Título</span>
          <input value={block.title} onChange={(event) => handleQuestionBlockChange(index, 'title', event.target.value)} />
          <small>Esse texto aparece antes da primeira questão do intervalo no preview e no PDF.</small>
        </label>
        <label className="field">
          <span>Alternativas por questão</span>
          <select
            value={block.choicesPerQuestion}
            onChange={(event) => handleQuestionBlockChoicesChange(index, Number(event.target.value) as 2 | 3 | 4 | 5)}
          >
            <option value="2">2 alternativas</option>
            <option value="3">3 alternativas</option>
            <option value="4">4 alternativas</option>
            <option value="5">5 alternativas</option>
          </select>
          <small>Esse bloco pode ter uma quantidade própria de alternativas.</small>
        </label>
        <div className="field">
          <span>Caracteres das alternativas</span>
          <div className="card-editor-option-labels">
            {Array.from({ length: block.choicesPerQuestion }, (_, optionIndex) => {
              const optionLabel = block.optionLabels[optionIndex] ?? ''
              const hasValue = optionLabel.length === 1
              const isInvalid = hasValue ? !isValidOptionLabel(optionLabel) : true

              return (
                <input
                  key={`block-option-label-${index}-${optionIndex}`}
                  type="text"
                  inputMode="text"
                  maxLength={1}
                  className={isInvalid ? 'card-editor-option-labels__input card-editor-option-labels__input--invalid' : 'card-editor-option-labels__input'}
                  value={optionLabel}
                  onChange={(event) => handleQuestionBlockOptionLabelChange(index, optionIndex, event.target.value)}
                  aria-label={`Caractere da alternativa ${optionIndex + 1} do bloco ${index + 1}`}
                />
              )
            })}
          </div>
          <small>Use apenas A-Z ou 0-9, sem repetir caracteres dentro do bloco.</small>
        </div>
        <label className="field card-editor-grid__full">
          <span>Estilo da questão</span>
          <select value={block.questionStyle} onChange={(event) => handleQuestionBlockChange(index, 'questionStyle', event.target.value)}>
            <option value="classic">Clássica</option>
            <option value="lined">Com guias</option>
            <option value="minimal">Minimalista</option>
          </select>
          <small>Esse estilo passa a valer apenas para as questões desse bloco no preview e no PDF.</small>
        </label>
      </div>
    </Card>
  )

  return (
    <section className="card-editor-page page-shell">
      <Cabecalho
        breadcrumb={
          <Breadcrumbs
            items={[
              { label: 'Unidades', to: '/app/units' },
              { label: selectedUnit?.name ?? 'Turmas', to: `/app/units/${unitId}` },
              { label: selectedClassroom?.name ?? 'Turma', to: `/app/units/${unitId}/classrooms/${classroomId}` },
              { label: 'Provas', to: `/app/units/${unitId}/classrooms/${classroomId}/exams` },
              { label: selectedExam?.name ?? 'Prova', to: `/app/units/${unitId}/classrooms/${classroomId}/exams/${examId}` },
              { label: 'Editor de cartão' },
            ]}
          />
        }
        title={templateId ? 'Editar cartão-resposta' : 'Criar cartão-resposta'}
        subtitle="Ajuste o cartão-resposta, revise o preview e salve as alterações do layout."
        actions={
          <>
            <Link to={`/app/units/${unitId}/classrooms/${classroomId}/exams/${examId}`}>
              <Button variant="secondary">Voltar para a prova</Button>
            </Link>
          </>
        }
      />

      <Card className="card-editor-overview">
        <div className="card-editor-overview__main">
          <div className="card-editor-overview__copy">
            <p className="card-editor-overview__eyebrow">Editor operacional</p>
            <p>{focusModeDescription}</p>
          </div>
          <div className="card-editor-overview__meta">
            <span className="card-editor-overview__pill">{focusModeLabel}</span>
            <span className={`card-editor-overview__pill${hasUnsavedChanges ? ' card-editor-overview__pill--attention' : ''}`}>
              {hasUnsavedChanges ? 'Com alterações pendentes' : 'Tudo salvo'}
            </span>
            {activeTemplate ? <span className="card-editor-overview__pill">Template {activeTemplate.version}</span> : null}
            <span className="card-editor-overview__pill">{safeStructureLabel}</span>
          </div>
        </div>

        <div className="card-editor-focus-switch" role="tablist" aria-label="Foco do editor">
          <button
            type="button"
            className={`card-editor-focus-switch__item${focusMode === 'reading' ? ' card-editor-focus-switch__item--active' : ''}`}
            onClick={() => setFocusMode('reading')}
            role="tab"
            aria-selected={focusMode === 'reading'}
          >
            <strong>Leitura</strong>
            <span>Estrutura, blocos e OMR</span>
          </button>
          <button
            type="button"
            className={`card-editor-focus-switch__item${focusMode === 'visual' ? ' card-editor-focus-switch__item--active' : ''}`}
            onClick={() => setFocusMode('visual')}
            role="tab"
            aria-selected={focusMode === 'visual'}
          >
            <strong>Visual</strong>
            <span>Identificação, cabeçalho e estilo</span>
          </button>
        </div>
      </Card>

      <div className="card-editor-toolbar">
        <div className="card-editor-toolbar__actions">
          <Button
            type="button"
            onClick={() => void handleSaveChanges()}
            disabled={isSaving || !hasUnsavedChanges}
            variant={hasUnsavedChanges ? 'primary' : 'secondary'}
          >
            {isSaving ? 'Salvando...' : 'Salvar alterações'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => void persistTemplate('duplicate')} disabled={isSaving || isLoading}>
            Duplicar template
          </Button>
          <Button
            variant="ghost"
            type="button"
            onClick={() => {
              setFocusMode('visual')
              setActiveSection('savedTemplates')
            }}
          >
            Usar templates salvos
          </Button>
          <Button type="button" variant="ghost" onClick={handleRestorePreset}>Restaurar padrão</Button>
          <Button type="button" variant="ghost" onClick={handleRestoreLastValid} disabled={!lastValidStateRef.current}>Último estado válido</Button>
        </div>
      </div>

      <div className="card-editor-layout">
        <div className="card-editor-layout__controls">
          <div className="card-editor-shell">
            <nav className="card-editor-nav" aria-label="Seções do editor de cartão">
              {visibleSections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  className={`card-editor-nav__item${section.id === activeSection ? ' card-editor-nav__item--active' : ''}`}
                  onClick={() => setActiveSection(section.id)}
                  aria-label={section.title}
                >
                  <span className="card-editor-nav__icon" aria-hidden="true">
                    <EditorSectionIcon id={section.id} />
                  </span>
                  <span className="card-editor-nav__tooltip" role="tooltip">
                    {section.title}
                  </span>
                </button>
              ))}
            </nav>

            <div className="card-editor-shell__panel">
          {activeSection === 'structure' ? (
            <Card className="card-editor-panel card-editor-panel--section">
              <div className="card-editor-section-panel__header">
                <h3>Estrutura da prova</h3>
                <p>Defina a base do cartão: nome, número de questões, alternativas e distribuição.</p>
              </div>
              <div className="card-editor-section-panel__body">
            <div className="card-editor-grid card-editor-grid--two">
              <label className="field">
                <span>Nome do template</span>
                <input value={currentState.name} onChange={(event) => applyState((current) => ({ ...current, name: event.target.value }))} />
                <small>Nome interno para identificar e reutilizar este cartão.</small>
              </label>
                {!currentState.definition.enableQuestionBlocks ? (
                  <label className="field">
                    <span>Quantidade de questões</span>
                    <input type="number" min="1" max={MAX_QUESTIONS} value={currentState.definition.totalQuestions} onChange={(event) => handleFriendlyStructureChange('totalQuestions', Number(event.target.value))} />
                    <small>As linhas por coluna serão recalculadas automaticamente.</small>
                  </label>
                ) : (
                  <div className="card-editor-field-static">
                    <span>Quantidade de questões</span>
                    <div className="card-editor-field-static__value">{currentState.definition.totalQuestions} questões derivadas dos blocos</div>
                    <small>Com agrupamento por blocos ativo, o total da prova é calculado automaticamente pelo maior fim configurado.</small>
                  </div>
                )}
                {!currentState.definition.enableQuestionBlocks ? (
                  <>
                    <label className="field">
                      <span>Alternativas por questão</span>
                      <select value={currentState.definition.choicesPerQuestion} onChange={(event) => handleChoicesPerQuestionChange(Number(event.target.value) as 2 | 3 | 4 | 5)}>
                        <option value="2">2 alternativas</option>
                        <option value="3">3 alternativas</option>
                        <option value="4">4 alternativas</option>
                        <option value="5">5 alternativas</option>
                      </select>
                      <small>O espaçamento e o tamanho das bolhas são recalculados automaticamente.</small>
                    </label>
                    <div className="field">
                      <span>Caracteres das alternativas</span>
                      <div className="card-editor-option-labels">
                        {Array.from({ length: currentState.definition.choicesPerQuestion }, (_, index) => {
                          const optionLabel = currentState.definition.optionLabels[index] ?? ''
                          const hasValue = optionLabel.length === 1
                          const isInvalid = hasValue ? !isValidOptionLabel(optionLabel) : true

                          return (
                            <input
                              key={`option-label-${index}`}
                              type="text"
                              inputMode="text"
                              maxLength={1}
                              className={isInvalid ? 'card-editor-option-labels__input card-editor-option-labels__input--invalid' : 'card-editor-option-labels__input'}
                              value={optionLabel}
                              onChange={(event) => handleOptionLabelChange(index, event.target.value)}
                              aria-label={`Caractere da alternativa ${index + 1}`}
                            />
                          )
                        })}
                      </div>
                      <small>Use apenas A-Z ou 0-9, sem repetir caracteres. Ex.: C E, A B C D E ou 0 1 2 3.</small>
                    </div>
                  </>
                ) : (
                  <div className="card-editor-field-static card-editor-grid__full">
                    <span>Alternativas e estilo por bloco</span>
                    <div className="card-editor-field-static__value">
                      As configurações de alternativas e estilo das questões estão sendo definidas individualmente em cada bloco.
                    </div>
                    <small>Abra a seção de blocos para configurar quantidade, caracteres e estilo de cada intervalo.</small>
                  </div>
                )}
              <label className="field">
                <span>Tamanho das bolhas</span>
                <select value={currentState.definition.bubbleSize} onChange={(event) => handleFriendlyStructureChange('bubbleSize', event.target.value as 'large' | 'medium' | 'small')}>
                  <option value="large">Grande</option>
                  <option value="medium">Médio</option>
                  <option value="small">Pequeno</option>
                </select>
                <small>Controla apenas o diâmetro das bolhas, mantendo a leitura visual equilibrada.</small>
              </label>
              <label className="field">
                <span>Espaçamento entre linhas</span>
                <select value={currentState.definition.rowSpacing} onChange={(event) => handleFriendlyStructureChange('rowSpacing', event.target.value as 'compact' | 'uniform')}>
                  <option value="compact">Compacto</option>
                  <option value="uniform">Uniforme</option>
                </select>
                <small>Define a densidade vertical da grade sem alterar a estrutura geral da página.</small>
              </label>
              <label className="field">
                <span>Quantidade de colunas</span>
                <select value={currentState.definition.columns} onChange={(event) => handleFriendlyStructureChange('columns', Number(event.target.value))}>
                  <option value="1">1 coluna</option>
                  <option value="2">2 colunas</option>
                  <option value="3">3 colunas</option>
                  {currentState.definition.bubbleSize === 'small' ? <option value="4">4 colunas</option> : null}
                </select>
                <small>
                  {currentState.definition.bubbleSize === 'small'
                    ? 'Você escolhe as colunas; as linhas por coluna são recalculadas automaticamente.'
                    : 'Você escolhe as colunas; 4 colunas ficam disponíveis apenas com bolhas pequenas.'}
                </small>
              </label>
              <div className="card-editor-field-static">
                <span>Distribuição atual</span>
                <div className="card-editor-field-static__value">{safeStructureLabel}</div>
                <small>A grade continua organizada dentro da área segura da folha A4.</small>
              </div>
              <label className="field">
                <span>Espaço entre colunas</span>
                <input type="range" min="0" max="32" step="1" value={currentState.definition.columnGap} onChange={(event) => handleFriendlyStructureChange('columnGap', Number(event.target.value))} />
                <small>{currentState.definition.columnGap}px adicionais entre colunas.</small>
              </label>
              <label className="field">
                <span>Distribuição das colunas</span>
                <select
                  value={currentState.definition.columnLayoutMode}
                  onChange={(event) => handleFriendlyStructureChange('columnLayoutMode', event.target.value as 'left' | 'distributed')}
                >
                  <option value="left">Alinhadas à esquerda</option>
                  <option value="distributed">Distribuídas na largura</option>
                </select>
                <small>Escolha se as colunas ficam agrupadas à esquerda ou espalhadas pela largura útil da folha.</small>
              </label>
              <label className="field">
                <span>Alinhamento das alternativas</span>
                <select value={currentState.definition.optionAlignment} onChange={(event) => handleFriendlyStructureChange('optionAlignment', event.target.value as 'auto' | 'left' | 'right' | 'center' | 'justify')}>
                  <option value="auto">Automático</option>
                  <option value="left">Esquerda</option>
                  <option value="right">Direita</option>
                  <option value="center">Centro</option>
                  <option value="justify">Justificado</option>
                </select>
                <small>Reposiciona cada linha da questão dentro da área útil da grade.</small>
              </label>
              <label className="field">
                <span>Formato da numeração</span>
                <select
                  value={currentState.definition.numberingFormat}
                  onChange={(event) => handleFriendlyStructureChange('numberingFormat', event.target.value as CardNumberingFormat)}
                >
                  {numberingFormatOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.example}
                    </option>
                  ))}
                </select>
                <small>Escolha como a sequência das questões aparece no cartão, no preview e no PDF. Quando houver blocos, os formatos com letra usam o bloco configurado, não a coluna visual.</small>
              </label>
            </div>
              </div>
            </Card>
          ) : null}

          {activeSection === 'questionBlocks' ? (
            <Card className="card-editor-panel card-editor-panel--section">
              <div className="card-editor-section-panel__header">
                <h3>Blocos de questões</h3>
                <p>Agrupe intervalos de questões e defina títulos para aparecer antes de cada bloco.</p>
              </div>
              <div className="card-editor-section-panel__body">
            <div className="card-editor-grid card-editor-grid--two">
              <label className="card-editor-toggle">
                <input type="checkbox" checked={currentState.definition.enableQuestionBlocks} onChange={(event) => handleQuestionBlocksToggle(event.target.checked)} />
                <span>Ativar agrupamento por blocos</span>
              </label>

              {currentState.definition.enableQuestionBlocks ? (
                <>
                  <label className="card-editor-toggle">
                    <input type="checkbox" checked={currentState.definition.showQuestionBlockTitles} onChange={(event) => handleFriendlyStructureChange('showQuestionBlockTitles', event.target.checked)} />
                    <span>Exibir títulos dos blocos</span>
                  </label>

                  <div className="card-editor-question-blocks-layout card-editor-grid__full">
                    <div className="card-editor-question-blocks-layout__active">
                      {activeQuestionBlock && activeQuestionBlockIndex !== null ? renderQuestionBlockEditor(activeQuestionBlock, activeQuestionBlockIndex) : null}
                    </div>

                    <div className="card-editor-question-blocks-layout__collapsed">
                      <label className="field card-editor-question-block-search">
                        <span>Buscar blocos</span>
                        <input
                          type="text"
                          value={blockSearch}
                          onChange={(event) => setBlockSearch(event.target.value)}
                          placeholder="Buscar bloco, intervalo ou título"
                        />
                      </label>
                      {filteredCollapsedQuestionBlocks.length ? (
                        filteredCollapsedQuestionBlocks.map(({ block, index }) => (
                          <Card
                            className={
                              getQuestionBlockStatus(index) === 'warning'
                                ? 'card-editor-question-block-summary card-editor-question-block-summary--warning'
                                : 'card-editor-question-block-summary'
                            }
                            key={`question-block-summary-${index}`}
                          >
                            <div className="card-editor-question-block-summary__main">
                              <strong className="card-editor-question-block-summary__name">Bloco {index + 1}</strong>
                              <span className="card-editor-question-block-summary__range">({block.startQuestion}-{block.endQuestion})</span>
                            </div>
                            <Button type="button" variant="ghost" className="card-editor-question-block-summary__open" onClick={() => setActiveQuestionBlockIndex(index)}>
                              Abrir
                            </Button>
                          </Card>
                        ))
                      ) : (
                        <Card className="card-editor-question-block-summary card-editor-question-block-summary--empty">
                          <div className="card-editor-question-block-summary__copy">
                            <strong>{blockSearch.trim() ? 'Nenhum bloco encontrado' : 'Um bloco ativo por vez'}</strong>
                            <small>{blockSearch.trim() ? 'Ajuste a busca para localizar outro bloco.' : 'Os próximos blocos aparecerão aqui em formato compacto.'}</small>
                          </div>
                        </Card>
                      )}
                    </div>
                  </div>

                  <div className="inline-actions">
                    <Button type="button" variant="secondary" onClick={handleAddQuestionBlock}>
                      Adicionar bloco
                    </Button>
                  </div>
                </>
              ) : (
                <p className="feedback">Ative o agrupamento para separar a prova em intervalos com títulos próprios.</p>
              )}
            </div>
              </div>
            </Card>
          ) : null}

          {activeSection === 'studentIdentification' ? (
            <Card className="card-editor-panel card-editor-panel--section">
              <div className="card-editor-section-panel__header">
                <h3>Identificação do aluno</h3>
                <p>Escolha os campos de identificação que realmente precisam aparecer no cartão.</p>
              </div>
              <div className="card-editor-section-panel__body">
            <div className="card-editor-toggle-list">
              {[
                ['showStudentName', 'Mostrar nome do aluno'],
                ['showStudentCode', 'Mostrar matrícula / ID'],
                ['showClassroom', 'Mostrar turma'],
                ['showDate', 'Mostrar data'],
                ['showExamCode', 'Mostrar código da prova'],
                ['showSignature', 'Mostrar assinatura'],
                ['showManualIdGrid', 'Mostrar grade de identificação manual'],
              ].map(([field, label]) => (
                <label className="card-editor-toggle" key={field}>
                  <input
                    type="checkbox"
                    checked={currentState.definition.identification[field as keyof typeof currentState.definition.identification] as boolean}
                    onChange={(event) => handleDefinitionFlagChange('identification', field as keyof typeof currentState.definition.identification, event.target.checked)}
                  />
                  <span>{label}</span>
                </label>
              ))}
              <label className="field">
                <span>Campos adicionais opcionais</span>
                <input value={currentState.definition.identification.extraFields.join(', ')} onChange={(event) => handleExtraFieldsChange(event.target.value)} placeholder="Professor, Sala, Turno" />
                <small>Separe por vírgula. Use somente campos curtos.</small>
              </label>
            </div>
              </div>
            </Card>
          ) : null}

          {activeSection === 'header' ? (
            <Card className="card-editor-panel card-editor-panel--section">
              <div className="card-editor-section-panel__header">
                <h3>Cabeçalho e informações</h3>
                <p>Ajuste o conteúdo institucional e os textos visíveis do topo do cartão.</p>
              </div>
              <div className="card-editor-section-panel__body">
            <div className="card-editor-grid card-editor-grid--two">
              <label className="field"><span>Nome da instituição</span><input value={currentState.definition.header.institutionName} onChange={(event) => handleHeaderChange('institutionName', event.target.value)} /></label>
              <label className="field"><span>Nome da prova</span><input value={currentState.definition.header.examName} onChange={(event) => handleHeaderChange('examName', event.target.value)} /></label>
              <label className="field"><span>Subtítulo</span><input value={currentState.definition.header.subtitle} onChange={(event) => handleHeaderChange('subtitle', event.target.value)} /></label>
              <label className="field"><span>Label da turma</span><input value={currentState.definition.header.classroomLabel} onChange={(event) => handleHeaderChange('classroomLabel', event.target.value)} /></label>
              <label className="field card-editor-grid__full">
                <span>Texto instrucional</span>
                <textarea rows={3} value={currentState.definition.header.instructions} onChange={(event) => handleHeaderChange('instructions', event.target.value)} />
                <small>Esse texto aparece logo abaixo do cabeçalho, antes da grade de respostas.</small>
              </label>
              <label className="card-editor-toggle">
                <input type="checkbox" checked={currentState.definition.header.showInstructions} onChange={(event) => handleHeaderChange('showInstructions', event.target.checked)} />
                <span>Exibir texto instrucional no cartão</span>
              </label>
              <label className="field card-editor-grid__full"><span>Texto de orientação OMR</span><textarea rows={2} value={currentState.definition.header.omrGuidance} onChange={(event) => handleHeaderChange('omrGuidance', event.target.value)} /></label>
              <label className="field card-editor-grid__full">
                <span>Frase do rodapé</span>
                <textarea rows={2} value={currentState.definition.header.footerMessage} onChange={(event) => handleHeaderChange('footerMessage', event.target.value)} placeholder="Ex.: Simulado oficial - 1º dia&#10;Aplicação de manhã" />
                <small>Esse texto aparece no espaço central do rodapé técnico do cartão. Você pode usar até duas linhas.</small>
              </label>
              <label className="field">
                <span>Alinhamento da frase</span>
                <select value={currentState.definition.header.footerMessageAlignment} onChange={(event) => handleHeaderChange('footerMessageAlignment', event.target.value as 'left' | 'center' | 'right')}>
                  <option value="left">Esquerda</option>
                  <option value="center">Centro</option>
                  <option value="right">Direita</option>
                </select>
              </label>
              <label className="field">
                <span>Peso da frase</span>
                <select value={currentState.definition.header.footerMessageWeight} onChange={(event) => handleHeaderChange('footerMessageWeight', event.target.value as 'regular' | 'semibold')}>
                  <option value="regular">Regular</option>
                  <option value="semibold">Semibold</option>
                </select>
              </label>
              <label className="field">
                <span>Tamanho da frase</span>
                <input type="range" min="7" max="11" step="0.5" value={currentState.definition.header.footerMessageFontSize} onChange={(event) => handleHeaderChange('footerMessageFontSize', Number(event.target.value))} />
                <small>{currentState.definition.header.footerMessageFontSize.toFixed(1)} pt no rodapé central.</small>
              </label>
              <label className="field">
                <span>Posição da paginação</span>
                <select value={currentState.definition.header.footerPagePosition} onChange={(event) => handleHeaderChange('footerPagePosition', event.target.value as 'top' | 'bottom')}>
                  <option value="bottom">Abaixo</option>
                  <option value="top">Acima</option>
                </select>
              </label>
              <label className="field">
                <span>Destaque da paginação</span>
                <select value={currentState.definition.header.footerPageTone} onChange={(event) => handleHeaderChange('footerPageTone', event.target.value as 'subtle' | 'standard')}>
                  <option value="subtle">Discreta</option>
                  <option value="standard">Padrão</option>
                </select>
              </label>
              <div className="card-editor-grid__full card-editor-logo-field">
                <label className="card-editor-toggle">
                  <input type="checkbox" checked={currentState.definition.header.showInstitutionLogo} onChange={(event) => handleHeaderChange('showInstitutionLogo', event.target.checked)} />
                  <span>Reservar área para logo institucional</span>
                </label>
                {currentState.definition.header.showInstitutionLogo ? (
                  <div className="card-editor-logo-upload">
                    {currentState.definition.header.institutionLogoDataUrl ? (
                      <img
                        src={currentState.definition.header.institutionLogoDataUrl}
                        alt="Pré-visualização da logo institucional"
                        className={`card-editor-logo-upload__preview${currentState.definition.header.logoMonochrome ? ' card-editor-logo-upload__preview--mono' : ''}`}
                        style={{
                          objectPosition:
                            currentState.definition.header.logoAlignment === 'left'
                              ? 'left center'
                              : currentState.definition.header.logoAlignment === 'right'
                                ? 'right center'
                                : 'center center',
                          transform: `scale(${currentState.definition.header.logoScale})`,
                        }}
                      />
                    ) : (
                      <div className="card-editor-logo-upload__placeholder">Nenhuma logo enviada ainda.</div>
                    )}
                    <div className="card-editor-grid card-editor-grid--two">
                      <label className="field">
                        <span>Alinhamento da logo</span>
                        <select value={currentState.definition.header.logoAlignment} onChange={(event) => handleHeaderChange('logoAlignment', event.target.value as 'left' | 'center' | 'right')}>
                          <option value="left">Esquerda</option>
                          <option value="center">Centro</option>
                          <option value="right">Direita</option>
                        </select>
                      </label>
                      <label className="field">
                        <span>Escala da logo</span>
                        <input type="range" min="0.6" max="1.2" step="0.05" value={currentState.definition.header.logoScale} onChange={(event) => handleHeaderChange('logoScale', Number(event.target.value))} />
                        <small>{Math.round(currentState.definition.header.logoScale * 100)}% do bloco reservado.</small>
                      </label>
                    </div>
                    <label className="field card-editor-logo-upload__field">
                      <span>Arquivo da logo</span>
                      <input type="file" accept="image/png,image/jpeg,image/jpg" onChange={(event) => void handleInstitutionLogoUpload(event.target.files?.[0] ?? null)} />
                      <small>Use PNG ou JPG com boa resolução. A imagem é salva junto com o layout.</small>
                    </label>
                    <label className="card-editor-toggle">
                      <input type="checkbox" checked={currentState.definition.header.logoMonochrome} onChange={(event) => handleHeaderChange('logoMonochrome', event.target.checked)} />
                      <span>Usar logo monocromática para impressão</span>
                    </label>
                    {currentState.definition.header.institutionLogoDataUrl ? (
                      <Button type="button" variant="ghost" onClick={handleInstitutionLogoRemove}>
                        Remover logo
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
              </div>
            </Card>
          ) : null}

          {activeSection === 'appearance' ? (
            <Card className="card-editor-panel card-editor-panel--section">
              <div className="card-editor-section-panel__header">
                <h3>Aparência</h3>
                <p>Controle o estilo visual do cartão sem tirar o preview do lugar.</p>
              </div>
              <div className="card-editor-section-panel__body">
            <div className="card-editor-grid card-editor-grid--two">
              <label className="field"><span>Estilo visual</span><select value={currentState.visualTheme.visualStyle} onChange={(event) => handleThemeChange('visualStyle', event.target.value)}><option value="institutional">Institucional</option><option value="vestibular">Vestibular</option><option value="compact">Compacto</option></select></label>
              <label className="field"><span>Densidade visual</span><select value={currentState.visualTheme.density} onChange={(event) => handleThemeChange('density', event.target.value)}><option value="compact">Compacta</option><option value="balanced">Equilibrada</option><option value="spacious">Espaçada</option></select></label>
              <label className="field"><span>Estilo da grade</span><select value={currentState.visualTheme.answerGridStyle} onChange={(event) => handleThemeChange('answerGridStyle', event.target.value)}><option value="classic">Clássica</option><option value="lined">Com guias</option><option value="minimal">Minimalista</option></select></label>
              <div className="card-editor-toggle-group">
                {[
                  ['softBorders', 'Bordas suaves'],
                  ['showSectionSeparators', 'Separadores'],
                  ['refinedAlignment', 'Alinhamento refinado'],
                  ['highlightHeader', 'Destaque do cabeçalho'],
                ].map(([field, label]) => (
                  <label className="card-editor-toggle" key={field}>
                    <input type="checkbox" checked={currentState.visualTheme[field as keyof typeof currentState.visualTheme] as boolean} onChange={(event) => handleThemeChange(field as keyof typeof currentState.visualTheme, event.target.checked)} />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>
              </div>
            </Card>
          ) : null}

          {activeSection === 'omr' ? (
            <Card className="card-editor-panel card-editor-panel--section">
              <div className="card-editor-section-panel__header">
                <h3>Leitura OMR</h3>
                <p>Revise o contrato operacional da leitura e abra o diagnóstico técnico só quando precisar dele.</p>
              </div>
              <div className="card-editor-section-panel__body">
            <div className="card-editor-omr-callouts">
              {validationErrors.length ? (
                <div className="status-banner status-banner--error">
                  <strong>Corrija estes pontos antes de publicar o template.</strong>
                  <span>{validationErrors.slice(0, 2).map((issue) => issue.message).join(' ')}</span>
                </div>
              ) : null}
              {validationWarnings.length ? (
                <div className="status-banner status-banner--warning">
                  <strong>Vale revisar antes de imprimir em escala.</strong>
                  <span>{validationWarnings.slice(0, 2).map((issue) => issue.message).join(' ')}</span>
                </div>
              ) : null}
              {!validationErrors.length && !validationWarnings.length ? (
                <div className="status-banner status-banner--success">
                  <strong>Perfil de leitura dentro da família operacional atual.</strong>
                  <span>Esse layout permanece alinhado com o contrato estável do piloto para leitura OMR.</span>
                </div>
              ) : null}
            </div>
            <div className="card-editor-grid card-editor-grid--two">
              <div className="card-editor-insight"><span>Perfil de leitura</span><strong>{currentReadMode === 'conservative' ? 'Conservador' : currentReadMode === 'sensitive' ? 'Sensível' : 'Equilibrado'}</strong><small>{currentReadMode === 'conservative' ? 'Prioriza segurança e exige marcas mais fortes.' : currentReadMode === 'sensitive' ? 'Capta marcas leves com mais sensibilidade.' : 'Equilibra segurança e flexibilidade para impressão comum.'}</small></div>
              <div className="card-editor-insight"><span>Nível de confiança esperado</span><strong>{confidenceLabel}</strong><small>Baseado na combinação atual entre sensibilidade e tolerância.</small></div>
              <div className="card-editor-insight"><span>Página e limites</span><strong>A4 seguro</strong><small>Cabeçalho, grade e rodapé permanecem dentro da zona técnica válida.</small></div>
              <div className="card-editor-insight"><span>Calibração automática</span><strong>Ativa</strong><small>Colunas, linhas, espaços e bolhas são recalculados quando a estrutura muda.</small></div>
            </div>
            <div className="card-editor-omr-detail">
              <button className="card-editor-advanced-toggle" type="button" onClick={() => setAdvancedOpen((current) => !current)}>
                <span>Diagnóstico técnico</span>
                <strong>{advancedOpen ? 'Ocultar' : 'Ver detalhes'}</strong>
              </button>
              {advancedOpen ? (
                <div className="card-editor-grid card-editor-grid--two card-editor-advanced-grid">
                  <div className="card-editor-readonly"><span>Início horizontal</span><strong>{currentState.omrConfig.startXRatio.toFixed(3)}</strong></div>
                  <div className="card-editor-readonly"><span>Início vertical</span><strong>{currentState.omrConfig.startYRatio.toFixed(3)}</strong></div>
                  <div className="card-editor-readonly"><span>Gap entre colunas</span><strong>{currentState.omrConfig.columnGapRatio.toFixed(3)}</strong></div>
                  <div className="card-editor-readonly"><span>Gap entre linhas</span><strong>{currentState.omrConfig.rowGapRatio.toFixed(3)}</strong></div>
                  <div className="card-editor-readonly"><span>Gap entre opções</span><strong>{currentState.omrConfig.optionGapRatio.toFixed(3)}</strong></div>
                  <div className="card-editor-readonly"><span>Raio da bolha</span><strong>{currentState.omrConfig.bubbleRadiusRatio.toFixed(3)}</strong></div>
                  <div className="card-editor-readonly"><span>Limiar de marcação</span><strong>{currentState.omrConfig.markThreshold.toFixed(2)}</strong></div>
                  <div className="card-editor-readonly"><span>Limiar de ambiguidade</span><strong>{currentState.omrConfig.ambiguityThreshold.toFixed(2)}</strong></div>
                  <div className="card-editor-readonly"><span>Margem segura</span><strong>{blueprint.page.safeMargin.toFixed(2)} pt</strong><small>{(blueprint.page.safeMargin / 28.35).toFixed(2)} cm em cada lado.</small></div>
                  <div className="card-editor-readonly"><span>Capacidade por página</span><strong>{blueprint.pagination.pageCapacity} questões</strong><small>{blueprint.pagination.rowsPerPage} linhas úteis por página.</small></div>
                  <div className="card-editor-readonly"><span>Área útil da grade</span><strong>{blueprint.answerZone.width} x {blueprint.answerZone.height} pt</strong><small>Zona reservada para respostas dentro da folha A4.</small></div>
                  <div className="card-editor-readonly"><span>Rodapé técnico</span><strong>{blueprint.footer.height} pt</strong><small>Logo, mensagem e QR em zonas fixas.</small></div>
                  <div className="card-editor-readonly"><span>Zona do QR</span><strong>{blueprint.footer.qr.width} x {blueprint.footer.qr.height} pt</strong><small>Bloco estável para leitura e vínculo do cartão.</small></div>
                  <div className="card-editor-readonly"><span>Âncora OMR</span><strong>{blueprint.omr.firstBubbleX}, {blueprint.omr.firstBubbleY}</strong><small>Primeira bolha da grade para futura calibração da API.</small></div>
                </div>
              ) : null}
            </div>
              </div>
            </Card>
          ) : null}

          {activeSection === 'savedTemplates' ? (
            <Card className="card-editor-panel card-editor-panel--section">
              <div className="card-editor-section-panel__header">
                <h3>Templates salvos</h3>
                <p>Abra um layout salvo da prova sem perder o contexto atual do editor.</p>
              </div>
              <div className="card-editor-section-panel__body">
            {isLoading ? <p>Carregando templates...</p> : null}
            {!isLoading && !templates.length ? (
              <div className="card-editor-empty-state">
                <strong>Nenhum template salvo ainda.</strong>
                <p>Salve este layout para criar uma base reutilizável da prova e voltar a ele depois sem refazer a configuração.</p>
              </div>
            ) : null}
            {templates.length ? (
              <ul className="card-editor-template-list">
                {templates.map((template) => (
                  <li key={template.id}>
                    <div>
                      <strong>{template.name}</strong>
                      <span>{template.definition.totalQuestions} questões - {template.definition.choicesPerQuestion} alternativas - {template.visualTheme.visualStyle} - {template.version}</span>
                    </div>
                    <Link to={`/app/units/${unitId}/classrooms/${classroomId}/exams/${examId}/layout/${template.id}/edit`}>
                      <Button variant="ghost">Usar</Button>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
              </div>
            </Card>
          ) : null}
            </div>
          </div>

          <footer className="card-editor-footer">
            <Button
              type="button"
              onClick={() => void handleSaveChanges()}
              disabled={isSaving || !hasUnsavedChanges}
              variant={hasUnsavedChanges ? 'primary' : 'secondary'}
            >
              {isSaving ? 'Salvando...' : 'Salvar alterações'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => void persistTemplate('duplicate')} disabled={isSaving || isLoading}>Duplicar</Button>
            <Button type="button" variant="ghost" onClick={handleRestorePreset}>Restaurar padrão</Button>
            <Button type="button" variant="ghost" onClick={handleRestoreLastValid} disabled={!lastValidStateRef.current}>Restaurar último válido</Button>
          </footer>
        </div>

        <aside className="card-editor-layout__preview">
          <Card className="card-editor-preview-card">
            <CardTemplatePreview
              state={currentState}
              unitName={selectedUnit?.name ?? 'Instituição'}
              classroomName={selectedClassroom?.name ?? 'Turma'}
              examName={selectedExam?.name ?? 'Prova'}
            />
          </Card>

          <Card className="card-editor-panel">
            <h3>Resumo técnico</h3>
            <div className="card-editor-technical-summary">
              <div className="card-editor-readonly"><span>Última questão renderizada</span><strong>{technicalSummary.lastRenderedQuestion || 0}</strong></div>
              <div className="card-editor-readonly"><span>Total efetivo</span><strong>{technicalSummary.totalRenderedQuestions}</strong></div>
              <div className="card-editor-readonly"><span>Blocos ativos</span><strong>{technicalSummary.activeBlocks}</strong></div>
              <div className="card-editor-readonly"><span>Questões fora dos blocos</span><strong>{technicalSummary.uncoveredQuestions}</strong></div>
              <div className="card-editor-readonly"><span>Lacunas</span><strong>{technicalSummary.gapCount}</strong></div>
              <div className="card-editor-readonly"><span>Sobreposições</span><strong>{technicalSummary.overlapCount}</strong></div>
            </div>
          </Card>

        </aside>
      </div>

      {showLeaveDialog ? (
        <div className="dialog-backdrop" role="presentation">
          <div className="dialog-card" role="dialog" aria-modal="true" aria-labelledby="leave-page-dialog-title">
            <h3 id="leave-page-dialog-title">Você fez alterações nas configurações. Deseja salvar antes de sair desta página?</h3>
            <p>Escolha se quer salvar as alterações atuais antes de navegar para outra área ou sair sem salvar.</p>
            <div className="dialog-actions">
              <Button type="button" variant="secondary" onClick={handleDiscardAndExit} disabled={isSaving}>
                Sair sem salvar
              </Button>
              <Button type="button" onClick={() => void handleSaveAndExit()} disabled={isSaving}>
                Salvar e sair
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowLeaveDialog(false)
                  pendingLocationRef.current = null
                  navigationBlocker.reset?.()
                }}
                disabled={isSaving}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {message || error ? (
        <div className="toast-stack" aria-live="polite" aria-atomic="true">
          {message ? (
            <div className="toast toast--success" role="status">
              <div className="toast__content">
                <strong>Status do editor</strong>
                <span>{message}</span>
              </div>
              <button type="button" className="toast__close" onClick={() => setMessage(null)} aria-label="Fechar aviso">
                x
              </button>
            </div>
          ) : null}

          {error ? (
            <div className="toast toast--error" role="alert">
              <div className="toast__content">
                <strong>Não foi possível concluir a ação.</strong>
                <span>{error}</span>
              </div>
              <button type="button" className="toast__close" onClick={() => setError(null)} aria-label="Fechar erro">
                x
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
