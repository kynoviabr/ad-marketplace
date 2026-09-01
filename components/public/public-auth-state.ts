import 'server-only'

import { cache } from 'react'
import { getSession } from '@/modules/auth/dal'

/** Shared, request-local auth state for independently rendered public chrome. */
export const getPublicIsAuthenticated = cache(async () => Boolean(await getSession()))
