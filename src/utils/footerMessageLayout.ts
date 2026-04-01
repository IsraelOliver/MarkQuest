type WrapOptions = {
  maxCharsPerLine?: number
  maxLines?: number
}

export function wrapFooterMessage(message: string, options: WrapOptions = {}) {
  const maxCharsPerLine = options.maxCharsPerLine ?? 28
  const maxLines = options.maxLines ?? 2
  const normalized = message
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  const lines: string[] = []

  for (const paragraph of normalized) {
    const words = paragraph.split(/\s+/)
    let currentLine = ''

    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word
      if (candidate.length <= maxCharsPerLine) {
        currentLine = candidate
        continue
      }

      if (currentLine) lines.push(currentLine)
      currentLine = word

      if (lines.length >= maxLines) break
    }

    if (lines.length >= maxLines) break
    if (currentLine) lines.push(currentLine)
    if (lines.length >= maxLines) break
  }

  if (!lines.length) return []

  if (lines.length > maxLines) return lines.slice(0, maxLines)

  const hasOverflow =
    normalized.join(' ').length >
    lines.join(' ').length

  if (hasOverflow) {
    const lastIndex = Math.min(lines.length, maxLines) - 1
    lines[lastIndex] = `${lines[lastIndex].replace(/[.]+$/g, '').slice(0, Math.max(0, maxCharsPerLine - 1)).trimEnd()}…`
  }

  return lines.slice(0, maxLines)
}

export function getFooterMessageAnchor(alignment: 'left' | 'center' | 'right') {
  if (alignment === 'left') return 'start'
  if (alignment === 'right') return 'end'
  return 'middle'
}
