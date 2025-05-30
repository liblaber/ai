import { type ChangeEvent, forwardRef, type KeyboardEvent, useState } from 'react';
import { classNames } from '~/utils/classNames';
import { DataSourcePicker } from './DataSourcePicker';
import FilePreview from './FilePreview';
import { ScreenshotStateManager } from './ScreenshotStateManager';
import { useDataSourcesStore } from '~/lib/stores/dataSources';
import { openSettingsPanel } from '~/lib/stores/settings';
import { ClientOnly } from 'remix-utils/client-only';

interface HomepageTextareaProps {
  value: string;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  onPaste: (e: React.ClipboardEvent) => void;
  onSend: (e: React.UIEvent) => void;
  isStreaming?: boolean;
  handleStop?: () => void;
}

export const HomepageTextarea = forwardRef<HTMLTextAreaElement, HomepageTextareaProps>(
  ({ value, onChange, onKeyDown, onPaste, onSend, isStreaming = false, handleStop }, ref) => {
    const { dataSources } = useDataSourcesStore();
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const [imageDataList, setImageDataList] = useState<string[]>([]);

    const handleConnectDataSource = () => {
      openSettingsPanel('data', true, true);
    };

    const fileUploadButton = (
      <div className="relative group">
        <button
          className="flex justify-center items-center text-white opacity-80 hover:opacity-100 bg-transparent p-1"
          onClick={() => handleFileUpload()}
        >
          <div className="i-liblab:ic_attach text-2xl mr-2" />
          <span className="font-thick">
            Attach
            {uploadedFiles.length > 0
              ? ` (${uploadedFiles.length} ${uploadedFiles.length === 1 ? 'file' : 'files'} selected)`
              : ''}
          </span>
        </button>
        {uploadedFiles.length > 0 && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <FilePreview
              files={uploadedFiles}
              imageDataList={imageDataList}
              onRemove={(index) => {
                setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
                setImageDataList((prev) => prev.filter((_, i) => i !== index));
              }}
            />
          </div>
        )}
      </div>
    );

    function handleFileUpload() {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.multiple = true;

      input.onchange = async (e) => {
        const files = Array.from((e.target as HTMLInputElement).files || []);

        if (files.length > 0) {
          files.forEach((file) => {
            const reader = new FileReader();

            reader.onload = (e) => {
              const base64Image = e.target?.result as string;
              setUploadedFiles((prev) => [...prev, file]);
              setImageDataList((prev) => [...prev, base64Image]);
            };
            reader.readAsDataURL(file);
          });
        }
      };
      input.click();
    }

    return (
      <div className="w-full sm:max-w-[90%] lg:max-w-3xl mx-auto text-center space-y-8">
        <div className="relative">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[80px] rounded-full blur-[80px] shadow-[0_20px_50px_80px] shadow-accent-700/80" />
          <div
            className={classNames(
              'relative h-190px p-7 border-2 border-accent-900/50 rounded-2xl',
              'bg-black/60',
              'focus-within:border-accent-800/70 transition-all duration-300',
            )}
          >
            <div className="absolute bottom-6 left-6">
              <div className="flex items-center text-sm mt-2">
                <div className="flex items-center gap-4">{fileUploadButton}</div>
              </div>
            </div>
            <div className="absolute bottom-6 right-6 flex">
              <div className="flex gap-1 items-center mr-4">
                {dataSources.length > 0 && <DataSourcePicker onAddNew={handleConnectDataSource} disabled={false} />}
              </div>
              <button
                className="flex justify-center items-center w-[36px] h-[36px] p-2 bg-accent-500 enabled:hover:shadow-[0_0_20px_3px] enabled:hover:shadow-accent-700/80 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!value.length || isStreaming}
                onClick={(event) => {
                  if (isStreaming) {
                    handleStop?.();
                    return;
                  }

                  if (value.length > 0 || uploadedFiles.length > 0) {
                    onSend(event);
                  }
                }}
              >
                <div className="i-liblab:ic_send_black text-xl"></div>
              </button>
            </div>

            <textarea
              ref={ref}
              value={value}
              onChange={onChange}
              onKeyDown={onKeyDown}
              onPaste={onPaste}
              placeholder="Create a clean revenue dashboard"
              className={classNames(
                'w-full max-h-120px text-2xl font-light tracking-wide',
                'bg-transparent resize-none',
                'outline-none transition-colors',
                'text-liblab-elements-textPrimary placeholder-liblab-elements-textTertiary',
              )}
            />
          </div>
        </div>
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
      </div>
    );
  },
);
