import { db } from '../repositories/in-memory.repository.js'
import type { Unit } from '../types/entities.js'
import { generateId } from '../utils/id.js'

export class UnitService {
  create(input: { name: string; kind: Unit['kind'] }): Unit {
    const unit: Unit = {
      id: generateId('unt'),
      name: input.name,
      kind: input.kind,
      createdAt: new Date().toISOString(),
    }

    db.units.push(unit)
    db.persist()
    return unit
  }

  list() {
    return db.units
  }
}
