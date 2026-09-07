import 'server-only'

import { cache } from 'react'
import { getAccount, getSession } from '@/modules/auth/dal'

/** Shared, request-local auth state for independently rendered public chrome. */
export const getPublicIsAuthenticated = cache(async () => Boolean(await getSession()))

export const getPublicAccount = cache(async () => await getAccount())
