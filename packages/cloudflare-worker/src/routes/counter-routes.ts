import { Hono } from 'hono'

import type { AppEnv } from '../env'
import { getCounter, incrementCounter } from '../controllers/counter-controller'

export const counterRoutes = new Hono<AppEnv>()

counterRoutes.get('/:name', getCounter)
counterRoutes.post('/:name/increment', incrementCounter)
