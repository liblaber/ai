export const WORK_DIR_NAME = 'project';
export const WORK_DIR = `/home/${WORK_DIR_NAME}`;
export const MODIFICATIONS_TAG_NAME = 'liblab_file_modifications';
export const FIRST_USER_MESSAGE_REGEX = /\[FirstUserMessage: (.*?)\]\n\n/;
export const ASK_LIBLAB_REGEX = /\[AskLiblab: (.*?)\]\n\n/;
export const PROMPT_COOKIE_KEY = 'cachedPrompt';
export const DATA_SOURCE_ID_REGEX = /\[DataSourceId: (.*?)\]\n\n/;
export const FILES_REGEX = /\[Files: (.*?)\]\n\n/;
export const PROJECT_SETUP_ANNOTATION = 'project-setup';

export enum MessageRole {
  User = 'user',
  System = 'system',
  Assistant = 'assistant',
}
