import fs from 'fs';
import path from 'path';
import { logger } from '~/utils/logger';
import { PluginType, type StarterPluginId } from '~/lib/plugins/types';
import PluginManager from '~/lib/plugins/plugin-manager';
import { readStarterFileMap } from './read-starter-directory';
import type { FileMap } from '~/lib/stores/files';
import { StarterNotAvailableError, StarterNotFoundError } from './errors';
import '~/lib/config/env';

type Starter = {
  instructionsPrompt: string | null;
  technologies: string;
  directory: string;
  examples: string | null;
  ignorePatterns: string[];
};

export class StarterPluginManager {
  static starters: Record<string, Starter> = {};

  static defaultTechnologies: string = 'React, Typescript, TailwindCSS';
  static readonly defaultStarter: StarterPluginId = 'next';
  static starterId: StarterPluginId = `${process.env.STARTER || this.defaultStarter}` as StarterPluginId;

  static async getStarterFileMap(): Promise<FileMap> {
    const starter = this._getStarter();

    logger.info(
      `Reading starter file map for starter ${this.starterId}, directory: ${this._getStarterDirectory(this.starterId)}`,
    );

    return readStarterFileMap({
      dirPath: starter.directory,
      ignorePatterns: starter.ignorePatterns,
      sharedImportsToSkip: this._getSharedImportsToSkip(),
    });
  }

  static getExamples(starterId?: StarterPluginId): string | null {
    return this._getStarter(starterId).examples;
  }

  static getTechnologies(starterId?: StarterPluginId): string {
    return this._getStarter(starterId).technologies;
  }

  static getStarterInstructionsPrompt(starterId?: StarterPluginId): string | null {
    return this._getStarter(starterId).instructionsPrompt;
  }

  static _isAvailable(starter: StarterPluginId): boolean {
    return PluginManager.getInstance().isPluginAvailable(PluginType.STARTER, starter);
  }

  private static _getStarter(starterId?: StarterPluginId): Starter {
    const targetStarterId = starterId || this.starterId;

    if (!this.starters[targetStarterId]) {
      this._checkAvailability(targetStarterId);
      this._checkStarterExists(targetStarterId);

      this.starters[targetStarterId] = {
        instructionsPrompt: this._populateStarterInstructionsPrompt(targetStarterId),
        technologies: this._populateStarterTechnologies(targetStarterId),
        directory: this._getStarterDirectory(targetStarterId),
        examples: this._populateStarterExamples(targetStarterId),
        ignorePatterns: this._populateIgnorePatterns(targetStarterId),
      };
    }

    return this.starters[targetStarterId];
  }

  private static _populateStarterTechnologies(starterId: StarterPluginId): string {
    const techFile = path.join(this._getStarterDirectory(starterId), '.liblab', 'technologies');

    if (!fs.existsSync(techFile)) {
      logger.warn(`Technologies file not found for starter ${starterId}`);

      return this.defaultTechnologies;
    }

    try {
      const content = fs.readFileSync(techFile, 'utf8');

      return content
        .split('\n')
        .map((t) => t.trim())
        .filter(Boolean)
        .join(', ');
    } catch (error) {
      logger.error('Error reading technologies file:', error);

      return this.defaultTechnologies;
    }
  }

  private static _populateStarterInstructionsPrompt(starterId: StarterPluginId): string | null {
    try {
      const promptPath = path.join(this._getStarterDirectory(starterId), '.liblab', 'prompt');

      if (!fs.existsSync(promptPath)) {
        logger.warn(`Starter template prompt file not found for starter ${starterId}`);

        return null;
      }

      return fs.readFileSync(promptPath, 'utf8');
    } catch (error) {
      logger.error('Error reading prompt file:', error);

      return null;
    }
  }

  private static _populateStarterExamples(starterId: StarterPluginId): string | null {
    try {
      const examplesPath = path.join(this._getStarterDirectory(starterId), '.liblab', 'examples');

      if (!fs.existsSync(examplesPath)) {
        logger.warn(`Examples file not found for starter ${starterId}`);

        return null;
      }

      const content = fs.readFileSync(examplesPath, 'utf8');

      return content.trim() ? content : null;
    } catch (error) {
      logger.error('Error reading examples file:', error);

      return null;
    }
  }

  private static _getStarterDirectory(starterId: StarterPluginId): string {
    return path.resolve(process.cwd(), 'starters', `${starterId}-starter`);
  }

  private static _populateIgnorePatterns(starterId: StarterPluginId): string[] {
    const ignoreFile = path.join(this._getStarterDirectory(starterId), '.liblab', 'ignore');

    if (!fs.existsSync(ignoreFile)) {
      return [];
    }

    try {
      const content = fs.readFileSync(ignoreFile, 'utf8');

      return content
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#'));
    } catch (error) {
      logger.error('Error reading ignore file:', error);

      return [];
    }
  }

  private static _getSharedImportsToSkip(): string[] {
    return ['crypto'];
  }

  private static _checkAvailability(starterId: StarterPluginId): void {
    if (!this._isAvailable(starterId)) {
      throw new StarterNotAvailableError(starterId);
    }
  }

  private static _checkStarterExists(starterId: StarterPluginId): void {
    if (!fs.existsSync(this._getStarterDirectory(starterId))) {
      throw new StarterNotFoundError(starterId);
    }
  }
}
