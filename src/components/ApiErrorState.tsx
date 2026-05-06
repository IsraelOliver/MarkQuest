import { Button } from './Button'
import { Card } from './Card'

type ApiErrorStateProps = {
  title?: string
  message: string
  onRetry?: () => void | Promise<void>
  isRetrying?: boolean
}

export function ApiErrorState({
  title = 'Nao foi possivel carregar os dados',
  message,
  onRetry,
  isRetrying = false,
}: ApiErrorStateProps) {
  return (
    <Card className="api-error-state">
      <div>
        <h3>{title}</h3>
        <p>{message}</p>
      </div>
      {onRetry ? (
        <Button type="button" variant="secondary" onClick={() => void onRetry()} disabled={isRetrying}>
          {isRetrying ? 'Tentando...' : 'Tentar novamente'}
        </Button>
      ) : null}
    </Card>
  )
}
