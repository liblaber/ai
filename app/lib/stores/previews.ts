import type { WebContainer } from '@webcontainer/api';
import { atom } from 'nanostores';
import { errorHandler } from '~/lib/error-handler';

// Extend Window interface to include our custom property
declare global {
  interface Window {
    _tabId?: string;
  }
}

export interface PreviewInfo {
  port: number;
  ready: boolean;
  baseUrl: string;
}

const ERROR_COLLECTION_PERIOD_MS = 2000;

export class PreviewsStore {
  previews = atom<PreviewInfo[]>([]);
  isLoading = atom<boolean>(false);
  loadingText = atom<string>('Initializing environment...');
  isCollectingErrors = atom<boolean>(false);
  isFixingIssues = atom<boolean>(false);
  #availablePreviews = new Map<number, PreviewInfo>();
  #webcontainer: Promise<WebContainer>;
  #errorCollectionTimeout: NodeJS.Timeout | null = null;

  constructor(webcontainerPromise: Promise<WebContainer>) {
    this.#webcontainer = webcontainerPromise;

    this.#init();
  }

  startErrorCollectionPeriod() {
    console.debug('[PreviewsStore] Finishing loading, starting error collection period...');
    this.isCollectingErrors.set(true);
    this.isFixingIssues.set(false);

    if (this.#errorCollectionTimeout) {
      clearTimeout(this.#errorCollectionTimeout);
    }

    this.#errorCollectionTimeout = setTimeout(() => {
      if (!errorHandler.getCollectedErrors().length) {
        console.log('Setting isLoading to false...');
        this.isLoading.set(false);
        this.loadingText.set('Loading...');
      }

      this.isCollectingErrors.set(false);
    }, ERROR_COLLECTION_PERIOD_MS);
  }

  almostReadyLoading() {
    this.isLoading.set(true);
    this.loadingText.set('Your app is almost ready! Making final touches...');
  }

  startLoading() {
    this.loadingText.set('Your app is loading...');
    this.isLoading.set(true);
    this.isCollectingErrors.set(false);
  }

  fixingIssues() {
    this.isLoading.set(true);
    this.isFixingIssues.set(true);
    this.loadingText.set('Fixing detected issues... Almost there!');
  }

  preparingEnvironment() {
    this.loadingText.set('Preparing environment...');
    this.isLoading.set(true);
  }

  async #init() {
    const webcontainer = await this.#webcontainer;

    // Listen for server ready events
    webcontainer.on('server-ready', (port, url) => {
      console.log('[Preview] Server ready on port:', port, url);
      this.startLoading();
    });

    // Listen for port events
    webcontainer.on('port', (port, type, url) => {
      this.startLoading();

      let previewInfo = this.#availablePreviews.get(port);

      if (type === 'close' && previewInfo) {
        this.#availablePreviews.delete(port);
        this.previews.set(this.previews.get().filter((preview) => preview.port !== port));

        return;
      }

      const previews = this.previews.get();

      if (!previewInfo) {
        previewInfo = { port, ready: type === 'open', baseUrl: url };
        this.#availablePreviews.set(port, previewInfo);
        previews.push(previewInfo);
      }

      previewInfo.ready = type === 'open';
      previewInfo.baseUrl = url;

      this.previews.set([...previews]);

      if (type === 'open') {
        this.startLoading();
      }
    });
  }
}
