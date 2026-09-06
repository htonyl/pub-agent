export type CounterSnapshot = {
  value: number
  updatedAt: Date
}

export type CounterStore = {
  get(): Promise<CounterSnapshot | null>
  increment(amount: number): Promise<CounterSnapshot>
}

export class CounterModel {
  constructor(private readonly store: CounterStore) {}

  async get(): Promise<CounterSnapshot> {
    return (await this.store.get()) ?? {
      value: 0,
      updatedAt: new Date(0),
    }
  }

  increment(amount = 1): Promise<CounterSnapshot> {
    if (!Number.isInteger(amount)) {
      throw new Error('Counter increments must be integers')
    }

    return this.store.increment(amount)
  }
}
