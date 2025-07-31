import { atom } from 'nanostores';
import type { ActionAlert } from '~/types/actions';
import { streamingState } from './stores/streaming';
import { workbenchStore } from '~/lib/stores/workbench';
import { trackTelemetryEvent } from '~/lib/telemetry/telemetry-client';
import { TelemetryEventType } from '~/lib/telemetry/telemetry-manager';
import { chatId } from '~/lib/persistence';

interface ErrorState {
  lastError?: ActionAlert;
  lastAutofixAttempt?: number;
}

export const AUTOFIX_ATTEMPT_EVENT = 'liblab:autofix-attempt';

export class ErrorHandler {
  #state = atom<ErrorState>({});

  // Timeout for skipping duplicated errors when autofix triggered
  #AUTOFIX_ERROR_DEDUPE_TIMEOUT_MS = 30 * 1000; // 30 seconds

  // Prevents endless fixing loops
  #AUTOFIX_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

  constructor() {
    this.#state.set({});
  }

  async handle(currentError: ActionAlert): Promise<void> {
    const conversationId = chatId.get();

    if (conversationId) {
      await trackTelemetryEvent({
        eventType: TelemetryEventType.BUILT_APP_ERROR,
        properties: { conversationId, error: currentError },
      });
    }

    if (streamingState.get() && !workbenchStore.previewsStore.readyForFixing.get()) {
      console.debug('[ErrorHandler] Streaming or loading in progress, skipping error handling...');
      return;
    }

    const now = Date.now();

    if (this.#isAutofixDedupeTimeoutActive(now)) {
      console.debug('[ErrorHandler] Dedupe timeout, skipping....');
      return;
    }

    if (this.#isAutofixCooldownActive(now)) {
      console.debug('[ErrorHandler] Cooldown, setting alert....');
      workbenchStore.setAlert(currentError);

      return;
    }

    this.#sendAutofixEvent(currentError, now);
  }

  #sendAutofixEvent(error: ActionAlert, timestamp: number) {
    console.debug('[ErrorHandler] Sending autofix event:', error);

    const event = new CustomEvent(AUTOFIX_ATTEMPT_EVENT, {
      detail: {
        error,
        timestamp,
      },
    });
    window.dispatchEvent(event);

    this.#state.set({
      lastError: error,
      lastAutofixAttempt: timestamp,
    });
  }

  #isAutofixDedupeTimeoutActive(now: number) {
    const state = this.#state.get();
    return state.lastAutofixAttempt && now - state.lastAutofixAttempt < this.#AUTOFIX_ERROR_DEDUPE_TIMEOUT_MS;
  }

  #isAutofixCooldownActive(now: number) {
    const state = this.#state.get();
    return state.lastAutofixAttempt && now - state.lastAutofixAttempt < this.#AUTOFIX_COOLDOWN_MS;
  }
}

export const errorHandler = new ErrorHandler();
