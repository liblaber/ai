import { type ChangeEvent, forwardRef, type KeyboardEvent, useState } from 'react';
import { classNames } from '~/utils/classNames';
import { DataSourcePicker } from './DataSourcePicker';
import { IconButton } from '~/components/ui/IconButton';
import WithTooltip from '~/components/ui/Tooltip';
import FilePreview from './FilePreview';
import { ScreenshotStateManager } from './ScreenshotStateManager';
import { useDataSourcesStore } from '~/lib/stores/dataSources';
import { openSettingsPanel } from '~/lib/stores/settings';
import { ClientOnly } from 'remix-utils/client-only';
import { SendButton } from './SendButton.client';

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
  onSend: (e: React.UIEvent) => void;
  isStreaming?: boolean;
  handleStop?: () => void;
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
      onSend,
      isStreaming = false,
      handleStop,
    },
    ref,
  ) => {
    const { dataSources } = useDataSourcesStore();
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const [imageDataList, setImageDataList] = useState<string[]>([]);

    const handleConnectDataSource = () => {
      openSettingsPanel('data', true);
    };

    const fileUploadButton = (
      <IconButton title="Upload file" className="transition-all" onClick={() => handleFileUpload()}>
        <WithTooltip tooltip="Upload file">
          <div className="i-liblab:ic_attach text-3xl opacity-50 hover:opacity-100" />
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
          const reader = new FileReader();

          reader.onload = (e) => {
            const base64Image = e.target?.result as string;
            setUploadedFiles((prev) => [...prev, file]);
            setImageDataList((prev) => [...prev, base64Image]);
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    }

    return (
      <div className="relative w-full bg-liblab-elements-bg-depth-3 p-3 rounded-xl border-2 border-liblab-elements-borderColorSecondary">
        <FilePreview
          files={uploadedFiles}
          imageDataList={imageDataList}
          onRemove={(index) => {
            setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
            setImageDataList((prev) => prev.filter((_, i) => i !== index));
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
              'text-liblab-elements-textPrimary placeholder-liblab-elements-textTertiary bg-liblab-elements-bg-depth-2 text-sm',
              'transition-all duration-200',
              'hover:border-liblab-elements-focus',
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
        <div className="flex justify-between items-center text-sm mt-2">
          <div className="flex gap-1 items-center">
            {dataSources.length > 0 ? (
              <DataSourcePicker onAddNew={handleConnectDataSource} disabled={true} />
            ) : (
              <button
                onClick={handleConnectDataSource}
                className={classNames(
                  'inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                  'bg-accent-500 hover:bg-accent-600',
                  'text-white',
                )}
              >
                <div className="i-ph:database-duotone" />
                <span>Connect Data Source</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-4">{fileUploadButton}</div>
        </div>
      </div>
    );
  },
);
