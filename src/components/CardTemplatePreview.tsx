import type { CardTemplateEditorState } from '../types/omr'
import { getCardTemplateZones } from '../utils/cardTemplateZones'
import { getFooterMessageAnchor, wrapFooterMessage } from '../utils/footerMessageLayout'
import { getLogoBoxPlacement } from '../utils/logoLayout'
import { buildNormalizedRenderModel, getQuestionBlockQuestionConfig } from '../utils/questionBlocks'
import { formatQuestionLabel } from '../utils/questionNumbering'
import { estimateTextWidth, getLabelTextFontSize, getTemplateRenderMetrics } from '../utils/templateRenderMetrics'
import { TEMPLATE_PAGE_HEIGHT, TEMPLATE_PAGE_WIDTH, TEMPLATE_PAGE_X, TEMPLATE_PAGE_Y } from '../utils/templateLayoutGeometry'
import { getPaginatedTemplatePages } from '../utils/templatePageLayout'
import {
  getContainedImageLayout,
  getMathBubbleLayouts,
  getMathInputBoxLayouts,
  getQuestionMarkerLayout,
  imagePlaceholderStyle,
  mathBubbleStyle,
  mathInputBoxStyle,
} from '../utils/templateVisualElements'

type CardTemplatePreviewProps = {
  state: CardTemplateEditorState
  unitName: string
  classroomName: string
  examName: string
  examId?: string
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

  const getEssayHeaderValue = (field: 'studentName' | 'class' | 'testName' | 'code' | 'teacher' | 'shift' | 'date') => {
    switch (field) {
      case 'studentName':
        return 'Aluno'
      case 'class':
        return classroomName || 'Turma'
      case 'testName':
        return examName || 'Prova'
      case 'code':
        return previewStudentCode
      default:
        return ''
    }
  }

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
          {pages.map(({ pageKind, pageIndex, metrics, questions, blockTitles, labels, openAnswers, mathBlocks, images, essays, signatures }) => {
            const renderMetrics = getTemplateRenderMetrics(metrics)
            const previewQrSize = renderMetrics.previewQrSize
            const previewQrX = zones.footer.codeBoxX + (zones.footer.codeBoxWidth - previewQrSize) / 2

            if (pageKind === 'essay') {
              return (
                <div className="card-editor-preview__page-sheet" key={`page-${pageIndex}`}>
                  <svg
                    className="card-editor-preview__svg"
                    viewBox={previewViewBox}
                    role="img"
                    aria-label={`Preview da folha de redação ${state.name} - página ${pageIndex + 1}`}
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
                    {essays.map((essay) => (
                      <g key={`essay-${pageIndex}-${essay.id}`}>
                        <text
                          x={essay.x + essay.width / 2}
                          y={essay.titleY}
                          textAnchor="middle"
                          className="card-editor-preview__title"
                          fill={palette.title}
                          style={{ fontSize: '16px', fontWeight: 800 }}
                        >
                          {essay.title}
                        </text>
                        {essay.headerFields.map((field, fieldIndex) => {
                          const value = getEssayHeaderValue(field.key)
                          return (
                          <g key={`essay-header-${fieldIndex}`}>
                            <text x={field.x} y={field.y} className="card-editor-preview__field-label" fill={palette.title}>
                              {field.label}
                            </text>
                            {value ? (
                              <text
                                x={field.lineX}
                                y={field.y}
                                className="card-editor-preview__body"
                                fill="#475569"
                                style={{ fontSize: '8px' }}
                              >
                                {value}
                              </text>
                            ) : (
                              <line
                                x1={field.lineX}
                                y1={field.y}
                                x2={field.lineX + field.lineWidth}
                                y2={field.y}
                                stroke="#64748b"
                                strokeWidth="0.9"
                              />
                            )}
                          </g>
                          )
                        })}
                        {essay.showEssayTitleField ? (
                          <g>
                            <line
                              x1={essay.essayTitleLineX}
                              y1={essay.essayTitleLineY}
                              x2={essay.essayTitleLineX + essay.essayTitleLineWidth}
                              y2={essay.essayTitleLineY}
                              stroke="#64748b"
                              strokeWidth="0.9"
                            />
                          </g>
                        ) : null}
                        {essay.style === 'box' ? (
                          <g>
                            <rect
                              x={essay.answerBox.x}
                              y={essay.answerBox.y}
                              width={essay.answerBox.width}
                              height={essay.answerBox.height}
                              fill="#ffffff"
                              stroke="#64748b"
                              strokeWidth="1.2"
                            />
                            <line
                              x1={essay.answerBox.x + essay.numberColumnWidth}
                              y1={essay.answerBox.y}
                              x2={essay.answerBox.x + essay.numberColumnWidth}
                              y2={essay.answerBox.y + essay.answerBox.height}
                              stroke="#94a3b8"
                              strokeWidth="0.9"
                            />
                          </g>
                        ) : null}
                        {essay.lineLayouts.map((line) => (
                          <g key={`essay-line-${line.number}`}>
                            {essay.style === 'box' ? (
                              <>
                                {line.highlight ? (
                                  <rect
                                    x={essay.answerBox.x}
                                    y={line.rowTopY}
                                    width={essay.numberColumnWidth}
                                    height={line.rowBottomY - line.rowTopY}
                                    fill="#e5e7eb"
                                  />
                                ) : null}
                                {line.number < essay.lines ? (
                                  <line
                                    x1={essay.answerBox.x}
                                    y1={line.rowBottomY}
                                    x2={essay.answerBox.x + essay.answerBox.width}
                                    y2={line.rowBottomY}
                                    stroke="#94a3b8"
                                    strokeWidth="0.8"
                                  />
                                ) : null}
                              </>
                            ) : line.highlight ? (
                              <rect
                                x={essay.x}
                                y={line.lineY - 12}
                                width="24"
                                height="14"
                                rx="3"
                                fill="#e2e8f0"
                              />
                            ) : null}
                            <text
                              x={line.numberX}
                              y={line.numberY}
                              textAnchor={essay.style === 'box' ? 'middle' : 'end'}
                              className="card-editor-preview__tiny"
                              fill="#475569"
                              style={{ fontSize: '8px', fontWeight: 700 }}
                            >
                              {line.number}
                            </text>
                            {essay.style === 'box' ? null : (
                              <line
                                x1={line.lineX}
                                y1={line.lineY}
                                x2={line.lineX + line.lineWidth}
                                y2={line.lineY}
                                stroke="#94a3b8"
                                strokeWidth="0.8"
                              />
                            )}
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
            }

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

                {openAnswers.map((openAnswer) => (
                  <g key={`open-answer-${pageIndex}-${openAnswer.id}`}>
                    <text
                      x={openAnswer.x}
                      y={openAnswer.labelY}
                      textAnchor="start"
                      className="card-editor-preview__question"
                      fill={palette.title}
                      style={{ fontSize: `${openAnswer.fontSize}px`, fontWeight: 700 }}
                    >
                      {openAnswer.displayQuestionNumber ? `Questão ${openAnswer.displayQuestionNumber} — ${openAnswer.label}` : openAnswer.label}
                    </text>
                    {openAnswer.lineStyle === 'box' ? (
                      <rect
                        x={openAnswer.x}
                        y={openAnswer.answerTopY}
                        width={openAnswer.width}
                        height={openAnswer.answerHeight}
                        rx="6"
                        fill="#ffffff"
                        stroke="#94a3b8"
                        strokeWidth="1.1"
                      />
                    ) : (
                      openAnswer.lineYs.map((lineY, lineIndex) => (
                        <line
                          key={`open-answer-line-${pageIndex}-${openAnswer.id}-${lineIndex}`}
                          x1={openAnswer.x}
                          y1={lineY}
                          x2={openAnswer.x + openAnswer.width}
                          y2={lineY}
                          stroke="#94a3b8"
                          strokeWidth="0.9"
                        />
                      ))
                    )}
                  </g>
                ))}

                {mathBlocks.map((mathBlock) => (
                  <g key={`math-block-${pageIndex}-${mathBlock.id}`}>
                    {mathBlock.displayQuestionNumber ? (
                      <text
                        x={mathBlock.x}
                        y={mathBlock.titleY}
                        textAnchor="start"
                        className="card-editor-preview__question"
                        fill={palette.title}
                        style={{ fontSize: '9px', fontWeight: 700 }}
                      >
                        {`Questão ${mathBlock.displayQuestionNumber}`}
                      </text>
                    ) : null}
                    {mathBlock.showColumnHeaders ? (
                      <g>
                        {mathBlock.columnXs.map((columnX, columnIndex) => (
                          <text
                            key={`math-header-${pageIndex}-${mathBlock.id}-${columnIndex}`}
                            x={columnX}
                            y={mathBlock.headerY}
                            textAnchor="middle"
                            className="card-editor-preview__tiny"
                            fill={palette.title}
                            style={{ fontSize: '8px', fontWeight: 800 }}
                          >
                            {mathBlock.columnHeaders[columnIndex]}
                          </text>
                        ))}
                      </g>
                    ) : null}
                    {mathBlock.showTopInputRow ? (
                      <g>
                        {getMathInputBoxLayouts(mathBlock).map((box, columnIndex) => (
                          <rect
                            key={`math-input-${pageIndex}-${mathBlock.id}-${columnIndex}`}
                            x={box.x}
                            y={box.y}
                            width={box.width}
                            height={box.height}
                            rx={box.radius}
                            fill={mathInputBoxStyle.fillColor}
                            stroke={mathInputBoxStyle.strokeColor}
                            strokeWidth={mathInputBoxStyle.strokeWidth}
                            shapeRendering="crispEdges"
                          />
                        ))}
                      </g>
                    ) : null}
                    {mathBlock.rows.map((row) => {
                      const rowBubbles = getMathBubbleLayouts(mathBlock, renderMetrics).filter((bubble) => bubble.symbol === row.symbol)
                      return (
                      <g key={`math-row-${pageIndex}-${mathBlock.id}-${row.symbol}`}>
                        {rowBubbles.map((bubble, columnIndex) => (
                          <g key={`math-bubble-${pageIndex}-${mathBlock.id}-${row.symbol}-${columnIndex}`}>
                            <circle
                              cx={bubble.cx}
                              cy={bubble.cy}
                              r={bubble.radius}
                              fill={mathBubbleStyle.fillColor}
                              stroke={palette.title}
                              strokeWidth={bubble.strokeWidth}
                            />
                            <text
                              x={bubble.labelX}
                              y={bubble.labelY}
                              textAnchor="middle"
                              className="card-editor-preview__tiny"
                              fill={mathBubbleStyle.labelColor}
                              style={{ fontSize: `${bubble.labelFontSize}px`, fontWeight: mathBubbleStyle.labelWeight }}
                            >
                              {bubble.symbol}
                            </text>
                          </g>
                        ))}
                      </g>
                      )
                    })}
                  </g>
                ))}

                {images.map((imageSection) => (
                  <g key={`image-section-${pageIndex}-${imageSection.id}`}>
                    {imageSection.displayQuestionNumber ? (
                      <text
                        x={imageSection.x}
                        y={imageSection.y + 10}
                        textAnchor="start"
                        className="card-editor-preview__question"
                        fill={palette.title}
                        style={{ fontSize: '10px', fontWeight: 700 }}
                      >
                        {`Questão ${imageSection.displayQuestionNumber}`}
                      </text>
                    ) : null}
                    {imageSection.imageSrc ? (
                      (() => {
                        const imageLayout = getContainedImageLayout(imageSection)
                        return (
                          <image
                            href={imageSection.imageSrc}
                            x={imageLayout.x}
                            y={imageLayout.y}
                            width={imageLayout.width}
                            height={imageLayout.height}
                            preserveAspectRatio="none"
                          />
                        )
                      })()
                    ) : (
                      <g>
                        <rect
                          x={imageSection.x}
                          y={imageSection.imageBoxY}
                          width={imageSection.width}
                          height={imageSection.imageBoxHeight}
                          rx={imagePlaceholderStyle.radius}
                          fill={imagePlaceholderStyle.fillColor}
                          stroke={imagePlaceholderStyle.strokeColor}
                          strokeDasharray={imagePlaceholderStyle.strokeDashArray}
                        />
                        <text
                          x={imageSection.x + imageSection.width / 2}
                          y={imageSection.imageBoxY + imageSection.imageBoxHeight / 2}
                          textAnchor="middle"
                          className="card-editor-preview__small"
                          fill={imagePlaceholderStyle.labelColor}
                          style={{ fontSize: `${imagePlaceholderStyle.labelFontSize}px`, fontWeight: 700 }}
                        >
                          Imagem não selecionada
                        </text>
                      </g>
                    )}
                  </g>
                ))}

                {signatures.map((signature) => (
                  <g key={`signature-${pageIndex}-${signature.id}`}>
                    <line
                      x1={signature.x}
                      y1={signature.lineY}
                      x2={signature.x + signature.width}
                      y2={signature.lineY}
                      stroke="#64748b"
                      strokeWidth="1.2"
                    />
                    <text
                      x={signature.labelX}
                      y={signature.labelY}
                      textAnchor={signature.labelAnchor}
                      className="card-editor-preview__tiny"
                      fill="#475569"
                      style={{ fontSize: `${signature.fontSize}px`, fontWeight: 700 }}
                    >
                      {signature.label}
                    </text>
                  </g>
                ))}

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
                      const logicalQuestion = renderModel.logicalQuestionMap.get(question.questionNumber)
                      if (logicalQuestion && logicalQuestion.type !== 'objective' && logicalQuestion.markerLabel) {
                        const markerLayout = getQuestionMarkerLayout({
                          markerLabel: logicalQuestion.markerLabel,
                          questionFontSize: renderMetrics.questionFontSize,
                          optionGroupWidth: question.optionGroupWidth,
                          optionStartX: question.optionStartX,
                          optionY: question.optionY,
                          bubbleRadius: metrics.bubbleRadius,
                          bubbleStrokeWidth: renderMetrics.bubbleStrokeWidthPreview,
                          bubbleLabelOffsetY: renderMetrics.bubbleLabelOffsetY,
                        })

                        return (
                          <g>
                            <rect
                              x={markerLayout.x}
                              y={markerLayout.y}
                              width={markerLayout.width}
                              height={markerLayout.height}
                              rx={markerLayout.radius}
                              fill="#f8fafc"
                              stroke={palette.title}
                              strokeWidth={markerLayout.strokeWidth}
                            />
                            <text
                              x={markerLayout.textX}
                              y={markerLayout.textY}
                              textAnchor="middle"
                              dominantBaseline="central"
                              className="card-editor-preview__question"
                              fill={palette.title}
                              style={{ fontSize: `${markerLayout.fontSize}px`, fontWeight: 700, lineHeight: 'normal' }}
                            >
                              {logicalQuestion.markerLabel}
                            </text>
                          </g>
                        )
                      }

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

