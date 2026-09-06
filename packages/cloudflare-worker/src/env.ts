import type { CounterDurableObject } from './durable-objects/counter-durable-object'

export type CloudflareBindings = {
  COUNTERS: DurableObjectNamespace<CounterDurableObject>
}

export type AppEnv = {
  Bindings: CloudflareBindings
}
