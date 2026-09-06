import type { Context } from 'hono'

import type { AppEnv } from '../env'
import { renderCounter } from '../views/counter-view'

type CounterContext = Context<AppEnv>

function counterStub(c: CounterContext) {
  const name = c.req.param('name') ?? 'default'
  const id = c.env.COUNTERS.idFromName(name)
  return c.env.COUNTERS.get(id)
}

export async function getCounter(c: CounterContext) {
  const counter = await counterStub(c).getCounter()
  return c.json(renderCounter(counter))
}

export async function incrementCounter(c: CounterContext) {
  const body = (await c.req.json().catch(() => ({}))) as { amount?: unknown }
  const amount = body.amount === undefined ? 1 : body.amount

  if (typeof amount !== 'number' || !Number.isInteger(amount)) {
    return c.json({ error: 'amount must be an integer' }, 400)
  }

  const counter = await counterStub(c).incrementCounter(amount)
  return c.json(renderCounter(counter))
}
