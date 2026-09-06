import { eq, sql } from 'drizzle-orm'
import type { DrizzleSqliteDODatabase } from 'drizzle-orm/durable-sqlite'

import { counters, type CounterRow } from './schema'

const COUNTER_ID = 'default'

export class DrizzleCounterStore {
  constructor(
    private readonly db: DrizzleSqliteDODatabase<Record<string, never>>,
  ) {}

  async get(): Promise<CounterRow | null> {
    return (
      (await this.db
        .select()
        .from(counters)
        .where(eq(counters.id, COUNTER_ID))
        .get()) ?? null
    )
  }

  async increment(amount: number): Promise<CounterRow> {
    const updatedAt = new Date()

    const row = await this.db
      .insert(counters)
      .values({
        id: COUNTER_ID,
        value: amount,
        updatedAt,
      })
      .onConflictDoUpdate({
        target: counters.id,
        set: {
          value: sql`${counters.value} + ${amount}`,
          updatedAt,
        },
      })
      .returning()
      .get()

    if (!row) {
      throw new Error('Counter upsert did not return a row')
    }

    return row
  }
}
