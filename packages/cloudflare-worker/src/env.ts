import type { CounterDurableObject } from './durable-objects/counter-durable-object'
import type { DocumentDurableObject } from './durable-objects/document-durable-object'

export type CloudflareBindings = {
  COUNTERS: DurableObjectNamespace<CounterDurableObject>
  DOCUMENTS: DurableObjectNamespace<DocumentDurableObject>
  PUBAGENT_AUTH_SECRET?: string
}

export type AppEnv = {
  Bindings: CloudflareBindings
}
