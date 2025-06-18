import { type DeploymentPlugin } from '~/types/deployment';
import { mkdir, readFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import AdmZip from 'adm-zip';
import { v4 as uuidv4 } from 'uuid';
import { runInNewContext } from 'vm';
import { createRequire } from 'module';
import * as ts from 'typescript';
import { prisma } from '~/lib/prisma';

interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  entryPoint: string;
}

export class PluginManager {
  private static _instance: PluginManager;
  private _pluginDir: string;

  private constructor() {
    this._pluginDir = join(tmpdir(), 'deployment-plugins');
  }

  static getInstance(): PluginManager {
    if (!PluginManager._instance) {
      PluginManager._instance = new PluginManager();
    }

    return PluginManager._instance;
  }

  async installPlugin(zipBuffer: Buffer): Promise<DeploymentPlugin> {
    // Create a temporary directory for the plugin
    const pluginId = uuidv4();
    const pluginPath = join(this._pluginDir, pluginId);
    await mkdir(pluginPath, { recursive: true });

    // Extract the zip file
    const zip = new AdmZip(zipBuffer);
    zip.extractAllTo(pluginPath, true);

    // Read and validate plugin metadata
    const metadataPath = join(pluginPath, 'plugin.json');
    const metadataContent = await readFile(metadataPath, 'utf-8');
    const metadata: PluginMetadata = JSON.parse(metadataContent);

    // Validate required files
    const entryPointPath = join(pluginPath, metadata.entryPoint);

    try {
      await readFile(entryPointPath, 'utf-8');
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      throw new Error(`Plugin entry point not found: ${metadata.entryPoint}`);
    }

    // Compile TypeScript to JavaScript in memory
    const compiledCode = await this._compileTypeScript(pluginPath, metadata.entryPoint);

    // Create a sandboxed environment for the plugin
    const moduleExports: { default?: DeploymentPlugin } = {};
    const sandbox = {
      exports: moduleExports,
      module: { exports: moduleExports },
      require: createRequire(entryPointPath),
      console: {
        log: (...args: any[]) => {
          console.log(`[Plugin ${metadata.id}]`, ...args);
        },
        error: (...args: any[]) => {
          console.error(`[Plugin ${metadata.id}]`, ...args);
        },
      },
      process: {
        env: process.env,
      },
    };

    // Load and validate the plugin
    runInNewContext(compiledCode, sandbox, {
      filename: entryPointPath,
      timeout: 5000,
    });

    // Get the plugin from either default export or module.exports
    const finalPlugin = sandbox.module.exports.default || sandbox.module.exports;

    // Validate plugin interface
    if (!this._validatePlugin(finalPlugin)) {
      throw new Error('Invalid plugin implementation');
    }

    // Store the plugin in the database
    const createdPlugin = await prisma.plugin.create({
      data: {
        id: pluginId,
        name: metadata.name,
        description: metadata.description,
        icon: finalPlugin.icon,
        version: metadata.version,
        author: metadata.author,
        code: compiledCode,
        metadata: JSON.stringify(metadata),
        isEnabled: true,
      },
    });

    // Clean up temporary directory
    await rm(pluginPath, { recursive: true, force: true });

    return { ...finalPlugin, id: createdPlugin.id };
  }

  async loadPlugin(pluginId: string): Promise<DeploymentPlugin | null> {
    // Load plugin from database
    const pluginData = await prisma.plugin.findUnique({
      where: { id: pluginId },
    });

    if (!pluginData) {
      return null;
    }

    // Create a sandboxed environment for the plugin
    const moduleExports: { default?: DeploymentPlugin } = {};
    const sandbox = {
      exports: moduleExports,
      module: { exports: moduleExports },
      require: createRequire(import.meta.url),
      console: {
        log: (...args: any[]) => {
          console.log(`[Plugin ${pluginId}]`, ...args);
        },
        error: (...args: any[]) => {
          console.error(`[Plugin ${pluginId}]`, ...args);
        },
      },
      process: {
        env: process.env,
      },
    };

    // Load and validate the plugin
    runInNewContext(pluginData.code, sandbox, {
      filename: `${pluginId}.js`,
      timeout: 5000,
    });

    // Get the plugin from either default export or module.exports
    const plugin = sandbox.module.exports.default || sandbox.module.exports;

    // Validate plugin interface
    if (!this._validatePlugin(plugin)) {
      throw new Error('Invalid plugin implementation');
    }

    return { ...plugin, id: pluginData.id };
  }

  async getAllPlugins(): Promise<DeploymentPlugin[]> {
    const plugins: DeploymentPlugin[] = [];
    const pluginRecords = await prisma.plugin.findMany({
      where: { isEnabled: true },
    });

    for (const record of pluginRecords) {
      const plugin = await this.loadPlugin(record.id);

      if (plugin) {
        plugins.push(plugin);
      }
    }

    return plugins;
  }

  async getPluginById(id: string): Promise<DeploymentPlugin | null> {
    return this.loadPlugin(id);
  }

  async deletePlugin(id: string): Promise<void> {
    const plugin = await prisma.plugin.findUnique({
      where: { id },
    });

    if (!plugin) {
      throw new Error('Plugin not found');
    }

    await prisma.plugin.delete({
      where: { id },
    });
  }

  private async _compileTypeScript(pluginPath: string, entryPoint: string): Promise<string> {
    const entryPointPath = join(pluginPath, entryPoint);
    const sourceCode = await readFile(entryPointPath, 'utf-8');

    const result = ts.transpileModule(sourceCode, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.CommonJS,
        esModuleInterop: true,
      },
    });

    return result.outputText;
  }

  private _validatePlugin(plugin: any): plugin is DeploymentPlugin {
    return (
      typeof plugin === 'object' &&
      plugin !== null &&
      typeof plugin.id === 'string' &&
      typeof plugin.name === 'string' &&
      typeof plugin.description === 'string' &&
      typeof plugin.icon === 'string' &&
      typeof plugin.theme === 'object' &&
      typeof plugin.isEnabled === 'function' &&
      typeof plugin.deploy === 'function'
    );
  }
}
