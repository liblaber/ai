import { atom } from 'nanostores';
import type { CodeError } from '~/types/actions';
import { streamingState } from './stores/streaming';
import { workbenchStore } from '~/lib/stores/workbench';
import { trackTelemetryEvent } from '~/lib/telemetry/telemetry-client';
import { TelemetryEventType } from '~/lib/telemetry/telemetry-manager';
import { chatId } from '~/lib/persistence';
import { createScopedLogger } from '~/utils/logger';

interface ErrorState {
  lastAutofixAttempt?: number;
  collectedErrors: CodeError[];
  isSubscribedToIsCollectingErrors: boolean;
}

export const AUTOFIX_ATTEMPT_EVENT = 'liblab:autofix-attempt';

const logger = createScopedLogger('ErrorHandler');

export class ErrorHandler {
  #state = atom<ErrorState>({
    collectedErrors: [],
    isSubscribedToIsCollectingErrors: false,
  });

  // Timeout for skipping duplicated errors when autofix triggered
  #AUTOFIX_ERROR_DEDUPE_TIMEOUT_MS = 5 * 1000; // 5 seconds

  // Prevents endless fixing loops
  #AUTOFIX_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

  constructor() {
    this.#state.set({
      collectedErrors: [],
      isSubscribedToIsCollectingErrors: false,
    });
  }

  getCollectedErrors() {
    return this.#state.get().collectedErrors;
  }

  async handle(currentError: CodeError): Promise<void> {
    logger.debug('handle', currentError);

    const conversationId = chatId.get();

    if (conversationId) {
      await trackTelemetryEvent({
        eventType: TelemetryEventType.BUILT_APP_ERROR,
        properties: { conversationId, error: currentError },
      });
    }

    if (streamingState.get()) {
      logger.debug('Streaming in progress, skipping error handling...');
      return;
    }

    // Check if we're in the error collection period
    if (workbenchStore.previewsStore.isCollectingErrors.get()) {
      logger.debug('Error collection period active, collecting error:', currentError.title);
      this.#collectError(currentError);

      return;
    }

    const now = Date.now();

    if (this.#isAutofixDedupeTimeoutActive(now)) {
      logger.debug('Dedupe timeout, skipping....');
      return;
    }

    if (this.#shouldAutofix(now)) {
      this.#sendAutofixEvent([currentError], now);
      return;
    }

    logger.debug('Skipping autofix, setting code error...');
    workbenchStore.pushCodeError(currentError);

    if (workbenchStore.previewsStore.isLoading.get()) {
      workbenchStore.previewsStore.isLoading.set(false);
      workbenchStore.previewsStore.isFixingIssues.set(false);
    }
  }

  #collectError(error: CodeError) {
    const state = this.#state.get();
    const updatedErrors = [...state.collectedErrors, error];

    this.#state.set({
      ...state,
      collectedErrors: updatedErrors,
    });

    logger.debug(`Collected ${updatedErrors.length} errors during collection period`);
    logger.debug(`Latest collected error: ${error.title} (${error.type})`);

    if (!state.isSubscribedToIsCollectingErrors) {
      this.#subscribeToIsCollectingErrors();
    }
  }

  #subscribeToIsCollectingErrors() {
    const state = this.#state.get();

    if (state.isSubscribedToIsCollectingErrors) {
      return;
    }

    logger.debug('Subscribing to readyForFixing state changes');

    this.#state.set({
      ...state,
      isSubscribedToIsCollectingErrors: true,
    });

    workbenchStore.previewsStore.isCollectingErrors.subscribe((isCollectingErrors) => {
      logger.debug('isCollectingErrors flag isCollectingErrors to', isCollectingErrors);

      if (isCollectingErrors) {
        return;
      }

      this.#processCollectedErrors();
    });
  }

  #processCollectedErrors() {
    const state = this.#state.get();
    const collectedErrors = state.collectedErrors;

    if (collectedErrors.length === 0) {
      logger.debug('No collected errors to process');
      return;
    }

    logger.debug(`Processing ${collectedErrors.length} collected errors`);
    logger.debug(
      'Collected errors list:',
      collectedErrors.map((error, index) => `${index + 1}. ${error.title} (${error.type})`).join(', '),
    );

    this.#state.set({
      ...state,
      collectedErrors: [],
    });

    const now = Date.now();

    if (this.#isAutofixDedupeTimeoutActive(now)) {
      logger.debug('Dedupe timeout, skipping collected errors....');
      return;
    }

    if (this.#shouldAutofix(now)) {
      this.#sendAutofixEvent(collectedErrors, now);
      return;
    }

    logger.debug('Skipping autofix, setting issue alert...');

    workbenchStore.codeErrors.set(collectedErrors);

    if (workbenchStore.previewsStore.isLoading.get()) {
      workbenchStore.previewsStore.isLoading.set(false);
      workbenchStore.previewsStore.isFixingIssues.set(false);
    }
  }

  #sendAutofixEvent(errors: CodeError[], timestamp: number) {
    logger.debug('Sending autofix event...');

    const event = new CustomEvent(AUTOFIX_ATTEMPT_EVENT, {
      detail: {
        errors,
        timestamp,
      },
    });
    window.dispatchEvent(event);

    this.#state.set({
      ...this.#state.get(),
      collectedErrors: [],
      lastAutofixAttempt: timestamp,
    });
  }

  #isAutofixDedupeTimeoutActive(now: number) {
    const state = this.#state.get();
    return state.lastAutofixAttempt && now - state.lastAutofixAttempt < this.#AUTOFIX_ERROR_DEDUPE_TIMEOUT_MS;
  }

  #shouldAutofix(now: number) {
    const state = this.#state.get();

    return !state.lastAutofixAttempt || now - state.lastAutofixAttempt >= this.#AUTOFIX_COOLDOWN_MS;
  }
}

export const errorHandler = new ErrorHandler();
