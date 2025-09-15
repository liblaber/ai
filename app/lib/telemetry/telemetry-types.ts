export enum TelemetryEventType {
  // App start success is tracked in instrumentation.ts on app startup
  APP_START_SUCCESS = 'APP_START_SUCCESS',
  APP_ERROR = 'APP_ERROR',
  SETUP_SUCCESS = 'SETUP_SUCCESS',
  SETUP_ERROR = 'SETUP_ERROR',
  USER_CHAT_RETRY = 'USER_CHAT_RETRY',
  USER_CHAT_REVERT = 'USER_CHAT_REVERT',
  USER_CHAT_FORK = 'USER_CHAT_FORK',
  USER_CHAT_PROMPT = 'USER_CHAT_PROMPT',
  USER_APP_DEPLOY = 'USER_APP_DEPLOY',
  USER_APP_DEPLOY_ERROR = 'USER_APP_DEPLOY_ERROR',
  BUILT_APP_ERROR = 'BUILT_APP_ERROR',
  USER_TELEMETRY_CONSENT = 'USER_TELEMETRY_CONSENT',
}

export interface TelemetryEvent {
  eventType: TelemetryEventType;
  properties?: Record<string, any>;
}
