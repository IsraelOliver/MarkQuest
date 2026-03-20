import type { CardTemplateEditorState } from '../types/omr'
import { getCardTemplateZones } from '../utils/cardTemplateZones'
import { TEMPLATE_PAGE_HEIGHT, TEMPLATE_PAGE_WIDTH, TEMPLATE_PAGE_X, TEMPLATE_PAGE_Y, TEMPLATE_VIEWBOX_HEIGHT, TEMPLATE_VIEWBOX_WIDTH } from '../utils/templateLayoutGeometry'

type CardTemplatePreviewProps = {
  state: CardTemplateEditorState
  unitName: string
  classroomName: string
  examName: string
}

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
  const { metrics } = zones
  const palette = getThemePalette(visualTheme.visualStyle)
  const sectionStroke = visualTheme.showSectionSeparators ? palette.stroke : '#d9e2ec'
  const guideLineStroke = visualTheme.answerGridStyle === 'minimal' ? '#e2e8f0' : '#d9e2ec'
  const headerTitle = definition.header.examName || examName
  const subtitle = definition.header.subtitle || 'Cartao-resposta oficial'
  const topInstruction =
    definition.header.instructions || 'Marque assim: bolha totalmente preenchida. Nao marque assim: X, circulo parcial ou check.'
  const footerCode = `COD-${definition.totalQuestions}`

  return (
    <div className="card-editor-preview">
      <div className="card-editor-preview__header">
        <div>
          <h3>Preview do cartao</h3>
          <p>Estrutura compacta por zonas: topo informativo, instrucoes, grade isolada e rodape tecnico.</p>
        </div>

        <div className="card-editor-preview__chips">
          <span>{definition.totalQuestions} questoes</span>
          <span>{definition.choicesPerQuestion} alternativas</span>
          <span>{definition.columns} colunas</span>
        </div>
      </div>

      <div className="card-editor-preview__frame">
        <svg
          className="card-editor-preview__svg"
          viewBox={`0 0 ${TEMPLATE_VIEWBOX_WIDTH} ${TEMPLATE_VIEWBOX_HEIGHT}`}
          role="img"
          aria-label={`Preview do template ${state.name}`}
        >
          <rect
            x={TEMPLATE_PAGE_X}
            y={TEMPLATE_PAGE_Y}
            width={TEMPLATE_PAGE_WIDTH}
            height={TEMPLATE_PAGE_HEIGHT}
            rx={visualTheme.softBorders ? 28 : 10}
            fill="#ffffff"
            stroke="#dbeafe"
          />

          <rect
            x={zones.header.x}
            y={zones.header.y}
            width={zones.header.width}
            height={zones.header.height}
            rx={20}
            fill={palette.accentSoft}
          />
          <text x={zones.header.x + 18} y={zones.header.y + 18} className="card-editor-preview__eyebrow" fill={palette.text}>
            Instituicao
          </text>
          <text x={zones.header.x + 18} y={zones.header.y + 48} className="card-editor-preview__title" fill={palette.title}>
            {headerTitle}
          </text>
          <text x={zones.header.x + 18} y={zones.header.y + 66} className="card-editor-preview__small" fill="#475569">
            {subtitle || `${unitName} / ${classroomName}`}
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
            Leitura OMR segura
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
                  <g key={`block-${columnIndex}`}>
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
              <g key={`header-${columnIndex}`}>
                {metrics.activeOptions.map((option, optionIndex) => (
                  <text
                    key={`${columnIndex}-${option}`}
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
            <g key={question.questionNumber}>
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
                <g key={`${question.questionNumber}-${option}`}>
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
                Codigo da prova
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
    </div>
  )
}
