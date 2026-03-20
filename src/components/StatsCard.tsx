import { Card } from './Card'

type StatsCardProps = {
  label: string
  value: string
  trend?: string
}

export function StatsCard({ label, value, trend }: StatsCardProps) {
  return (
    <Card className="stats-card">
      <p className="stats-card__label">{label}</p>
      <p className="stats-card__value">{value}</p>
      {trend ? <p className="stats-card__trend">{trend}</p> : null}
    </Card>
  )
}
