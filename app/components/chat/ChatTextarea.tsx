import { type ChangeEvent, forwardRef, type KeyboardEvent } from 'react';
import { classNames } from '~/utils/classNames';
import { IconButton } from '~/components/ui/IconButton';
import WithTooltip from '~/components/ui/Tooltip';
import FilePreview from './FilePreview';
import { ScreenshotStateManager } from './ScreenshotStateManager';
import { useEnvironmentDataSourcesStore } from '~/lib/stores/environmentDataSources';
import { SendButton } from './SendButton.client';
import { processImageFile } from '~/utils/fileUtils';
import { ClientOnly } from '~/components/ui/ClientOnly';
import IcDatabase from '~/icons/ic_database.svg';
import { AttachSquare } from 'iconsax-reactjs';

interface ChatTextareaProps {
  value: string;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  onPaste: (e: React.ClipboardEvent) => void;
  onDragEnter: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  minHeight: number;
  maxHeight: number;
  uploadedFiles?: File[];
  setUploadedFiles?: (files: File[]) => void;
  imageDataList?: string[];
  setImageDataList?: (dataList: string[]) => void;
  onSend: (e: React.UIEvent) => void;
  isStreaming?: boolean;
  handleStop?: () => void;
  onDataSourceChange?: (
    dataSourceId: string,
    environmentId: string,
    dataSourceName: string,
    environmentName: string,
  ) => void;
}

export const ChatTextarea = forwardRef<HTMLTextAreaElement, ChatTextareaProps>(
  (
    {
      value,
      onChange,
      onKeyDown,
      onPaste,
      onDragEnter,
      onDragOver,
      onDragLeave,
      onDrop,
      minHeight,
      maxHeight,
      uploadedFiles = [],
      setUploadedFiles,
      imageDataList = [],
      setImageDataList,
      onSend,
      isStreaming = false,
      handleStop,
    },
    ref,
  ) => {
    const { selectedEnvironmentDataSourceName } = useEnvironmentDataSourcesStore();

    const fileUploadButton = (
      <IconButton title="Attach files" className="transition-all" onClick={() => handleFileUpload()}>
        <WithTooltip tooltip="Attach files">
          <AttachSquare className="opacity-80 hover:opacity-100 cursor-pointer" variant="Bold" size={26} />
        </WithTooltip>
      </IconButton>
    );

    function handleFileUpload() {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';

      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];

        if (file) {
          try {
            const { processedFile, base64 } = await processImageFile(file);
            setUploadedFiles?.([...uploadedFiles, processedFile]);
            setImageDataList?.([...imageDataList, base64]);
          } catch (error) {
            console.error('Failed to process image:', error);
          }
        }
      };
      input.click();
    }

    return (
      <div className="relative w-full bg-depth-3 p-3 rounded-xl border-depth-2">
        <FilePreview
          files={uploadedFiles}
          imageDataList={imageDataList}
          onRemove={(index) => {
            setUploadedFiles?.(uploadedFiles.filter((_, i) => i !== index));
            setImageDataList?.(imageDataList.filter((_, i) => i !== index));
          }}
        />
        <ClientOnly>
          {() => (
            <ScreenshotStateManager
              setUploadedFiles={setUploadedFiles}
              setImageDataList={setImageDataList}
              uploadedFiles={uploadedFiles}
              imageDataList={imageDataList}
            />
          )}
        </ClientOnly>
        <div className="relative">
          <textarea
            ref={ref}
            className={classNames(
              'w-full pl-4 pt-4 pr-16 rounded-xl outline-none resize-none',
              'text-primary placeholder-tertiary bg-depth-2 text-sm',
              'transition-all duration-200',
              'hover:border-accent',
            )}
            onDragEnter={onDragEnter}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onKeyDown={onKeyDown}
            value={value}
            onChange={onChange}
            onPaste={onPaste}
            style={{
              minHeight,
              maxHeight,
            }}
            placeholder="Describe your changes..."
            translate="no"
          />
          <ClientOnly>
            {() => (
              <SendButton
                show={value.length > 0 || isStreaming || uploadedFiles.length > 0}
                isStreaming={isStreaming}
                disabled={false}
                onClick={(event) => {
                  if (isStreaming) {
                    handleStop?.();
                    return;
                  }

                  if (value.length > 0 || uploadedFiles.length > 0) {
                    onSend(event);
                  }
                }}
              />
            )}
          </ClientOnly>
        </div>
        <div className="flex justify-between items-center text-sm mt-2 font-medium">
          <div className="flex gap-1 items-center">
            <div className="flex items-center gap-2 text-secondary ml-1">
              <IcDatabase />
              {selectedEnvironmentDataSourceName}
            </div>
          </div>
          <div className="flex items-center gap-4">{fileUploadButton}</div>
        </div>
      </div>
    );
  },
);
