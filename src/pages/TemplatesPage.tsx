import { useEffect, useRef, useState } from 'react'
import { Link, useBlocker, useNavigate, useParams } from 'react-router-dom'
import type { Location } from 'react-router-dom'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { CardTemplatePreview } from '../components/CardTemplatePreview'
import { SectionTitle } from '../components/SectionTitle'
import { useAcademicScope } from '../hooks/useAcademicScope'
import { omrService } from '../services/omrService'
import type { CardPresetId, CardTemplateEditorState, CardTemplateValidationIssue, Template } from '../types/omr'
import { formatApiErrorMessage } from '../utils/display'
import { setSelectedExamId } from '../utils/domainSelection'
import {
  applySafeCardLayout,
  cardTemplatePresets,
  createEditorStateFromPreset,
  createEditorStateFromTemplate,
  getCardPresetById,
  getSafeStructureForCard,
} from '../utils/cardTemplatePresets'
import { getTemplateLayoutBlueprint } from '../utils/templateLayoutBlueprint'
import {
  getConfidenceLabel,
  getReadModeFromConfig,
  normalizeEditorState,
  validateCardTemplateEditorState,
} from '../utils/cardTemplateValidator'

type EditorSectionId =
  | 'savedTemplates'
  | 'structure'
  | 'studentIdentification'
  | 'header'
  | 'appearance'
  | 'omr'

type EditorSectionsState = Record<EditorSectionId, boolean>

type CollapsibleSectionProps = {
  id: EditorSectionId
  title: string
  description: string
  isOpen: boolean
  onToggle: (sectionId: EditorSectionId) => void
  children: React.ReactNode
}

type PersistTemplateOptions = {
  redirectOnCreate?: boolean
  successMessage?: string
}

function getTemplateTimestamp(template: Pick<Template, 'createdAt' | 'updatedAt'>) {
  return new Date(template.updatedAt ?? template.createdAt).getTime()
}

const defaultOpenSections: EditorSectionsState = {
  savedTemplates: false,
  structure: true,
  studentIdentification: false,
  header: false,
  appearance: false,
  omr: false,
}

function applyExamContext(state: CardTemplateEditorState, context: { unitName: string; classroomName: string; examName: string }) {
  const nextState = structuredClone(state)
  nextState.definition.header.institutionName = context.unitName || nextState.definition.header.institutionName
  nextState.definition.header.examName = context.examName || nextState.definition.header.examName
  nextState.definition.header.classroomLabel = context.classroomName || nextState.definition.header.classroomLabel
  nextState.name = nextState.name || context.examName || nextState.definition.header.examName
  return normalizeEditorState(nextState)
}

function getIssueSummary(issues: CardTemplateValidationIssue[]) {
  return {
    errors: issues.filter((issue) => issue.severity === 'error'),
    warnings: issues.filter((issue) => issue.severity === 'warning'),
    info: issues.filter((issue) => issue.severity === 'info'),
  }
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo da logo.'))
    reader.readAsDataURL(file)
  })
}

function getDistributionLabel(totalQuestions: number, choicesPerQuestion: 4 | 5, presetId: CardPresetId) {
  const safeStructure = getSafeStructureForCard(totalQuestions, choicesPerQuestion, presetId)
  const columnLabel = safeStructure.columns === 1 ? '1 coluna' : `${safeStructure.columns} colunas`
  const rowLabel = safeStructure.rowsPerColumn === 1 ? '1 linha por coluna' : `${safeStructure.rowsPerColumn} linhas por coluna`

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

function CollapsibleSection({ id, title, description, isOpen, onToggle, children }: CollapsibleSectionProps) {
  return (
    <Card className={`card-editor-section${isOpen ? ' card-editor-section--open' : ''}`}>
      <button className="card-editor-section__trigger" type="button" onClick={() => onToggle(id)} aria-expanded={isOpen}>
        <div className="card-editor-section__trigger-copy">
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <span className="card-editor-section__trigger-state">{isOpen ? 'Fechar' : 'Abrir'}</span>
      </button>

      {isOpen ? <div className="card-editor-section__body">{children}</div> : null}
    </Card>
  )
}

export function TemplatesPage() {
  const { unitId, classroomId, examId, templateId } = useParams()
  const navigate = useNavigate()
  const { selectedUnit, selectedClassroom, selectedExam } = useAcademicScope()
  const [templates, setTemplates] = useState<Template[]>([])
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(templateId ?? null)
  const [editorState, setEditorState] = useState<CardTemplateEditorState>(() => createEditorStateFromPreset('enem-a4'))
  const [openSections, setOpenSections] = useState<EditorSectionsState>(defaultOpenSections)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [showLeaveDialog, setShowLeaveDialog] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
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
        const response = await omrService.getTemplates()
        const examTemplates = response.items.filter((item) => item.examId === selectedExam.id)
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
  const issueSummary = getIssueSummary(validation.issues)
  const currentPreset = getCardPresetById(currentState.presetId)
  const currentReadMode = getReadModeFromConfig(currentState.omrConfig)
  const confidenceLabel = getConfidenceLabel(currentState.omrConfig)
  const blueprint = getTemplateLayoutBlueprint(currentState)
  const safeStructureLabel = getDistributionLabel(
    currentState.definition.totalQuestions,
    currentState.definition.choicesPerQuestion,
    currentState.presetId,
  )

  useEffect(() => {
    if (validation.isValid) lastValidStateRef.current = structuredClone(currentState)
  }, [currentState, validation.isValid])

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

  const toggleSection = (sectionId: EditorSectionId) => {
    setOpenSections((current) => ({ ...current, [sectionId]: !current[sectionId] }))
  }

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

  const handleHeaderChange = (field: keyof CardTemplateEditorState['definition']['header'], value: string | boolean) => {
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

  const handleRestorePreset = () => handlePresetChange(currentState.presetId)

  const handleRestoreLastValid = () => {
    if (!lastValidStateRef.current) return
    setEditorState(structuredClone(lastValidStateRef.current))
    setError(null)
    setMessage('Último estado válido restaurado.')
  }

  const refreshTemplates = async () => {
    if (!selectedExam) return
    const response = await omrService.getTemplates()
    setTemplates(response.items.filter((item) => item.examId === selectedExam.id))
  }

  const persistTemplate = async (mode: 'create' | 'update' | 'duplicate', options: PersistTemplateOptions = {}) => {
    if (!selectedExam) {
      setError('Selecione uma prova ativa antes de salvar o cartão.')
      return null
    }

    const payload = {
      name: mode === 'duplicate' ? `${currentState.name} Cópia` : currentState.name,
      examId: selectedExam.id,
      totalQuestions: currentState.definition.totalQuestions,
      presetId: currentState.presetId,
      definition: currentState.definition,
      visualTheme: currentState.visualTheme,
      omrConfig: currentState.omrConfig,
    }

    setIsSaving(true)
    setError(null)
    setMessage('Salvando alterações...')

    try {
      const response =
        mode === 'update' && activeTemplateId
          ? await omrService.updateTemplate(activeTemplateId, payload)
          : await omrService.createTemplate(payload)

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

  return (
    <section className="card-editor-page">
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

      <SectionTitle
        title={templateId ? 'Editar cartão-resposta' : 'Criar cartão-resposta'}
        subtitle="Ajuste o cartão-resposta, revise o preview e salve as alterações do layout."
      />

      <div className="card-editor-toolbar">
        <label className="field card-editor-toolbar__preset">
          <span>Preset</span>
          <select value={currentState.presetId} onChange={(event) => handlePresetChange(event.target.value as CardPresetId)}>
            {cardTemplatePresets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
          </select>
          <small>{currentPreset.description}</small>
        </label>

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
          <Button variant="ghost" type="button" onClick={() => toggleSection('savedTemplates')}>
            {openSections.savedTemplates ? 'Fechar templates salvos' : 'Usar templates salvos'}
          </Button>
          <Button type="button" variant="ghost" onClick={handleRestorePreset}>Restaurar padrão</Button>
          <Button type="button" variant="ghost" onClick={handleRestoreLastValid} disabled={!lastValidStateRef.current}>Último estado válido</Button>
        </div>
      </div>

      <div className="inline-actions page-actions">
        <Link to={`/app/units/${unitId}/classrooms/${classroomId}/exams/${examId}`}>
          <Button variant="secondary">Voltar para a prova</Button>
        </Link>
      </div>

      <div className="card-editor-layout">
        <div className="card-editor-layout__controls">
          <CollapsibleSection id="structure" title="Estrutura da prova" description="Defina a base do cartão: nome, número de questões, alternativas e distribuição." isOpen={openSections.structure} onToggle={toggleSection}>
            <div className="card-editor-grid card-editor-grid--two">
              <label className="field">
                <span>Nome do template</span>
                <input value={currentState.name} onChange={(event) => applyState((current) => ({ ...current, name: event.target.value }))} />
                <small>Nome interno para identificar e reutilizar este cartão.</small>
              </label>
              <label className="field">
                <span>Quantidade de questões</span>
                <input type="number" min="1" value={currentState.definition.totalQuestions} onChange={(event) => handleFriendlyStructureChange('totalQuestions', Number(event.target.value))} />
                <small>As linhas por coluna serão recalculadas automaticamente.</small>
              </label>
              <label className="field">
                <span>Alternativas por questão</span>
                <select value={currentState.definition.choicesPerQuestion} onChange={(event) => handleFriendlyStructureChange('choicesPerQuestion', Number(event.target.value) as 4 | 5)}>
                  <option value="4">4 alternativas</option>
                  <option value="5">5 alternativas</option>
                </select>
                <small>O espaçamento e o tamanho das bolhas são recalculados automaticamente.</small>
              </label>
              <div className="card-editor-insight">
                <span>Distribuição automática</span>
                <strong>{safeStructureLabel}</strong>
                <small>A grade é sempre organizada dentro da área segura da folha A4.</small>
              </div>
              <label className="field">
                <span>Numeração</span>
                <select value={currentState.definition.numberingMode} onChange={(event) => handleFriendlyStructureChange('numberingMode', event.target.value as 'continuous' | 'by-block')}>
                  <option value="continuous">Contínua</option>
                  <option value="by-block">Por bloco</option>
                </select>
              </label>
              {currentState.definition.numberingMode === 'by-block' ? (
                <label className="field">
                  <span>Padrão da numeração</span>
                  <select value={currentState.definition.numberingPattern} onChange={(event) => handleFriendlyStructureChange('numberingPattern', event.target.value as 'row-column' | 'sequence-column')}>
                    <option value="row-column">15A, 15B, 15C</option>
                    <option value="sequence-column">1A, 2A, 3A</option>
                  </select>
                  <small>Escolha como o bloco deve aparecer visualmente ao lado das bolhas.</small>
                </label>
              ) : (
                <div className="card-editor-insight">
                  <span>Padrão da numeração</span>
                  <strong>1, 2, 3...</strong>
                  <small>Na numeração contínua, a sequência segue a ordem normal da prova.</small>
                </div>
              )}
              <div className="card-editor-toggle-group">
                <label className="card-editor-toggle">
                  <input type="checkbox" checked={currentState.definition.groupByArea} onChange={(event) => handleFriendlyStructureChange('groupByArea', event.target.checked)} />
                  <span>Agrupar por áreas</span>
                </label>
                <label className="card-editor-toggle">
                  <input type="checkbox" checked={currentState.definition.showBlockTitles} onChange={(event) => handleFriendlyStructureChange('showBlockTitles', event.target.checked)} />
                  <span>Mostrar títulos de blocos</span>
                </label>
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection id="studentIdentification" title="Identificação do aluno" description="Escolha os campos de identificação que realmente precisam aparecer no cartão." isOpen={openSections.studentIdentification} onToggle={toggleSection}>
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
          </CollapsibleSection>

          <CollapsibleSection id="header" title="Cabeçalho e informações" description="Ajuste o conteúdo institucional e os textos visíveis do topo do cartão." isOpen={openSections.header} onToggle={toggleSection}>
            <div className="card-editor-grid card-editor-grid--two">
              <label className="field"><span>Nome da instituição</span><input value={currentState.definition.header.institutionName} onChange={(event) => handleHeaderChange('institutionName', event.target.value)} /></label>
              <label className="field"><span>Nome da prova</span><input value={currentState.definition.header.examName} onChange={(event) => handleHeaderChange('examName', event.target.value)} /></label>
              <label className="field"><span>Subtítulo</span><input value={currentState.definition.header.subtitle} onChange={(event) => handleHeaderChange('subtitle', event.target.value)} /></label>
              <label className="field"><span>Label da turma</span><input value={currentState.definition.header.classroomLabel} onChange={(event) => handleHeaderChange('classroomLabel', event.target.value)} /></label>
              <label className="field card-editor-grid__full"><span>Instruções de preenchimento</span><textarea rows={3} value={currentState.definition.header.instructions} onChange={(event) => handleHeaderChange('instructions', event.target.value)} /></label>
              <label className="field card-editor-grid__full"><span>Texto de orientação OMR</span><textarea rows={2} value={currentState.definition.header.omrGuidance} onChange={(event) => handleHeaderChange('omrGuidance', event.target.value)} /></label>
              <label className="field card-editor-grid__full"><span>Frase do rodapé</span><input value={currentState.definition.header.footerMessage} onChange={(event) => handleHeaderChange('footerMessage', event.target.value)} placeholder="Ex.: Simulado oficial - 1º dia" /><small>Esse texto aparece no espaço central do rodapé técnico do cartão.</small></label>
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
                        className="card-editor-logo-upload__preview"
                      />
                    ) : (
                      <div className="card-editor-logo-upload__placeholder">Nenhuma logo enviada ainda.</div>
                    )}
                    <label className="field card-editor-logo-upload__field">
                      <span>Arquivo da logo</span>
                      <input type="file" accept="image/png,image/jpeg,image/jpg" onChange={(event) => void handleInstitutionLogoUpload(event.target.files?.[0] ?? null)} />
                      <small>Use PNG ou JPG com boa resolução. A imagem é salva junto com o layout.</small>
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
          </CollapsibleSection>

          <CollapsibleSection id="appearance" title="Aparência" description="Controle o estilo visual do cartão sem tirar o preview do lugar." isOpen={openSections.appearance} onToggle={toggleSection}>
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
          </CollapsibleSection>

          <CollapsibleSection id="omr" title="Leitura OMR" description="Veja o perfil de leitura e abra os diagnósticos técnicos quando precisar." isOpen={openSections.omr} onToggle={toggleSection}>
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
          </CollapsibleSection>

          <CollapsibleSection
            id="savedTemplates"
            title="Templates salvos"
            description="Abra para escolher rapidamente um template já salvo nesta prova."
            isOpen={openSections.savedTemplates}
            onToggle={toggleSection}
          >
            {isLoading ? <p>Carregando templates...</p> : null}
            {!isLoading && !templates.length ? <p>Nenhum template salvo ainda.</p> : null}
            {templates.length ? (
              <ul className="card-editor-template-list">
                {templates.map((template) => (
                  <li key={template.id}>
                    <div>
                      <strong>{template.name}</strong>
                      <span>{template.definition.totalQuestions} questões - {template.definition.choicesPerQuestion} alternativas - {template.visualTheme.visualStyle}</span>
                    </div>
                    <Link to={`/app/units/${unitId}/classrooms/${classroomId}/exams/${examId}/layout/${template.id}/edit`}>
                      <Button variant="ghost">Usar</Button>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </CollapsibleSection>

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
            <h3>Validação do cartão</h3>
            {issueSummary.errors.length ? (
              <ul className="card-editor-issue-list card-editor-issue-list--error">
                {issueSummary.errors.map((issue) => <li key={issue.code}>{issue.message}</li>)}
              </ul>
            ) : (
              <p className="feedback feedback--success">Nenhum erro crítico detectado no layout atual.</p>
            )}
            {issueSummary.warnings.length ? (
              <ul className="card-editor-issue-list card-editor-issue-list--warning">
                {issueSummary.warnings.map((issue) => <li key={issue.code}>{issue.message}</li>)}
              </ul>
            ) : null}
            {issueSummary.info.length ? (
              <ul className="card-editor-issue-list card-editor-issue-list--info">
                {issueSummary.info.map((issue) => <li key={issue.code}>{issue.message}</li>)}
              </ul>
            ) : null}
            {message ? <p className="feedback feedback--success">{message}</p> : null}
            {error ? <p className="feedback feedback--error">{error}</p> : null}
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
    </section>
  )
}
