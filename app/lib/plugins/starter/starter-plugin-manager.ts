import fs from 'fs';
import path from 'path';
import { logger } from '~/utils/logger';
import { PluginType, type StarterPluginId } from '~/lib/plugins/types';
import PluginManager from '~/lib/plugins/plugin-manager';
import { readStarterFileMap } from './read-starter-directory';
import type { FileMap } from '~/lib/stores/files';
import { StarterNotAvailableError, StarterNotFoundError } from './errors';

export class StarterPluginManager {
  static starterInstructionsPrompt: string | null;
  static starterTechnologies: string | null;
  static defaultTechnologies: string = 'React, Typescript, TailwindCSS';
  static readonly defaultStarter: StarterPluginId = 'remix';
  static starterId: StarterPluginId = `${process.env.STARTER || this.defaultStarter}` as StarterPluginId;
  static starterDirectory = path.resolve(process.cwd(), 'starters', `${this.starterId}-starter`);

  static isAvailable(starter: StarterPluginId = this.starterId): boolean {
    return PluginManager.getInstance().isPluginAvailable(PluginType.STARTER, starter);
  }

  static getTechnologies(): string {
    if (this.starterTechnologies) {
      return this.starterTechnologies;
    }

    this._checkAvailability();
    this._checkStarterExists();

    const techFile = path.join(this.starterDirectory, '.liblab', 'technologies');

    if (!fs.existsSync(techFile)) {
      logger.warn(`Technologies file not found for starter ${this.starterId}`);
      return this.defaultTechnologies;
    }

    try {
      const content = fs.readFileSync(techFile, 'utf8');

      this.starterTechnologies = content
        .split('\n')
        .map((t) => t.trim())
        .filter(Boolean)
        .join(', ');

      return this.starterTechnologies;
    } catch (error) {
      logger.error('Error reading technologies file:', error);
      return this.defaultTechnologies;
    }
  }

  static getStarterInstructionsPrompt(): string | null {
    if (this.starterInstructionsPrompt) {
      return this.starterInstructionsPrompt;
    }

    this._checkAvailability();
    this._checkStarterExists();

    try {
      const promptPath = path.join(this.starterDirectory, '.liblab', 'prompt');

      if (!fs.existsSync(promptPath)) {
        logger.warn(`Starter template prompt file not found for starter ${this.starterId}`);
        return null;
      }

      this.starterInstructionsPrompt = fs.readFileSync(promptPath, 'utf8');

      return this.starterInstructionsPrompt;
    } catch (error) {
      logger.error('Error reading prompt file:', error);
      return null;
    }
  }

  static async getStarterFileMap(): Promise<FileMap> {
    this._checkAvailability();
    this._checkStarterExists();

    logger.info(`Reading starter file map for starter ${this.starterId}, directory: ${this.starterDirectory}`);

    return readStarterFileMap({
      dirPath: this.starterDirectory,
      directoriesToSkip: this._getDirectoriesToSkip(),
      filesToSkip: this._getFilesToSkip(),
      sharedImportsToSkip: this._getSharedImportsToSkip(),
    });
  }

  static getExamples(): string | null {
    this._checkAvailability();
    this._checkStarterExists();

    try {
      const examplesPath = path.join(this.starterDirectory, '.liblab', 'examples');

      if (!fs.existsSync(examplesPath)) {
        logger.warn(`Examples file not found for starter ${this.starterId}`);
        return null;
      }

      const content = fs.readFileSync(examplesPath, 'utf8');

      return content.trim() ? content : null;
    } catch (error) {
      logger.error('Error reading examples file:', error);
      return null;
    }
  }

  private static _getDirectoriesToSkip(): string[] {
    switch (this.starterId) {
      case 'remix':
        return ['node_modules', 'build', '.idea', '.vscode', '.cache', 'analytics-dashboard'];
      case 'next':
        return ['node_modules', '.next', '.idea', '.vscode', '.cache'];
      default:
        return [];
    }
  }

  private static _getFilesToSkip(): string[] {
    switch (this.starterId) {
      case 'remix':
        return [
          'package-lock.json',
          'yarn.lock',
          'pnpm-lock.yaml',
          '.DS_Store',
          'resources.builds.ts',
          'analytics-dashboard.tsx',
        ];
      case 'next':
        return ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', '.DS_Store'];
      default:
        return [];
    }
  }

  private static _getSharedImportsToSkip(): string[] {
    return ['crypto'];
  }

  private static _checkAvailability(): void {
    if (!this.isAvailable()) {
      throw new StarterNotAvailableError(this.starterId);
    }
  }

  private static _checkStarterExists(): void {
    if (!fs.existsSync(this.starterDirectory)) {
      throw new StarterNotFoundError(this.starterId);
    }
  }
}
