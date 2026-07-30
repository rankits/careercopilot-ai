import { SubscribeOptions } from '@/infrastructure/messaging/messaging.interface.js';

export const MessageExchanges = {
  DOMAIN_EVENTS: 'careercopilot.events',
  NOTIFICATIONS: 'careercopilot.notifications',
} as const;

export const MessageQueues = {
  AUTH_USER_SIGNED_IN: 'careercopilot.auth.user_signed_in',
  EMAIL_SEND: 'careercopilot.email.send',
} as const;

export const MessageRoutingKeys = {
  AUTH_SIGNIN: 'auth.signin',
  AUTH_UPDATED: 'auth.updated',
  USER_REGISTERED: 'user.registered',
  EMAIL_SEND: 'email.send',
} as const;

export const QoSPresets: Record<string, SubscribeOptions> = {
  DEFAULT: {
    dlq: true,
    maxRetries: 3,
    retryDelayMs: 5000,
    prefetch: 10,
    quorum: false,
  },
  HIGH_THROUGHPUT: {
    dlq: true,
    maxRetries: 1,
    retryDelayMs: 1000,
    prefetch: 50,
    quorum: false,
  },
  RELIABLE_DLQ: {
    dlq: true,
    maxRetries: 5,
    retryDelayMs: 10000,
    prefetch: 5,
    quorum: false,
  },
  CRITICAL_HA: {
    dlq: true,
    maxRetries: 3,
    retryDelayMs: 5000,
    prefetch: 10,
    quorum: true,
  },
} as const;
