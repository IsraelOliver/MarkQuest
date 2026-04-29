import { db } from '../repositories/in-memory.repository.js'
import type { User, UserRole } from '../types/entities.js'
import { AppError } from '../utils/app-error.js'
import { createAuthToken } from '../utils/auth-token.js'
import { generateId } from '../utils/id.js'
import { hashPassword, verifyPassword } from '../utils/password.js'

export type PublicUser = {
  id: string
  name: string
  email: string
  role: UserRole
  createdAt: string
  updatedAt: string
}

function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}

export class AuthService {
  register(input: { name: string; email: string; password: string; role: UserRole }) {
    const existingUser = db.users.find((item) => item.email.toLowerCase() === input.email.toLowerCase())
    if (existingUser) {
      throw new AppError('AUTH_EMAIL_ALREADY_EXISTS', 'Já existe um usuário cadastrado com este email.', 409)
    }

    const now = new Date().toISOString()
    const user: User = {
      id: generateId('usr'),
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash: hashPassword(input.password),
      role: input.role,
      createdAt: now,
      updatedAt: now,
    }

    db.users.push(user)
    db.persist()

    return toPublicUser(user)
  }

  login(input: { email: string; password: string }) {
    const user = db.users.find((item) => item.email.toLowerCase() === input.email.toLowerCase())
    if (!user || !verifyPassword(input.password, user.passwordHash)) {
      throw new AppError('AUTH_INVALID_CREDENTIALS', 'Email ou senha inválidos.', 401)
    }

    return {
      token: createAuthToken({
        sub: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      }),
      user: toPublicUser(user),
    }
  }

  findPublicUserById(id: string) {
    const user = db.users.find((item) => item.id === id)
    return user ? toPublicUser(user) : null
  }
}
