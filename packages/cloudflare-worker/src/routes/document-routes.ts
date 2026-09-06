import { Hono } from 'hono'

import type { AppEnv } from '../env'
import {
  approveDocument,
  applyDocumentUpdate,
  createDocument,
  createReviewLink,
  getDocument,
  getDocumentVersion,
} from '../controllers/document-controller'

export const documentRoutes = new Hono<AppEnv>()

documentRoutes.post('/documents', createDocument)
documentRoutes.get('/documents/:id', getDocument)
documentRoutes.get('/documents/:id/versions/:version', getDocumentVersion)
documentRoutes.post('/documents/:id/updates', applyDocumentUpdate)
documentRoutes.post('/documents/:id/approve', approveDocument)
documentRoutes.post('/documents/:id/review-links', createReviewLink)
