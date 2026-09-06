import { describe, expect, it } from 'vitest'

import { CounterModel, type CounterSnapshot, type CounterStore } from '../src/models/counter-model'

class InMemoryCounterStore implements CounterStore {
  private value = 0
  private updatedAt = new Date(0)

  get(): Promise<CounterSnapshot> {
    return Promise.resolve({ value: this.value, updatedAt: this.updatedAt })
  }

  increment(amount: number): Promise<CounterSnapshot> {
    this.value += amount
    this.updatedAt = new Date(1)
    return this.get()
  }
}

describe('CounterModel', () => {
  it('returns an empty counter when the store has no row', async () => {
    const store: CounterStore = {
      get: () => Promise.resolve(null),
      increment: (amount) => Promise.resolve({ value: amount, updatedAt: new Date(1) }),
    }

    await expect(new CounterModel(store).get()).resolves.toEqual({
      value: 0,
      updatedAt: new Date(0),
    })
  })

  it('delegates integer increments to the store', async () => {
    const model = new CounterModel(new InMemoryCounterStore())

    await expect(model.increment(2)).resolves.toMatchObject({ value: 2 })
    await expect(model.increment()).resolves.toMatchObject({ value: 3 })
  })

  it('rejects non-integer increments', () => {
    const model = new CounterModel(new InMemoryCounterStore())

    expect(() => model.increment(1.5)).toThrow('Counter increments must be integers')
  })
})
