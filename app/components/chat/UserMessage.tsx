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
  FILES_REGEX,
} from '~/utils/constants';
import { Markdown } from './Markdown';

interface UserMessageProps {
  content: string | Array<{ type: string; text?: string; image?: string }>;
}

export function UserMessage({ content }: UserMessageProps) {
  let textContent: string;
  let images: string[] = [];

  if (Array.isArray(content)) {
    const textItem = content.find((item) => item.type === 'text');
    textContent = stripMetadata(textItem?.text || '');

    const imageItems = content.filter((item) => item.type === 'image' && item.image);
    images = imageItems.map((item) => item.image!);
  } else {
    textContent = stripMetadata(content);

    const dataList = content.match(FILES_REGEX)?.[1]?.split('## ').filter(Boolean);
    images = dataList || [];
  }

  return (
    <div className="overflow-hidden pt-[4px]">
      <div className="flex flex-col gap-4">
        {images.map((imageSrc, index) => (
          <img key={index} src={imageSrc} alt={`Image ${index + 1}`} className="w-20 h-20 object-cover rounded-lg" />
        ))}
        {textContent && <Markdown html>{textContent}</Markdown>}
      </div>
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
    .replace(ASK_LIBLAB_REGEX, '')
    .replace(FILES_REGEX, '');
}
