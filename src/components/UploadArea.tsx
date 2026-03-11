import { Button } from './Button'
import { Card } from './Card'

type UploadAreaProps = {
  title: string
  helperText: string
}

export function UploadArea({ title, helperText }: UploadAreaProps) {
  return (
    <Card className="upload-area">
      <div className="upload-area__icon">⬆</div>
      <h3>{title}</h3>
      <p>{helperText}</p>
      <div className="upload-area__actions">
        <Button>Selecionar arquivos</Button>
        <Button variant="secondary">Arrastar e soltar</Button>
      </div>
    </Card>
  )
}
