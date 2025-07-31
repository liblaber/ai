import { type Message } from 'ai';
import { DATA_SOURCE_ID_REGEX, FIRST_USER_MESSAGE_REGEX, ASK_LIBLAB_REGEX, FILES_REGEX } from '~/utils/constants';
import { type FileMap, IGNORE_PATTERNS } from './constants';
import ignore from 'ignore';
import type { ContextAnnotation } from '~/types/context';
import { freeEmailDomains } from 'free-email-domains-typescript';

interface UserMessage {
  isFirstUserMessage?: boolean;
  dataSourceId?: string;
  content: string;
  askLiblab?: boolean;
}

export function extractPropertiesFromMessage(message: Omit<Message, 'id'>): UserMessage {
  const textContent = Array.isArray(message.content)
    ? message.content.find((item) => item.type === 'text')?.text || ''
    : message.content;

  const isFirstUserMessageMatch = textContent.match(FIRST_USER_MESSAGE_REGEX);
  const dataSourceIdMatch = textContent.match(DATA_SOURCE_ID_REGEX);
  const askLiblabMatch = textContent.match(ASK_LIBLAB_REGEX);

  const isFirstUserMessage = isFirstUserMessageMatch ? isFirstUserMessageMatch[1] === 'true' : false;
  const dataSourceId = dataSourceIdMatch ? dataSourceIdMatch[1] : undefined;
  const askLiblab = askLiblabMatch ? askLiblabMatch[1] === 'true' : false;
  const cleanedContent = Array.isArray(message.content)
    ? message.content.map((item) => {
        if (item.type === 'text') {
          return {
            type: 'text',
            text: item.text
              ?.replace(FIRST_USER_MESSAGE_REGEX, '')
              .replace(DATA_SOURCE_ID_REGEX, '')
              .replace(ASK_LIBLAB_REGEX, '')
              .replace(FILES_REGEX, ''),
          };
        }

        return item; // Preserve image_url and other types as is
      })
    : textContent
        .replace(FIRST_USER_MESSAGE_REGEX, '')
        .replace(DATA_SOURCE_ID_REGEX, '')
        .replace(ASK_LIBLAB_REGEX, '')
        .replace(FILES_REGEX, '');

  return {
    content: cleanedContent,
    isFirstUserMessage,
    dataSourceId,
    askLiblab,
  };
}

export function simplifyLiblabActions(input: string): string {
  // Using regex to match liblabAction tags that have type="file"
  const regex = /(<liblabAction[^>]*type="file"[^>]*>)([\s\S]*?)(<\/liblabAction>)/g;

  // Replace each matching occurrence
  return input.replace(regex, (_0, openingTag, _2, closingTag) => {
    return `${openingTag}\n          ...\n        ${closingTag}`;
  });
}

export function createFilesContext(files: FileMap, useRelativePath?: boolean) {
  const ig = ignore().add(IGNORE_PATTERNS);
  let filePaths = Object.keys(files);
  filePaths = filePaths.filter((x) => {
    const relPath = x.replace('/home/project/', '');
    return !ig.ignores(relPath);
  });

  const fileContexts = filePaths
    .filter((x) => files[x] && files[x].type == 'file')
    .map((path) => {
      const dirent = files[path];

      if (!dirent || dirent.type == 'folder') {
        return '';
      }

      const codeWithLinesNumbers = dirent.content
        .split('\n')
        // .map((v, i) => `${i + 1}|${v}`)
        .join('\n');

      let filePath = path;

      if (useRelativePath) {
        filePath = path.replace('/home/project/', '');
      }

      return `<liblabAction type="file" filePath="${filePath}">${codeWithLinesNumbers}</liblabAction>`;
    });

  return `<liblabArtifact id="code-content" title="Code Content" >\n${fileContexts.join('\n')}\n</liblabArtifact>`;
}

export function extractCurrentContext(messages: Message[]) {
  const lastAssistantMessage = messages.filter((x) => x.role == 'assistant').slice(-1)[0];

  if (!lastAssistantMessage) {
    return { summary: undefined, codeContext: undefined };
  }

  let summary: ContextAnnotation | undefined;
  let codeContext: ContextAnnotation | undefined;

  if (!lastAssistantMessage.annotations?.length) {
    return { summary: undefined, codeContext: undefined };
  }

  for (let i = 0; i < lastAssistantMessage.annotations.length; i++) {
    const annotation = lastAssistantMessage.annotations[i];

    if (!annotation || typeof annotation !== 'object') {
      continue;
    }

    if (!(annotation as any).type) {
      continue;
    }

    const annotationObject = annotation as any;

    if (annotationObject.type === 'codeContext') {
      codeContext = annotationObject;
      break;
    } else if (annotationObject.type === 'chatSummary') {
      summary = annotationObject;
      break;
    }
  }

  return { summary, codeContext };
}

export function isFreeEmailDomain(domain: string): boolean {
  return freeEmailDomains.includes(domain.toLowerCase());
}

export function capitalizeFirstLetter(str: string): string {
  return str[0].toUpperCase() + str.slice(1);
}
