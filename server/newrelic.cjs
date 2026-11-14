'use strict'

/**
 * New Relic agent configuration.
 */
exports.config = {
  app_name: [process.env.NEW_RELIC_APP_NAME || 'ai-interviewer-api'],
  license_key: process.env.NEW_RELIC_LICENSE_KEY,
  // Only enable agent if license key is configured; otherwise safely disable to prevent startup errors
  agent_enabled: Boolean(process.env.NEW_RELIC_LICENSE_KEY),
  logging: {
    // Log directly to stdout in container environments to avoid filesystem permission errors
    filepath: 'stdout',
    level: process.env.NEW_RELIC_LOG_LEVEL || 'info',
  },
  distributed_tracing: {
    enabled: true,
  },
  allow_all_headers: true,
  application_logging: {
    forwarding: {
      // Container stdout/stderr is already captured by host newrelic-infra Fluent Bit
      enabled: false,
    },
  },
}
