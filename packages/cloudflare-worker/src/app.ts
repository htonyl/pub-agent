import { Hono } from 'hono'

import type { AppEnv } from './env'
import { counterRoutes } from './routes/counter-routes'
import { documentRoutes } from './routes/document-routes'
import { collaborateDocument, renderDocumentPage } from './controllers/document-web-controller'

export const app = new Hono<AppEnv>()

app.get('/health', (c) => c.json({ ok: true }))
app.route('/counters', counterRoutes)
app.route('/api/v1', documentRoutes)
app.route('/mcp/v1', documentRoutes)
app.get('/documents/:id', renderDocumentPage)
app.get('/documents/:id/collaborate', collaborateDocument)
