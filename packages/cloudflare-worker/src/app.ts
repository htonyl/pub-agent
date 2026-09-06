import { Hono } from 'hono'

import type { AppEnv } from './env'
import { counterRoutes } from './routes/counter-routes'

export const app = new Hono<AppEnv>()

app.get('/health', (c) => c.json({ ok: true }))
app.route('/counters', counterRoutes)
