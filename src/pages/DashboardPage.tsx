import { ApiErrorState } from '../components/ApiErrorState'
import { SectionTitle } from '../components/SectionTitle'
import { StatsCard } from '../components/StatsCard'
import { Table } from '../components/Table'
import { useAcademicScope } from '../hooks/useAcademicScope'
import { useOmrOverview } from '../hooks/useOmrOverview'

export function DashboardPage() {
  const academicScope = useAcademicScope()
  const { selectedUnit, selectedClassroom, selectedExam } = academicScope
  const { isLoading, error, refresh, lastJob, studentResults, counters } = useOmrOverview()

  if (isLoading || academicScope.isLoading) return <p>Carregando visao geral do MarkQuest...</p>

  if (academicScope.error || error) {
    return (
      <section>
        <SectionTitle title="Dashboard" subtitle="Acompanhe a operacao de leitura OMR." />
        <ApiErrorState
          message={academicScope.error ?? error ?? 'Nao foi possivel carregar o dashboard.'}
          onRetry={() => void Promise.all([academicScope.refresh(), refresh()])}
        />
      </section>
    )
  }

  return (
    <section>
      <SectionTitle
        title="Dashboard"
        subtitle="Acompanhe a operacao de leitura OMR com metricas-chave e desempenho recente."
      />

      <p>
        Contexto ativo: {selectedUnit?.name ?? 'Sem unidade'} / {selectedClassroom?.name ?? 'Sem turma'} / {selectedExam?.name ?? 'Sem prova'}
      </p>

      <div className="stats-grid">
        <StatsCard label="Cartoes enviados" value={String(counters.uploadedSheets)} trend="Total registrado na API" />
        <StatsCard label="Modelos ativos" value={String(counters.templates)} trend="Templates disponiveis" />
        <StatsCard label="Gabaritos" value={String(counters.answerKeys)} trend="Versoes prontas para uso" />
        <StatsCard label="Ultimo job" value={lastJob?.status ?? '-'} trend={lastJob?.id ?? 'Sem processamento recente'} />
      </div>

      <SectionTitle title="Resultados recentes" subtitle="Resumo dos alunos processados no ultimo lote." />
      {studentResults.length ? (
        <Table
          data={studentResults}
          columns={[
            { key: 'studentName', header: 'Aluno' },
            { key: 'score', header: 'Nota', render: (item) => `${item.score}` },
            { key: 'correctAnswers', header: 'Acertos' },
            { key: 'incorrectAnswers', header: 'Erros' },
            { key: 'blankAnswers', header: 'Brancos' },
          ]}
        />
      ) : (
        <p>Nenhum aluno processado ainda. Envie uploads e execute um job para ver os resultados aqui.</p>
      )}
    </section>
  )
}
