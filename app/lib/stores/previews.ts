import type { WebContainer } from '@webcontainer/api';
import { atom } from 'nanostores';

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

export class PreviewsStore {
  previews = atom<PreviewInfo[]>([]);
  isLoading = atom<boolean>(false);
  loadingText = atom<string>('Loading...');
  readyForFixing = atom<boolean>(false);
  #availablePreviews = new Map<number, PreviewInfo>();
  #webcontainer: Promise<WebContainer>;

  constructor(webcontainerPromise: Promise<WebContainer>) {
    this.#webcontainer = webcontainerPromise;

    this.#init();
  }

  finishLoading() {
    this.isLoading.set(false);
    this.readyForFixing.set(true);
    this.loadingText.set('Loading...');
  }

  almostReadyLoading() {
    this.isLoading.set(true);
    this.readyForFixing.set(true);
    this.loadingText.set('Your app is almost ready! Making final touches...');
  }

  changesLoading() {
    this.isLoading.set(true);
    this.loadingText.set('Loading changes...');
  }

  startLoading() {
    this.loadingText.set('Your app is loading...');
    this.isLoading.set(true);
    this.readyForFixing.set(false);
  }

  makingChanges() {
    this.loadingText.set('Making changes...');
    this.isLoading.set(true);
  }

  fixingIssues() {
    this.isLoading.set(true);
    this.loadingText.set('Fixing issues... Almost there!');
    this.readyForFixing.set(false);
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
