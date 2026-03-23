import type { CardTemplateEditorState } from '../types/omr'
import { getCardTemplateZones } from '../utils/cardTemplateZones'
import { formatQuestionLabel } from '../utils/questionNumbering'
import { TEMPLATE_PAGE_HEIGHT, TEMPLATE_PAGE_WIDTH, TEMPLATE_PAGE_X, TEMPLATE_PAGE_Y } from '../utils/templateLayoutGeometry'
import { getPaginatedTemplatePages } from '../utils/templatePageLayout'

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

export function CardTemplatePreview({ state }: CardTemplatePreviewProps) {
  const { definition, visualTheme } = state
  const zones = getCardTemplateZones(state)
  const palette = getThemePalette(visualTheme.visualStyle)
  const sectionStroke = visualTheme.showSectionSeparators ? palette.stroke : '#d6dbe4'
  const topInstruction =
    definition.header.instructions || 'Marque apenas uma alternativa por questão e mantenha o cartão limpo.'
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

  return (
    <div className="card-editor-preview">
      <div className="card-editor-preview__header">
        <h3>Preview do cartão</h3>
        <div className="card-editor-preview__chips">
          <span>{definition.totalQuestions} questões</span>
          <span>{definition.choicesPerQuestion} alternativas</span>
          <span>{definition.columns} colunas</span>
          <span>
            {totalPages} {totalPages === 1 ? 'página' : 'páginas'}
          </span>
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

                <g>
                  {zones.identificationFields.map((field, index) => {
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
                      </g>
                    )
                  })}
                </g>

                <text
                  x={zones.instructions.x + zones.instructions.width / 2}
                  y={zones.instructions.y + 14}
                  textAnchor="middle"
                  className="card-editor-preview__body"
                  fill="#334155"
                >
                  {topInstruction}
                </text>

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
                      y={question.labelY + 3}
                      textAnchor="end"
                      className="card-editor-preview__question"
                      fill="#475569"
                    >
                      {formatQuestionLabel(definition.numberingMode, definition.numberingPattern, question)}
                    </text>

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
                  x1={zones.footer.left}
                  y1={zones.footer.top}
                  x2={zones.footer.right}
                  y2={zones.footer.top}
                  stroke={sectionStroke}
                  strokeWidth="1"
                />

                <line
                  x1={zones.footer.centerX - 14}
                  y1={zones.footer.top + 10}
                  x2={zones.footer.centerX - 14}
                  y2={zones.footer.bottom - 14}
                  stroke="#e2e8f0"
                  strokeWidth="1"
                />
                <line
                  x1={zones.footer.rightX - 14}
                  y1={zones.footer.top + 10}
                  x2={zones.footer.rightX - 14}
                  y2={zones.footer.bottom - 14}
                  stroke="#e2e8f0"
                  strokeWidth="1"
                />

                {definition.header.showInstitutionLogo ? (
                  definition.header.institutionLogoDataUrl ? (
                    <image
                      href={definition.header.institutionLogoDataUrl}
                      x={logoBoxX}
                      y={logoBoxY}
                      width={logoBoxWidth}
                      height={logoBoxHeight}
                      preserveAspectRatio="xMidYMid meet"
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

                {definition.header.footerMessage ? (
                  <text
                    x={zones.footer.centerX + zones.footer.centerWidth / 2}
                    y={zones.footer.top + 34}
                    textAnchor="middle"
                    className="card-editor-preview__tiny"
                    fill="#475569"
                  >
                    {definition.header.footerMessage}
                  </text>
                ) : null}
                <text
                  x={zones.footer.centerX + zones.footer.centerWidth / 2}
                  y={zones.footer.bottom - 8}
                  textAnchor="middle"
                  className="card-editor-preview__tiny"
                  fill="#64748b"
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
                    <text
                      x={zones.footer.codeBoxX + zones.footer.codeBoxWidth / 2}
                      y={zones.footer.top + 22}
                      textAnchor="middle"
                      className="card-editor-preview__meta"
                      fill={palette.title}
                    >
                      {previewStudentCode}
                    </text>
                    <rect
                      x={zones.footer.codeBoxX + 32}
                      y={zones.footer.top + 28}
                      width="76"
                      height="76"
                      rx="8"
                      fill="#ffffff"
                      stroke="#e2e8f0"
                    />
                    <path
                      d={`M ${zones.footer.codeBoxX + 42} ${zones.footer.top + 38} h 16 v 16 h -16 z
                          M ${zones.footer.codeBoxX + 84} ${zones.footer.top + 38} h 16 v 16 h -16 z
                          M ${zones.footer.codeBoxX + 42} ${zones.footer.top + 80} h 16 v 16 h -16 z
                          M ${zones.footer.codeBoxX + 66} ${zones.footer.top + 52} h 8 v 8 h -8 z
                          M ${zones.footer.codeBoxX + 82} ${zones.footer.top + 64} h 8 v 8 h -8 z
                          M ${zones.footer.codeBoxX + 70} ${zones.footer.top + 82} h 10 v 10 h -10 z`}
                      fill={palette.title}
                    />
                  </g>
                ) : null}
              </svg>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
