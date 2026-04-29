import { db } from '../repositories/in-memory.repository.js'
import { AuthService } from '../services/auth.service.js'

const ADMIN_NAME = 'Admin MarkQuest'
const ADMIN_EMAIL = 'contato@markquest.com.br'
const ADMIN_PASSWORD = 'Admin@123456'

async function seedAdmin() {
  const existingUser = db.users.find((user) => user.email.toLowerCase() === ADMIN_EMAIL)

  if (existingUser) {
    console.log(`Usuário admin já existe: ${ADMIN_EMAIL}`)
    return
  }

  const authService = new AuthService()
  const user = authService.register({
    name: ADMIN_NAME,
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    role: 'admin',
  })

  console.log(`Usuário admin criado: ${user.email}`)
}

seedAdmin().catch((error) => {
  console.error('Falha ao criar usuário admin inicial.', error)
  process.exitCode = 1
})
