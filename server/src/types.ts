import type { Request } from 'express'

// Extend Request type for auth
export type AuthenticatedRequest = Request & { user?: { id: string; email?: string } }
