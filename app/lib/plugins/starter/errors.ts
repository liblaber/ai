import type { StarterPluginId } from '~/lib/plugins/types';

export class StarterNotAvailableError extends Error {
  constructor(starterId: StarterPluginId) {
    super(`Starter ${starterId} is not available under your current license`);
  }
}

export class StarterNotFoundError extends Error {
  constructor(starterId: StarterPluginId) {
    super(`Starter ${starterId} not found`);
  }
}
