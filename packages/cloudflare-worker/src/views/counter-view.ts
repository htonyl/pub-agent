import type { CounterSnapshot } from '../models/counter-model'

export function renderCounter(counter: CounterSnapshot) {
  return {
    value: counter.value,
    updatedAt: counter.updatedAt.toISOString(),
  }
}
