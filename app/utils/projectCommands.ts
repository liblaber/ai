import type { Message } from 'ai';
import { generateId } from './fileUtils';
import type { File, FileMap } from '~/lib/stores/files';
import { extractRelativePath } from '~/utils/diff';
import { logger } from './logger';
import { PROJECT_SETUP_ANNOTATION } from '~/utils/constants';

export interface ProjectCommands {
  type: string;
  setupCommand?: string;
  startCommand?: string;
  followupMessage: string;
}

export async function detectProjectCommandsFromFileMap(fileMap: FileMap): Promise<ProjectCommands | null> {
  const packageJsonFileKey: string | undefined = Object.keys(fileMap).find(
    (path) => extractRelativePath(path) === 'package.json',
  );

  if (!packageJsonFileKey) {
    logger.warn('No package.json file found.');
    return null;
  }

  const packageJsonFile = fileMap[packageJsonFileKey] as File;

  return detectProjectCommands(packageJsonFile);
}

export function detectProjectCommands(packageJson: File): ProjectCommands | null {
  try {
    const packageJsonContent = JSON.parse(packageJson.content);
    const scripts = packageJsonContent?.scripts || {};

    const preferredCommands = ['dev', 'start', 'preview'];
    const availableCommand = preferredCommands.find((cmd) => scripts[cmd]);

    if (availableCommand) {
      return {
        type: 'Node.js',
        startCommand: `npm run ${availableCommand}`,
        followupMessage: `I’m starting your app now...`,
      };
    }

    return {
      type: 'Node.js',
      setupCommand: 'pnpm install',
      followupMessage:
        'Would you like me to inspect package.json to determine the available scripts for running this project?',
    };
  } catch (error) {
    logger.error('Error parsing package.json:', error);
    return null;
  }
}

export function createCommandsMessage(commands: ProjectCommands): Message {
  let commandString = '';

  if (commands.setupCommand) {
    commandString += `
<liblabAction type="shell">${commands.setupCommand}</liblabAction>`;
  }

  if (commands.startCommand) {
    commandString += `
<liblabAction type="start">${commands.startCommand}</liblabAction>
`;
  }

  return {
    role: 'assistant',
    content: `${commands.followupMessage ? `${commands.followupMessage}` : ''}\n\n
<liblabArtifact id="project-setup" title="Project Setup">
${commandString}
</liblabArtifact>`,
    id: generateId(),
    createdAt: new Date(),
    annotations: [PROJECT_SETUP_ANNOTATION],
  };
}

export function escapeLiblabArtifactTags(input: string) {
  // Regular expression to match liblabArtifact tags and their content
  const regex = /(<liblabArtifact[^>]*>)([\s\S]*?)(<\/liblabArtifact>)/g;

  return input.replace(regex, (match, openTag, content, closeTag) => {
    // Escape the opening tag
    const escapedOpenTag = openTag.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Escape the closing tag
    const escapedCloseTag = closeTag.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Return the escaped version
    return `${escapedOpenTag}${content}${escapedCloseTag}`;
  });
}

export function escapeLiblabActionTags(input: string) {
  // Regular expression to match liblabArtifact tags and their content
  const regex = /(<liblabAction[^>]*>)([\s\S]*?)(<\/liblabAction>)/g;

  return input.replace(regex, (match, openTag, content, closeTag) => {
    // Escape the opening tag
    const escapedOpenTag = openTag.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Escape the closing tag
    const escapedCloseTag = closeTag.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Return the escaped version
    return `${escapedOpenTag}${content}${escapedCloseTag}`;
  });
}

export function escapeLiblabTags(input: string) {
  return escapeLiblabArtifactTags(escapeLiblabActionTags(input));
}
