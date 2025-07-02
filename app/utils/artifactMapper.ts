import type { Message } from '@ai-sdk/react';
import type { RemoteChanges } from '~/lib/stores/git';
import { MessageRole } from '~/utils/constants';

export const mapRemoteChangesToArtifact = (changes: RemoteChanges): Message | undefined => {
  const { changed, removed } = changes;

  if (changed.length === 0 && removed.length === 0) {
    return undefined;
  }

  const artifactContent = [
    'I detected changes in your remote repository. Syncing the project with the following changes:',
    '',
    '<liblabArtifact id="remote-changes" title="Remote Repository Changes">',
    ...changed.map((file) => {
      const fileContent = file.content ? `\n${file.content}` : '';
      return `<liblabAction type="file" filePath="${file.filename}">${fileContent}</liblabAction>`;
    }),
    ...removed.map((file) => `<liblabAction type="shell">rm ${file.filename}</liblabAction>`),
    '</liblabArtifact>',
  ].join('\n');

  return {
    id: `remote-changes-${Date.now()}`,
    role: MessageRole.Assistant,
    content: artifactContent,
  };
};

export const extractArtifactTitleFromMessageContent = (messageContent: string) => {
  const artifactRegex = /<liblabArtifact[^>]*title="([^"]*)"[^>]*>/;
  const match = messageContent.match(artifactRegex);

  return match ? match[1] : undefined;
};
