/*
 * @ts-nocheck
 * Preventing TS checks with files presented in the video for a better presentation.
 */
import {
  DATA_SOURCE_ID_REGEX,
  FIRST_USER_MESSAGE_REGEX,
  MODEL_REGEX,
  PROVIDER_REGEX,
  ASK_LIBLAB_REGEX,
} from '~/utils/constants';
import { Markdown } from './Markdown';

interface UserMessageProps {
  content: string | Array<{ type: string; text?: string; image?: string }>;
}

export function UserMessage({ content }: UserMessageProps) {
  if (Array.isArray(content)) {
    const textItem = content.find((item) => item.type === 'text');
    const textContent = stripMetadata(textItem?.text || '');
    const images = content.filter((item) => item.type === 'image' && item.image);

    return (
      <div className="overflow-hidden pt-[4px]">
        <div className="flex flex-col gap-4">
          {textContent && <Markdown html>{textContent}</Markdown>}
          {images.map((item, index) => (
            <img
              key={index}
              src={item.image}
              alt={`Image ${index + 1}`}
              className="max-w-full h-auto rounded-lg"
              style={{ maxHeight: '512px', objectFit: 'contain' }}
            />
          ))}
        </div>
      </div>
    );
  }

  const textContent = stripMetadata(content);

  return (
    <div className="overflow-hidden pt-[4px]">
      <Markdown html>{textContent}</Markdown>
    </div>
  );
}

function stripMetadata(content: string) {
  const artifactRegex = /<liblabArtifact\s+[^>]*>[\s\S]*?<\/liblabArtifact>/gm;
  const sqlModelRegex = /\[SqlModel: (.*?)\]\n\n/;
  const sqlProviderRegex = /\[SqlProvider: (.*?)\]\n\n/;

  return content
    .replace(MODEL_REGEX, '')
    .replace(PROVIDER_REGEX, '')
    .replace(sqlModelRegex, '')
    .replace(sqlProviderRegex, '')
    .replace(artifactRegex, '')
    .replace(FIRST_USER_MESSAGE_REGEX, '')
    .replace(DATA_SOURCE_ID_REGEX, '')
    .replace(ASK_LIBLAB_REGEX, '');
}
