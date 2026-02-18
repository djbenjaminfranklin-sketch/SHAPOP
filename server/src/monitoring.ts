import * as Sentry from '@sentry/node'

export function initMonitoring() {
  const dsn = process.env.SENTRY_DSN
  if (!dsn) {
    console.warn('SENTRY_DSN not set — error monitoring disabled')
    return
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1, // 10% of transactions
    ignoreErrors: ['ECONNRESET', 'EPIPE'],
  })

  console.log('Sentry initialized')
}

export { Sentry }
