import { Hono } from 'hono'

import type { AppEnv } from '../env'
import {
  approveDocument,
  applyDocumentUpdate,
  createDocument,
  createReviewLink,
  applyDocumentOperation,
  applyYjsDocumentUpdate,
  getDocument,
  getDocumentVersion,
  getDocumentOperationSnapshot,
  getYjsDocumentSnapshot,
} from '../controllers/document-controller'

export const documentRoutes = new Hono<AppEnv>()

documentRoutes.post('/documents', createDocument)
documentRoutes.get('/documents/:id', getDocument)
documentRoutes.get('/documents/:id/versions/:version', getDocumentVersion)
documentRoutes.post('/documents/:id/updates', applyDocumentUpdate)
documentRoutes.post('/documents/:id/operations', applyDocumentOperation)
documentRoutes.get('/documents/:id/snapshot', getDocumentOperationSnapshot)
documentRoutes.post('/documents/:id/yjs-updates', applyYjsDocumentUpdate)
documentRoutes.get('/documents/:id/yjs-snapshot', getYjsDocumentSnapshot)
documentRoutes.post('/documents/:id/approve', approveDocument)
documentRoutes.post('/documents/:id/review-links', createReviewLink)
