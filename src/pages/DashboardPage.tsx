import { SectionTitle } from '../components/SectionTitle'
import { StatsCard } from '../components/StatsCard'
import { Table } from '../components/Table'
import { useOmrOverview } from '../hooks/useOmrOverview'

export function DashboardPage() {
  const { isLoading, lastJob, studentResults, counters } = useOmrOverview()

  if (isLoading) return <p>Carregando visão geral do MarkQuest...</p>

  return (
    <section>
      <SectionTitle
        title="Dashboard"
        subtitle="Acompanhe a operação de leitura OMR com métricas-chave e desempenho recente."
      />

      <div className="stats-grid">
        <StatsCard label="Cartões enviados" value={String(counters.uploadedSheets)} trend="+12% esta semana" />
        <StatsCard label="Modelos ativos" value={String(counters.templates)} trend="Sem alterações" />
        <StatsCard label="Gabaritos" value={String(counters.answerKeys)} trend="1 versão nova" />
        <StatsCard label="Último job" value={lastJob?.status ?? '-'} trend={lastJob?.id} />
      </div>

      <SectionTitle title="Resultados recentes" subtitle="Resumo dos alunos processados no último lote." />
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
    </section>
  )
}
