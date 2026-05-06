import { isRouteErrorResponse, useRouteError } from 'react-router-dom'
import { ApiErrorState } from './ApiErrorState'

function getRouteErrorMessage(error: unknown) {
  if (isRouteErrorResponse(error)) {
    return error.statusText || `Erro ${error.status}`
  }

  if (error instanceof Error) {
    return error.message || 'Ocorreu um erro inesperado na tela.'
  }

  return 'Ocorreu um erro inesperado na tela.'
}

export function RouteErrorBoundary() {
  const error = useRouteError()
  console.error('Erro inesperado de rota:', error)

  return (
    <main className="route-error-page">
      <ApiErrorState
        title="Nao foi possivel abrir esta tela"
        message={`${getRouteErrorMessage(error)} Recarregue a pagina ou tente novamente.`}
        onRetry={() => window.location.reload()}
      />
    </main>
  )
}
