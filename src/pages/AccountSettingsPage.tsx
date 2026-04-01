import { SectionTitle } from '../components/SectionTitle'
import { Card } from '../components/Card'

export function AccountSettingsPage() {
  return (
    <section className="page-shell">
      <SectionTitle
        title="Configurações da conta"
        subtitle="Área preparada para os ajustes de perfil, acesso e preferências da conta."
      />

      <Card>
        <p className="feedback">
          Esta tela ainda está em preparação. O atalho da sidebar já está pronto para receber as configurações da conta.
        </p>
      </Card>
    </section>
  )
}
