import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
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
  id: Exclude<EditorSectionId, 'savedTemplates'> | 'savedTemplates'
  title: string
  description: string
  isOpen: boolean
  onToggle: (sectionId: EditorSectionId) => void
  children: React.ReactNode
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

function getDistributionLabel(totalQuestions: number, choicesPerQuestion: 4 | 5, presetId: CardPresetId) {
  const safeStructure = getSafeStructureForCard(totalQuestions, choicesPerQuestion, presetId)
  const columnLabel = safeStructure.columns === 1 ? '1 coluna' : `${safeStructure.columns} colunas`
  const rowLabel = safeStructure.rowsPerColumn === 1 ? '1 linha por coluna' : `${safeStructure.rowsPerColumn} linhas por coluna`

  return `${columnLabel} | ${rowLabel}`
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
  const [editorState, setEditorState] = useState<CardTemplateEditorState>(() => createEditorStateFromPreset('enem-a4'))
  const [openSections, setOpenSections] = useState<EditorSectionsState>(defaultOpenSections)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const lastValidStateRef = useRef<CardTemplateEditorState | null>(null)

  useEffect(() => {
    if (examId) setSelectedExamId(examId)
  }, [examId])

  useEffect(() => {
    if (!selectedExam) return

    const loadTemplates = async () => {
      setIsLoading(true)

      try {
        const response = await omrService.getTemplates()
        const examTemplates = response.items.filter((item) => item.examId === selectedExam.id)
        setTemplates(examTemplates)

        const context = {
          unitName: selectedUnit?.name ?? 'Instituição',
          classroomName: selectedClassroom?.name ?? 'Turma',
          examName: selectedExam.name,
        }

        if (templateId) {
          const currentTemplate = examTemplates.find((item) => item.id === templateId)
          if (currentTemplate) {
            setEditorState(normalizeEditorState(createEditorStateFromTemplate(currentTemplate)))
            setMessage(null)
            setError(null)
          }
        } else {
          setEditorState((current) => applyExamContext(current, context))
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
  const issueSummary = getIssueSummary(validation.issues)
  const currentPreset = getCardPresetById(currentState.presetId)
  const currentReadMode = getReadModeFromConfig(currentState.omrConfig)
  const confidenceLabel = getConfidenceLabel(currentState.omrConfig)
  const safeStructureLabel = getDistributionLabel(
    currentState.definition.totalQuestions,
    currentState.definition.choicesPerQuestion,
    currentState.presetId,
  )

  useEffect(() => {
    if (validation.isValid) lastValidStateRef.current = structuredClone(currentState)
  }, [currentState, validation.isValid])

  const toggleSection = (sectionId: EditorSectionId) => {
    setOpenSections((current) => ({ ...current, [sectionId]: !current[sectionId] }))
  }

  const applyState = (updater: (current: CardTemplateEditorState) => CardTemplateEditorState) => {
    setEditorState((current) => validateCardTemplateEditorState(updater(current)).sanitizedState)
    setError(null)
    setMessage(null)
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

  const persistTemplate = async (mode: 'create' | 'update' | 'duplicate') => {
    if (!selectedExam) {
      setError('Selecione uma prova ativa antes de salvar o cartão.')
      return
    }

    if (!validation.isValid) {
      setError('Corrija os erros do layout antes de salvar o template.')
      return
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
    setMessage(null)

    try {
      const response =
        mode === 'update' && templateId
          ? await omrService.updateTemplate(templateId, payload)
          : await omrService.createTemplate(payload)

      await refreshTemplates()
      setEditorState(createEditorStateFromTemplate(response.item))
      setMessage(
        mode === 'duplicate'
          ? `Template ${response.item.name} duplicado com sucesso.`
          : `Template ${response.item.name} salvo com sucesso.`,
      )

      if (mode !== 'update') {
        navigate(`/app/units/${unitId}/classrooms/${classroomId}/exams/${examId}/layout/${response.item.id}/edit`, { replace: true })
      }
    } catch (saveError) {
      setError(formatApiErrorMessage('Não foi possível salvar o template.', saveError))
    } finally {
      setIsSaving(false)
    }
  }

  const handleGeneratePdf = async () => {
    if (!validation.isValid) {
      setError('Corrija os erros do layout antes de gerar o PDF.')
      return
    }

    setIsGeneratingPdf(true)
    setError(null)
    setMessage(null)

    try {
      const { generateTemplateLayoutPdf } = await import('../utils/templateLayoutPdf')
      const { pdfBytes, fileName } = await generateTemplateLayoutPdf({
        title: currentState.name,
        examName: currentState.definition.header.examName,
        classroomName: selectedClassroom?.name ?? 'Turma',
        unitName: selectedUnit?.name ?? 'Instituição',
        state: currentState,
      })

      const pdfBuffer = new Uint8Array(pdfBytes.byteLength)
      pdfBuffer.set(pdfBytes)
      const blob = new Blob([pdfBuffer], { type: 'application/pdf' })
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = fileName
      link.click()
      URL.revokeObjectURL(objectUrl)

      setMessage(`PDF ${fileName} gerado com sucesso.`)
    } catch (generationError) {
      setError(formatApiErrorMessage('Não foi possível gerar o PDF do cartão.', generationError))
    } finally {
      setIsGeneratingPdf(false)
    }
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
        subtitle="Editor modular de cartões com seções recolhíveis, presets inteligentes e leitura OMR protegida."
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
          <Button variant="secondary" onClick={() => void persistTemplate(templateId ? 'update' : 'create')} disabled={isSaving || !validation.isValid}>
            {isSaving ? 'Salvando...' : 'Salvar template'}
          </Button>
          <Button variant="secondary" onClick={() => void persistTemplate('duplicate')} disabled={isSaving || isLoading}>
            Duplicar template
          </Button>
          <Button variant="ghost" type="button" onClick={() => toggleSection('savedTemplates')}>
            {openSections.savedTemplates ? 'Fechar templates salvos' : 'Usar templates salvos'}
          </Button>
          <Button variant="ghost" onClick={handleRestorePreset}>Restaurar padrão</Button>
          <Button variant="ghost" onClick={handleRestoreLastValid} disabled={!lastValidStateRef.current}>Último estado válido</Button>
          <Button onClick={handleGeneratePdf} disabled={isGeneratingPdf || !validation.isValid}>
            {isGeneratingPdf ? 'Gerando PDF...' : 'Gerar PDF'}
          </Button>
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
              <label className="card-editor-toggle"><input type="checkbox" checked={currentState.definition.header.showInstitutionLogo} onChange={(event) => handleHeaderChange('showInstitutionLogo', event.target.checked)} /><span>Reservar área para logo institucional</span></label>
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
            <Button variant="secondary" onClick={() => void persistTemplate(templateId ? 'update' : 'create')} disabled={isSaving || !validation.isValid}>{isSaving ? 'Salvando...' : 'Salvar template'}</Button>
            <Button variant="secondary" onClick={() => void persistTemplate('duplicate')} disabled={isSaving || isLoading}>Duplicar</Button>
            <Button variant="ghost" onClick={handleRestorePreset}>Restaurar padrão</Button>
            <Button variant="ghost" onClick={handleRestoreLastValid} disabled={!lastValidStateRef.current}>Restaurar último válido</Button>
            <Button onClick={handleGeneratePdf} disabled={isGeneratingPdf || !validation.isValid}>{isGeneratingPdf ? 'Gerando PDF...' : 'Gerar PDF'}</Button>
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
    </section>
  )
}
