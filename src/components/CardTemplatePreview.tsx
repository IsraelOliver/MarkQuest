import type { CardTemplateEditorState } from '../types/omr'
import { getCardTemplateZones } from '../utils/cardTemplateZones'
import {
  getTemplateLayoutMetrics,
  TEMPLATE_PAGE_HEIGHT,
  TEMPLATE_PAGE_WIDTH,
  TEMPLATE_PAGE_X,
  TEMPLATE_PAGE_Y,
} from '../utils/templateLayoutGeometry'

type CardTemplatePreviewProps = {
  state: CardTemplateEditorState
  unitName: string
  classroomName: string
  examName: string
}

const PREVIEW_MARGIN = 3

function getThemePalette(style: CardTemplateEditorState['visualTheme']['visualStyle']) {
  switch (style) {
    case 'vestibular':
      return {
        accent: '#0f766e',
        accentSoft: '#ccfbf1',
        title: '#042f2e',
        stroke: '#99f6e4',
        text: '#134e4a',
      }
    case 'compact':
      return {
        accent: '#334155',
        accentSoft: '#e2e8f0',
        title: '#0f172a',
        stroke: '#cbd5e1',
        text: '#334155',
      }
    default:
      return {
        accent: '#0f766e',
        accentSoft: '#ccfbf1',
        title: '#0f172a',
        stroke: '#99f6e4',
        text: '#134e4a',
      }
  }
}

export function CardTemplatePreview({ state, unitName, classroomName, examName }: CardTemplatePreviewProps) {
  const { definition, visualTheme } = state
  const zones = getCardTemplateZones(state)
  const baseMetrics = getTemplateLayoutMetrics(state.omrConfig)
  const palette = getThemePalette(visualTheme.visualStyle)
  const sectionStroke = visualTheme.showSectionSeparators ? palette.stroke : '#d6dbe4'
  const guideLineStroke = visualTheme.answerGridStyle === 'minimal' ? '#e2e8f0' : '#d9e2ec'
  const headerTitle = definition.header.examName || examName
  const topInstruction =
    definition.header.instructions || 'Marque assim: bolha totalmente preenchida. Não marque assim: X, círculo parcial ou check.'
  const footerCode = `COD-${definition.totalQuestions}`
  const availableAnswerHeight = zones.answers.bottom - baseMetrics.questionStartY
  const fittedRowsPerColumn = Math.max(1, Math.floor(availableAnswerHeight / baseMetrics.rowOffset) + 1)
  const fittedCapacity = Math.max(1, fittedRowsPerColumn * definition.columns)
  const totalPages = Math.max(1, Math.ceil(definition.totalQuestions / fittedCapacity))
  const previewViewBox = [
    TEMPLATE_PAGE_X - PREVIEW_MARGIN,
    TEMPLATE_PAGE_Y - PREVIEW_MARGIN,
    TEMPLATE_PAGE_WIDTH + PREVIEW_MARGIN * 2,
    TEMPLATE_PAGE_HEIGHT + PREVIEW_MARGIN * 2,
  ].join(' ')

  const pages = Array.from({ length: totalPages }, (_, pageIndex) => {
    const offset = pageIndex * fittedCapacity
    const pageQuestionCount = Math.min(fittedCapacity, definition.totalQuestions - offset)
    const metrics = getTemplateLayoutMetrics(
      {
        ...state.omrConfig,
        rowsPerColumn: fittedRowsPerColumn,
        totalQuestions: pageQuestionCount,
      },
      offset,
      pageQuestionCount,
    )
    return { pageIndex, metrics }
  })

  return (
    <div className="card-editor-preview">
      <div className="card-editor-preview__header">
        <h3>Preview do cartão</h3>
        <div className="card-editor-preview__chips">
          <span>{definition.totalQuestions} questões</span>
          <span>{definition.choicesPerQuestion} alternativas</span>
          <span>{definition.columns} colunas</span>
          <span>{totalPages} {totalPages === 1 ? 'página' : 'páginas'}</span>
        </div>
      </div>

      <div className="card-editor-preview__frame">
        <div className="card-editor-preview__pages">
          {pages.map(({ pageIndex, metrics }) => (
            <div className="card-editor-preview__page-sheet" key={`page-${pageIndex}`}>
              <svg
                className="card-editor-preview__svg"
                viewBox={previewViewBox}
                role="img"
                aria-label={`Preview do template ${state.name} - página ${pageIndex + 1}`}
              >
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

                <rect
                  x={zones.header.x}
                  y={zones.header.y}
                  width={zones.header.width}
                  height={zones.header.height}
                  rx={18}
                  fill={palette.accentSoft}
                />
                <text x={zones.header.x + 18} y={zones.header.y + 18} className="card-editor-preview__eyebrow" fill={palette.text}>
                  {unitName}
                </text>
                <text x={zones.header.x + 18} y={zones.header.y + 48} className="card-editor-preview__title" fill={palette.title}>
                  {headerTitle}
                </text>

                <rect
                  x={zones.header.x + zones.header.width - 104}
                  y={zones.header.y + 10}
                  width="88"
                  height="52"
                  rx="14"
                  fill="#ffffff"
                  stroke={palette.stroke}
                />
                <text x={zones.header.x + zones.header.width - 84} y={zones.header.y + 30} className="card-editor-preview__meta" fill={palette.title}>
                  {definition.pageSize}
                </text>
                <text x={zones.header.x + zones.header.width - 84} y={zones.header.y + 46} className="card-editor-preview__tiny" fill="#64748b">
                  Página {pageIndex + 1}/{totalPages}
                </text>

                <g>
                  {zones.identificationFields.map((field, index) => {
                    const columnIndex = index % zones.info.columns
                    const rowIndex = Math.floor(index / zones.info.columns)
                    const cellWidth = zones.info.width / zones.info.columns
                    const fieldX = zones.info.x + columnIndex * cellWidth + 10
                    const fieldY = zones.info.y + 12 + rowIndex * 20
                    return (
                      <g key={`${field}-${index}`}>
                        <text x={fieldX} y={fieldY} className="card-editor-preview__field-label" fill={palette.title}>
                          {field}:
                        </text>
                        <line
                          x1={fieldX + 54}
                          y1={fieldY - 3}
                          x2={fieldX + cellWidth - 22}
                          y2={fieldY - 3}
                          stroke="#cbd5e1"
                          strokeWidth="1.2"
                        />
                      </g>
                    )
                  })}
                </g>

                <text
                  x={TEMPLATE_PAGE_X + TEMPLATE_PAGE_WIDTH / 2}
                  y={zones.instructions.y + 14}
                  textAnchor="middle"
                  className="card-editor-preview__body"
                  fill="#334155"
                >
                  {topInstruction}
                </text>

                {definition.showBlockTitles
                  ? Array.from({ length: definition.columns }, (_, columnIndex) => {
                      const titleX = metrics.questionStartX + columnIndex * metrics.columnOffset - 40
                      const blockTitle = definition.groupByArea ? `Parte ${columnIndex + 1}` : `Bloco ${columnIndex + 1}`
                      return (
                        <g key={`block-${pageIndex}-${columnIndex}`}>
                          <text x={titleX} y={zones.answers.top + 6} className="card-editor-preview__section" fill={palette.title}>
                            {blockTitle}
                          </text>
                        </g>
                      )
                    })
                  : null}

                {Array.from({ length: definition.columns }, (_, columnIndex) => {
                  const headerX = metrics.questionStartX + columnIndex * metrics.columnOffset
                  return (
                    <g key={`header-${pageIndex}-${columnIndex}`}>
                      {metrics.activeOptions.map((option, optionIndex) => (
                        <text
                          key={`${pageIndex}-${columnIndex}-${option}`}
                          x={headerX + optionIndex * metrics.bubbleSpacing}
                          y={metrics.headerY}
                          textAnchor="middle"
                          className="card-editor-preview__label"
                          fill={palette.text}
                        >
                          {option}
                        </text>
                      ))}
                    </g>
                  )
                })}

                {metrics.questions.map((question) => (
                  <g key={`question-${pageIndex}-${question.questionNumber}`}>
                    <text
                      x={question.labelX}
                      y={question.labelY + 4}
                      textAnchor="end"
                      className="card-editor-preview__question"
                      fill={palette.title}
                    >
                      {question.questionNumber}
                    </text>

                    <line
                      x1={question.labelX - metrics.questionLabelWidth}
                      y1={question.optionY}
                      x2={question.optionStartX + metrics.answerBlockWidth + metrics.bubbleRadius}
                      y2={question.optionY}
                      stroke={guideLineStroke}
                      strokeWidth={visualTheme.answerGridStyle === 'minimal' ? 0.7 : 1}
                    />

                    {metrics.activeOptions.map((option, optionIndex) => (
                      <g key={`${pageIndex}-${question.questionNumber}-${option}`}>
                        <circle
                          cx={question.optionStartX + optionIndex * metrics.bubbleSpacing}
                          cy={question.optionY}
                          r={metrics.bubbleRadius}
                          fill="#ffffff"
                          stroke={palette.title}
                          strokeWidth={1.8}
                        />
                        <text
                          x={question.optionStartX + optionIndex * metrics.bubbleSpacing}
                          y={question.optionY + metrics.bubbleRadius + 14}
                          textAnchor="middle"
                          className="card-editor-preview__tiny"
                          fill="#64748b"
                        >
                          {option}
                        </text>
                      </g>
                    ))}
                  </g>
                ))}

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
                    x={zones.footer.signatureX + zones.footer.signatureWidth / 2}
                    y={zones.footer.top + 54}
                    textAnchor="middle"
                    className="card-editor-preview__meta"
                    fill={palette.title}
                  >
                    Assinatura do aluno
                  </text>
                ) : null}

                {definition.identification.showExamCode ? (
                  <g>
                    <rect
                      x={zones.footer.codeBoxX}
                      y={zones.footer.top + 10}
                      width={zones.footer.codeBoxWidth}
                      height={zones.footer.codeBoxHeight}
                      rx="16"
                      fill="#f8fafc"
                      stroke={sectionStroke}
                    />
                    <text x={zones.footer.codeBoxX + 14} y={zones.footer.top + 38} className="card-editor-preview__meta" fill={palette.title}>
                      {footerCode}
                    </text>
                    <text x={zones.footer.codeBoxX + 14} y={zones.footer.top + 55} className="card-editor-preview__tiny" fill="#64748b">
                      Código da prova
                    </text>
                  </g>
                ) : null}

                <text x={TEMPLATE_PAGE_X + 26} y={TEMPLATE_PAGE_Y + TEMPLATE_PAGE_HEIGHT - 22} className="card-editor-preview__brand" fill={palette.accent}>
                  MarkQuest
                </text>
                <text
                  x={TEMPLATE_PAGE_X + TEMPLATE_PAGE_WIDTH / 2}
                  y={TEMPLATE_PAGE_Y + TEMPLATE_PAGE_HEIGHT - 22}
                  textAnchor="middle"
                  className="card-editor-preview__tiny"
                  fill="#64748b"
                >
                  {unitName}
                </text>
                <text
                  x={TEMPLATE_PAGE_X + TEMPLATE_PAGE_WIDTH - 26}
                  y={TEMPLATE_PAGE_Y + TEMPLATE_PAGE_HEIGHT - 22}
                  textAnchor="end"
                  className="card-editor-preview__tiny"
                  fill="#64748b"
                >
                  {classroomName}
                </text>
              </svg>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
