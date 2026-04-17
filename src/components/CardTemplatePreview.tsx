import type { CardTemplateEditorState } from '../types/omr'
import { getCardTemplateZones } from '../utils/cardTemplateZones'
import { getFooterMessageAnchor, wrapFooterMessage } from '../utils/footerMessageLayout'
import { getLogoBoxPlacement } from '../utils/logoLayout'
import { buildNormalizedRenderModel, getQuestionBlockQuestionConfig } from '../utils/questionBlocks'
import { formatQuestionLabel } from '../utils/questionNumbering'
import { estimateTextWidth, getLabelTextFontSize, getTemplateRenderMetrics } from '../utils/templateRenderMetrics'
import { TEMPLATE_PAGE_HEIGHT, TEMPLATE_PAGE_WIDTH, TEMPLATE_PAGE_X, TEMPLATE_PAGE_Y } from '../utils/templateLayoutGeometry'
import { getPaginatedTemplatePages } from '../utils/templatePageLayout'

type CardTemplatePreviewProps = {
  state: CardTemplateEditorState
  unitName: string
  classroomName: string
  examName: string
}

const PREVIEW_MARGIN = 3

function getQuestionStyleStrokeWidth(style: 'classic' | 'lined' | 'minimal', baseWidth: number) {
  if (style === 'minimal') return Math.max(0.6, baseWidth - 0.35)
  if (style === 'lined') return baseWidth + 0.15
  return baseWidth
}

function getQuestionStyleLabelColor(style: 'classic' | 'lined' | 'minimal') {
  if (style === 'minimal') return '#94a3b8'
  if (style === 'lined') return '#475569'
  return '#64748b'
}

function getThemePalette(style: CardTemplateEditorState['visualTheme']['visualStyle']) {
  switch (style) {
    case 'vestibular':
      return {
        accent: '#0f766e',
        title: '#042f2e',
        stroke: '#99f6e4',
        text: '#134e4a',
      }
    case 'compact':
      return {
        accent: '#334155',
        title: '#0f172a',
        stroke: '#cbd5e1',
        text: '#334155',
      }
    default:
      return {
        accent: '#0f766e',
        title: '#0f172a',
        stroke: '#99f6e4',
        text: '#134e4a',
      }
  }
}

export function CardTemplatePreview({ state, classroomName, examName }: CardTemplatePreviewProps) {
  const { definition, visualTheme } = state
  const renderModel = buildNormalizedRenderModel(definition)
  const zones = getCardTemplateZones(state)
  const palette = getThemePalette(visualTheme.visualStyle)
  const sectionStroke = visualTheme.showSectionSeparators ? palette.stroke : '#d6dbe4'
  const topInstruction =
    definition.header.instructions || 'Marque apenas uma alternativa e preencha todo o campo da bolinha'
  const previewStudentCode = 'ST-001'
  const pages = getPaginatedTemplatePages(state)
  const totalPages = pages.length
  const previewViewBox = [
    TEMPLATE_PAGE_X - PREVIEW_MARGIN,
    TEMPLATE_PAGE_Y - PREVIEW_MARGIN,
    TEMPLATE_PAGE_WIDTH + PREVIEW_MARGIN * 2,
    TEMPLATE_PAGE_HEIGHT + PREVIEW_MARGIN * 2,
  ].join(' ')
  const logoBoxX = zones.footer.logoX
  const logoBoxY = zones.footer.top + 16
  const logoBoxWidth = zones.footer.logoWidth
  const logoBoxHeight = 38
  const logoPlacement = getLogoBoxPlacement(definition.header, {
    x: logoBoxX,
    y: logoBoxY,
    width: logoBoxWidth,
    height: logoBoxHeight,
  })
  const footerFontSize = definition.header.footerMessageFontSize
  const footerLineGap = footerFontSize + 1.5
  const footerMaxChars = Math.max(16, Math.round(32 - (footerFontSize - 7) * 3))
  const footerLines = wrapFooterMessage(definition.header.footerMessage, { maxCharsPerLine: footerMaxChars, maxLines: 2 })
  const footerTextAnchor = getFooterMessageAnchor(definition.header.footerMessageAlignment)
  const footerTextX =
    definition.header.footerMessageAlignment === 'left'
      ? zones.footer.centerX + 8
      : definition.header.footerMessageAlignment === 'right'
        ? zones.footer.centerX + zones.footer.centerWidth - 8
        : zones.footer.centerAnchorX
  const pageTextY = definition.header.footerPagePosition === 'top' ? zones.footer.top + 22 : zones.footer.bottom - 8
  const footerMessageStartY = definition.header.footerPagePosition === 'top' ? zones.footer.top + 42 : zones.footer.top + 30

  return (
    <div className="card-editor-preview">
      <div className="card-editor-preview__header">
        <h3>Preview do cartão</h3>
        <div className="card-editor-preview__chips">
          <span>{renderModel.totalRenderedQuestions} questões</span>
          <span>{definition.enableQuestionBlocks ? 'alternativas por seção' : `${definition.choicesPerQuestion} alternativas`}</span>
          <span>{definition.columns} colunas</span>
          <span>
            {totalPages} {totalPages === 1 ? 'página' : 'páginas'}
          </span>
        </div>
      </div>

      <div className="card-editor-preview__frame">
        <div className="card-editor-preview__pages">
          {pages.map(({ pageIndex, metrics, questions, blockTitles, labels }) => {
            const renderMetrics = getTemplateRenderMetrics(metrics)
            const previewQrSize = renderMetrics.previewQrSize
            const previewQrX = zones.footer.codeBoxX + (zones.footer.codeBoxWidth - previewQrSize) / 2

            return (
            <div className="card-editor-preview__page-sheet" key={`page-${pageIndex}`}>
              <svg
                className="card-editor-preview__svg"
                viewBox={previewViewBox}
                role="img"
                aria-label={`Preview do template ${state.name} - página ${pageIndex + 1}`}
              >
                <defs>
                  <filter id={`preview-logo-mono-${pageIndex}`}>
                    <feColorMatrix
                      type="matrix"
                      values="0.299 0.587 0.114 0 0 0.299 0.587 0.114 0 0 0.299 0.587 0.114 0 0 0 0 0 1 0"
                    />
                    <feComponentTransfer>
                      <feFuncR type="discrete" tableValues="0 1" />
                      <feFuncG type="discrete" tableValues="0 1" />
                      <feFuncB type="discrete" tableValues="0 1" />
                    </feComponentTransfer>
                  </filter>
                </defs>

                <rect
                  x={TEMPLATE_PAGE_X}
                  y={TEMPLATE_PAGE_Y}
                  width={TEMPLATE_PAGE_WIDTH}
                  height={TEMPLATE_PAGE_HEIGHT}
                  rx={visualTheme.softBorders ? 18 : 8}
                  fill="#ffffff"
                  stroke="#d4dae3"
                  strokeWidth="1"
                />

                <g>
                  {[
                    ['Aluno', 'Aluno'],
                    ['Teste', examName || 'Prova'],
                    ['Classe', classroomName || 'Turma'],
                    ['Código', previewStudentCode],
                  ].map(([field, value], index) => {
                    const columnIndex = index % zones.info.columns
                    const rowIndex = Math.floor(index / zones.info.columns)
                    const cellWidth = zones.info.width / zones.info.columns
                    const fieldX = zones.info.x + columnIndex * cellWidth + 4
                    const fieldY = zones.info.y + 14 + rowIndex * 20

                    return (
                      <g key={`${field}-${index}`}>
                        <text x={fieldX} y={fieldY} className="card-editor-preview__field-label" fill={palette.title}>
                          {field}:
                        </text>
                        <text
                          x={fieldX + renderMetrics.fieldValueOffsetX}
                          y={fieldY}
                          className="card-editor-preview__body"
                          fill="#475569"
                          style={{ fontSize: `${renderMetrics.fieldValueFontSize}px` }}
                        >
                          {value}
                        </text>
                      </g>
                    )
                  })}
                </g>

                {definition.header.showInstructions ? (
                  <text
                    x={zones.instructions.x + zones.instructions.width / 2}
                    y={zones.instructions.y + renderMetrics.instructionOffsetY}
                    textAnchor="middle"
                    className="card-editor-preview__body"
                    fill="#334155"
                    style={{ fontSize: `${renderMetrics.instructionFontSize}px` }}
                  >
                    {topInstruction}
                  </text>
                ) : null}

                {blockTitles.map((blockTitle) => {
                  const titleWidth = estimateTextWidth(blockTitle.title, renderMetrics.blockTitleFontSize, 'bold')
                  const titleX = blockTitle.x + renderMetrics.blockTitlePaddingX
                  return (
                    <g key={`block-title-${pageIndex}-${blockTitle.startQuestion}`}>
                      <rect
                        x={titleX - 4}
                        y={blockTitle.y}
                        width={titleWidth + 8}
                        height={blockTitle.sectionHeight}
                        fill="#ffffff"
                      />
                      <text
                        x={titleX}
                        y={blockTitle.textY}
                        textAnchor="start"
                        className="card-editor-preview__question"
                        fill={palette.title}
                        style={{ fontSize: `${renderMetrics.blockTitleFontSize}px`, fontWeight: 700 }}
                      >
                        {blockTitle.title}
                      </text>
                    </g>
                  )
                })}

                {labels.map((label) => {
                  const labelX =
                    label.align === 'center'
                      ? label.x + label.width / 2
                      : label.align === 'right'
                        ? label.x + label.width
                        : label.x
                  const textAnchor = label.align === 'center' ? 'middle' : label.align === 'right' ? 'end' : 'start'
                  const labelFontSize = getLabelTextFontSize(label.size)

                  return (
                    <text
                      key={`label-${pageIndex}-${label.id}`}
                      x={labelX}
                      y={label.textY}
                      textAnchor={textAnchor}
                      className="card-editor-preview__question"
                      fill={palette.title}
                      style={{ fontSize: `${labelFontSize}px`, fontWeight: 700 }}
                    >
                      {label.text}
                    </text>
                  )
                })}

                {questions.map((question) => (
                  <g key={`question-${pageIndex}-${question.questionNumber}`}>
                    {(() => {
                      const questionLabel = formatQuestionLabel(question.numberingFormat, question, {
                        choicesPerQuestion: question.choicesPerQuestion,
                        blockStartQuestion: question.blockStartQuestion,
                        localQuestionIndex: question.localQuestionIndex,
                      })
                      const questionLabelWidth = estimateTextWidth(questionLabel, renderMetrics.questionFontSize)
                      return (
                    <text
                      x={question.labelX - questionLabelWidth}
                      y={question.labelY + renderMetrics.questionOffsetY}
                      className="card-editor-preview__question"
                      fill="#475569"
                      style={{ fontSize: `${renderMetrics.questionFontSize}px` }}
                    >
                      {questionLabel}
                    </text>
                      )
                    })()}

                    {(() => {
                      const blockConfig = getQuestionBlockQuestionConfig(definition, question.questionNumber)
                      return blockConfig.optionLabels.map((option, optionIndex) => (
                        <g key={`${pageIndex}-${question.questionNumber}-${option}`}>
                          <circle
                            cx={question.optionStartX + optionIndex * question.optionSpacing}
                            cy={question.optionY}
                            r={metrics.bubbleRadius}
                            fill="#ffffff"
                            stroke={palette.title}
                            strokeWidth={getQuestionStyleStrokeWidth(blockConfig.questionStyle, renderMetrics.bubbleStrokeWidthPreview)}
                          />
                          <text
                            x={question.optionStartX + optionIndex * question.optionSpacing}
                            y={question.optionY + renderMetrics.bubbleLabelOffsetY}
                            textAnchor="middle"
                            className="card-editor-preview__question"
                            fill={getQuestionStyleLabelColor(blockConfig.questionStyle)}
                            style={{ fontSize: `${renderMetrics.bubbleLabelFontSize}px` }}
                          >
                            {option}
                          </text>
                        </g>
                      ))
                    })()}
                  </g>
                ))}

                <line
                  x1={zones.footer.left}
                  y1={zones.footer.top}
                  x2={zones.footer.right}
                  y2={zones.footer.top}
                  stroke={sectionStroke}
                  strokeWidth="1"
                />

                {definition.header.showInstitutionLogo ? (
                  definition.header.institutionLogoDataUrl ? (
                    <image
                      href={definition.header.institutionLogoDataUrl}
                      x={logoPlacement.x}
                      y={logoPlacement.y}
                      width={logoPlacement.width}
                      height={logoPlacement.height}
                      preserveAspectRatio="xMidYMid meet"
                      filter={definition.header.logoMonochrome ? `url(#preview-logo-mono-${pageIndex})` : undefined}
                    />
                  ) : (
                    <rect
                      x={logoBoxX}
                      y={logoBoxY}
                      width={logoBoxWidth}
                      height="38"
                      rx="8"
                      fill="#ffffff"
                      stroke="#dbe2ea"
                      strokeDasharray="6 4"
                    />
                  )
                ) : null}

                {footerLines.length ? (
                  <text
                    x={footerTextX}
                    y={footerMessageStartY}
                    textAnchor={footerTextAnchor}
                    className={`card-editor-preview__tiny${definition.header.footerMessageWeight === 'semibold' ? ' card-editor-preview__tiny--strong' : ''}`}
                    fill="#475569"
                    style={{ fontSize: `${footerFontSize}px` }}
                  >
                    {footerLines.map((line, index) => (
                      <tspan key={`${line}-${index}`} x={footerTextX} dy={index === 0 ? 0 : footerLineGap}>
                        {line}
                      </tspan>
                    ))}
                  </text>
                ) : null}
                <text
                  x={zones.footer.centerAnchorX}
                  y={pageTextY}
                  textAnchor="middle"
                  className={`card-editor-preview__tiny${definition.header.footerPageTone === 'standard' ? ' card-editor-preview__tiny--strong' : ''}`}
                  fill={definition.header.footerPageTone === 'standard' ? '#475569' : '#64748b'}
                >
                  Página {pageIndex + 1}/{totalPages}
                </text>

                <line
                  x1={zones.footer.signatureX}
                  y1={zones.footer.top + 34}
                  x2={zones.footer.signatureX + zones.footer.signatureWidth}
                  y2={zones.footer.top + 34}
                  stroke={definition.identification.showSignature ? sectionStroke : '#ffffff'}
                  strokeWidth="1.5"
                />
                {definition.identification.showSignature ? (
                  <text
                    x={zones.footer.signatureX + 70}
                    y={zones.footer.top + 54}
                    className="card-editor-preview__meta"
                    fill={palette.title}
                    style={{ fontSize: `${renderMetrics.signatureLabelFontSize}px` }}
                  >
                    Assinatura do aluno
                  </text>
                ) : null}

                {definition.identification.showExamCode ? (
                  <g>
                    {(() => {
                      const cardIdWidth = estimateTextWidth(previewStudentCode, renderMetrics.cardIdFontSize, 'bold')
                      const qrCenterX = previewQrX + previewQrSize / 2
                      return (
                    <text
                      x={qrCenterX - cardIdWidth / 2}
                      y={zones.footer.top + 22}
                      className="card-editor-preview__meta"
                      fill={palette.title}
                      style={{ fontSize: `${renderMetrics.cardIdFontSize}px`, fontWeight: 700 }}
                    >
                      {previewStudentCode}
                    </text>
                      )
                    })()}
                    <rect
                      x={previewQrX}
                      y={zones.footer.top + renderMetrics.previewQrTop}
                      width={previewQrSize}
                      height={previewQrSize}
                      fill="#ffffff"
                    />
                    <path
                      d={`M ${previewQrX + 11} ${zones.footer.top + 37} h 14 v 14 h -14 z
                          M ${previewQrX + 53} ${zones.footer.top + 37} h 14 v 14 h -14 z
                          M ${previewQrX + 11} ${zones.footer.top + 79} h 14 v 14 h -14 z
                          M ${previewQrX + 34} ${zones.footer.top + 51} h 8 v 8 h -8 z
                          M ${previewQrX + 50} ${zones.footer.top + 63} h 8 v 8 h -8 z
                          M ${previewQrX + 38} ${zones.footer.top + 81} h 10 v 10 h -10 z`}
                      fill={palette.title}
                    />
                  </g>
                ) : null}
              </svg>
            </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

