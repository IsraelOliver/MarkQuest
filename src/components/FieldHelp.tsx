import { useEffect, useId, useRef, useState } from 'react'

type FieldHelpProps = {
  content: string
  label?: string
}

export function FieldHelp({ content, label = 'Ajuda contextual' }: FieldHelpProps) {
  const [isOpen, setIsOpen] = useState(false)
  const tooltipId = useId()
  const wrapperRef = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  return (
    <span ref={wrapperRef} className={`field-help${isOpen ? ' field-help--open' : ''}`}>
      <button
        type="button"
        className="field-help__trigger"
        aria-label={label}
        aria-describedby={tooltipId}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        onBlur={(event) => {
          if (!wrapperRef.current?.contains(event.relatedTarget as Node | null)) {
            setIsOpen(false)
          }
        }}
      >
        <span aria-hidden="true">i</span>
      </button>
      <span id={tooltipId} role="tooltip" className="field-help__tooltip">
        {content}
      </span>
    </span>
  )
}
