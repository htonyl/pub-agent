import { drizzle } from 'drizzle-orm/durable-sqlite'
import { migrate } from 'drizzle-orm/durable-sqlite/migrator'
import { DurableObject } from 'cloudflare:workers'

import { CounterModel } from '../models/counter-model'
import { DrizzleCounterStore } from '../database/counter-store'
import type { CloudflareBindings } from '../env'
import type { CounterSnapshot } from '../models/counter-model'
import migrations from '../../drizzle/migrations'

export class CounterDurableObject extends DurableObject {
  private readonly model: CounterModel

  constructor(ctx: DurableObjectState, env: CloudflareBindings) {
    super(ctx, env)

    const db = drizzle(ctx.storage)
    this.model = new CounterModel(new DrizzleCounterStore(db))

    ctx.blockConcurrencyWhile(async () => {
      await migrate(db, migrations)
    })
  }

  getCounter(): Promise<CounterSnapshot> {
    return this.model.get()
  }

  incrementCounter(amount = 1): Promise<CounterSnapshot> {
    return this.model.increment(amount)
  }
}
