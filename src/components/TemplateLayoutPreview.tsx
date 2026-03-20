import type { OMRTemplateConfig } from '../types/omr'
import {
  getTemplateLayoutMetrics,
  TEMPLATE_PAGE_HEIGHT,
  TEMPLATE_PAGE_WIDTH,
  TEMPLATE_PAGE_X,
  TEMPLATE_PAGE_Y,
  TEMPLATE_VIEWBOX_HEIGHT,
  TEMPLATE_VIEWBOX_WIDTH,
} from '../utils/templateLayoutGeometry'

type TemplateLayoutPreviewProps = {
  title: string
  examName: string
  classroomName: string
  unitName: string
  config: OMRTemplateConfig
}

export function TemplateLayoutPreview({
  title,
  examName,
  classroomName,
  unitName,
  config,
}: TemplateLayoutPreviewProps) {
  const { activeOptions, answerBlockWidth, bubbleRadius, bubbleSpacing, capacity, headerY, questionLabelWidth, questionStartX, questions, columnOffset } =
    getTemplateLayoutMetrics(config)

  return (
    <div className="layout-preview-card">
      <div className="layout-section-header">
        <div>
          <h3>Preview do cartão</h3>
          <p>Visual gerado a partir da configuração atual do layout.</p>
        </div>

        <div className="layout-preview-card__meta">
          <span>
            {config.totalQuestions} questões
          </span>
          <span>
            {config.columns} colunas
          </span>
          <span>
            capacidade {capacity}
          </span>
        </div>
      </div>

      <div className="layout-preview-shell">
        <div className="layout-preview-page">
          <svg
            className="layout-preview-svg"
            viewBox={`0 0 ${TEMPLATE_VIEWBOX_WIDTH} ${TEMPLATE_VIEWBOX_HEIGHT}`}
            role="img"
            aria-label={`Preview do template ${title}`}
          >
            <rect
              x={TEMPLATE_PAGE_X}
              y={TEMPLATE_PAGE_Y}
              width={TEMPLATE_PAGE_WIDTH}
              height={TEMPLATE_PAGE_HEIGHT}
              rx="28"
              fill="#ffffff"
              stroke="#cbd5e1"
            />

            <rect
              x={TEMPLATE_PAGE_X + 32}
              y={TEMPLATE_PAGE_Y + 28}
              width={TEMPLATE_PAGE_WIDTH - 64}
              height="76"
              rx="22"
              fill="#eff6ff"
            />
            <text x={TEMPLATE_PAGE_X + 52} y={TEMPLATE_PAGE_Y + 64} className="layout-preview-svg__eyebrow">
              MARKQUEST
            </text>
            <text x={TEMPLATE_PAGE_X + 52} y={TEMPLATE_PAGE_Y + 92} className="layout-preview-svg__title">
              {title}
            </text>

            <text x={TEMPLATE_PAGE_X + 52} y={TEMPLATE_PAGE_Y + 146} className="layout-preview-svg__meta">
              {unitName}
            </text>
            <text x={TEMPLATE_PAGE_X + 52} y={TEMPLATE_PAGE_Y + 170} className="layout-preview-svg__meta">
              {classroomName} / {examName}
            </text>

            <line
              x1={TEMPLATE_PAGE_X + 52}
              y1={TEMPLATE_PAGE_Y + 222}
              x2={TEMPLATE_PAGE_X + TEMPLATE_PAGE_WIDTH - 52}
              y2={TEMPLATE_PAGE_Y + 222}
              className="layout-preview-svg__line"
            />
            <text x={TEMPLATE_PAGE_X + 52} y={TEMPLATE_PAGE_Y + 260} className="layout-preview-svg__label">
              Nome do aluno
            </text>
            <line
              x1={TEMPLATE_PAGE_X + 172}
              y1={TEMPLATE_PAGE_Y + 252}
              x2={TEMPLATE_PAGE_X + 486}
              y2={TEMPLATE_PAGE_Y + 252}
              className="layout-preview-svg__line"
            />
            <text x={TEMPLATE_PAGE_X + 520} y={TEMPLATE_PAGE_Y + 260} className="layout-preview-svg__label">
              ID
            </text>
            <line
              x1={TEMPLATE_PAGE_X + 552}
              y1={TEMPLATE_PAGE_Y + 252}
              x2={TEMPLATE_PAGE_X + TEMPLATE_PAGE_WIDTH - 52}
              y2={TEMPLATE_PAGE_Y + 252}
              className="layout-preview-svg__line"
            />

            <rect
              x={TEMPLATE_PAGE_X + TEMPLATE_PAGE_WIDTH - 172}
              y={TEMPLATE_PAGE_Y + 292}
              width="120"
              height="120"
              rx="18"
              fill="#f8fafc"
              stroke="#cbd5e1"
            />
            <path
              d={`M ${TEMPLATE_PAGE_X + TEMPLATE_PAGE_WIDTH - 140} ${TEMPLATE_PAGE_Y + 326} h 56 v 56 h -56 z M ${TEMPLATE_PAGE_X + TEMPLATE_PAGE_WIDTH - 126} ${TEMPLATE_PAGE_Y + 340} h 28 v 28 h -28 z`}
              className="layout-preview-svg__qr"
            />
            <text x={TEMPLATE_PAGE_X + TEMPLATE_PAGE_WIDTH - 146} y={TEMPLATE_PAGE_Y + 432} className="layout-preview-svg__small">
              Codigo da prova
            </text>

            {Array.from({ length: config.columns }, (_, columnIndex) => {
              const headerX = questionStartX + columnIndex * columnOffset
              return (
                <g key={`header-${columnIndex}`}>
                  {activeOptions.map((option, optionIndex) => (
                    <text
                      key={`${columnIndex}-${option}`}
                      x={headerX + optionIndex * bubbleSpacing}
                      y={headerY}
                      textAnchor="middle"
                      className="layout-preview-svg__label"
                    >
                      {option}
                    </text>
                  ))}
                </g>
              )
            })}

            {questions.map((question) => (
              <g key={question.questionNumber}>
                <text
                  x={question.labelX}
                  y={question.labelY + 5}
                  textAnchor="end"
                  className="layout-preview-svg__question"
                >
                  {question.questionNumber}
                </text>

                <line
                  x1={question.labelX - questionLabelWidth}
                  y1={question.optionY + 1}
                  x2={question.optionStartX + answerBlockWidth + bubbleRadius}
                  y2={question.optionY + 1}
                  className="layout-preview-svg__guide"
                />

                {activeOptions.map((option, optionIndex) => (
                  <g key={`${question.questionNumber}-${option}`}>
                    <circle
                      cx={question.optionStartX + optionIndex * bubbleSpacing}
                      cy={question.optionY}
                      r={bubbleRadius}
                      className="layout-preview-svg__bubble"
                    />
                    <text
                      x={question.optionStartX + optionIndex * bubbleSpacing}
                      y={question.optionY + bubbleRadius + 18}
                      textAnchor="middle"
                      className="layout-preview-svg__small"
                    >
                      {option}
                    </text>
                  </g>
                ))}
              </g>
            ))}

            {capacity < config.totalQuestions ? (
              <g>
                <rect
                  x={TEMPLATE_PAGE_X + 32}
                  y={TEMPLATE_PAGE_Y + TEMPLATE_PAGE_HEIGHT - 96}
                  width={TEMPLATE_PAGE_WIDTH - 64}
                  height="56"
                  rx="18"
                  fill="#fef2f2"
                />
                <text
                  x={TEMPLATE_PAGE_X + 52}
                  y={TEMPLATE_PAGE_Y + TEMPLATE_PAGE_HEIGHT - 61}
                  className="layout-preview-svg__warning"
                >
                  Estrutura insuficiente: faltam espaços para todas as questões.
                </text>
              </g>
            ) : null}
          </svg>
        </div>
      </div>
    </div>
  )
}
