import { type ChangeEvent, forwardRef, type KeyboardEvent, useState } from 'react';
import { classNames } from '~/utils/classNames';
import { DataSourcePicker } from './DataSourcePicker';
import FilePreview from './FilePreview';
import { ScreenshotStateManager } from './ScreenshotStateManager';
import { useEnvironmentDataSourcesStore } from '~/lib/stores/environmentDataSources';
import { openSettingsPanel } from '~/lib/stores/settings';
import { ClientOnly } from '~/components/ui/ClientOnly';
import { processImageFile } from '~/utils/fileUtils';
import { Suggestions } from './Suggestions';
import { toast } from 'sonner';
import { logger } from '~/utils/logger';
import { AttachSquare, Magicpen, Send2 } from 'iconsax-reactjs';
import WithTooltip from '~/components/ui/Tooltip';

interface HomepageTextareaProps {
  value: string;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  onPaste: (e: React.ClipboardEvent) => void;
  onSend: (e: React.UIEvent) => void;
  isStreaming?: boolean;
  handleStop?: () => void;
  uploadedFiles: File[];
  setUploadedFiles: (files: File[]) => void;
  imageDataList: string[];
  setImageDataList: (dataList: string[]) => void;
}

export const HomepageTextarea = forwardRef<HTMLTextAreaElement, HomepageTextareaProps>(
  (
    {
      value,
      onChange,
      onKeyDown,
      onPaste,
      onSend,
      isStreaming = false,
      handleStop,
      uploadedFiles,
      setUploadedFiles,
      imageDataList,
      setImageDataList,
    },
    ref,
  ) => {
    const { dataSources, selectedEnvironmentDataSource } = useEnvironmentDataSourcesStore();
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

    const handleConnectDataSource = () => {
      openSettingsPanel('data', true, true);
    };

    const handleManageEnvironments = (dataSourceId: string) => {
      openSettingsPanel(`data/${dataSourceId}/environments`, false, true);
    };

    const fetchSuggestions = async () => {
      if (!selectedEnvironmentDataSource) {
        console.warn('No data source selected');
        return;
      }

      setIsLoadingSuggestions(true);

      try {
        const response = await fetch('/api/suggestions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ...selectedEnvironmentDataSource }),
        });

        const data = await response.json<
          { suggestions: string[]; success: true } | { success: false; error: string }
        >();

        if (data.success) {
          setSuggestions(data.suggestions);
          setShowSuggestions(true);
        } else {
          toast.error(`Failed to fetch suggestions: ${data.error}`);
          logger.error('Failed to fetch suggestions:', data.error);
        }
      } catch (error) {
        logger.error('Error fetching suggestions:', error);
      } finally {
        setIsLoadingSuggestions(false);
      }
    };

    const handleSuggestionClick = (suggestion: string) => {
      // Create a synthetic event to update the textarea value
      const syntheticEvent = {
        target: { value: suggestion },
      } as ChangeEvent<HTMLTextAreaElement>;

      onChange(syntheticEvent);
      setShowSuggestions(false);
    };

    const fileUploadButton = (
      <div className="relative group">
        <WithTooltip tooltip="Attach files">
          <button
            className="flex justify-center cursor-pointer items-center text-white opacity-60 hover:opacity-100 bg-transparent p-1"
            onClick={() => handleFileUpload()}
          >
            <AttachSquare size={26} variant="Bold" />
          </button>
        </WithTooltip>
      </div>
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
            setUploadedFiles([...uploadedFiles, processedFile]);
            setImageDataList([...imageDataList, base64]);
          } catch (error) {
            console.error('Failed to process image:', error);
          }
        }
      };
      input.click();
    }

    return (
      <div className="w-full sm:max-w-[90%] lg:max-w-[630px] mx-auto text-center">
        <div
          className={classNames(
            'relative rounded-xl bg-depth-3 space-y-1.5 px-3 py-3 focus-within:border-accent-800/70  expandHeight',
          )}
        >
          <textarea
            ref={ref}
            value={value}
            onChange={onChange}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            placeholder="Describe what you want to build..."
            data-testid="homepage-textarea"
            className={classNames(
              'w-full h-[100px] rounded-lg text-md tracking-wide',
              'bg-depth-4 p-3 resize-none',
              'outline-none transition-colors',
              'text-primary placeholder-secondary space-y-10',
            )}
          />
          <div className="flex items-center gap-4 fadeIn">
            <DataSourcePicker
              onAddNew={handleConnectDataSource}
              onManageEnvironments={handleManageEnvironments}
              disabled={dataSources.length === 0}
            />
            {fileUploadButton}
            {selectedEnvironmentDataSource && (
              <WithTooltip tooltip="Get suggestions">
                <button
                  className="flex justify-center cursor-pointer items-center text-white opacity-60 hover:opacity-100 bg-transparent p-1 transition-all"
                  onClick={fetchSuggestions}
                  disabled={isLoadingSuggestions}
                >
                  <Magicpen size={26} variant="Bold" />
                </button>
              </WithTooltip>
            )}

            <button
              data-testid="send-message-button"
              className="flex cursor-pointer justify-center items-center w-[36px] h-[36px] p-1 bg-depth-4  rounded-full transition-all enabled:hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
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
              <Send2 size={24} variant="Bold" />
            </button>
          </div>
        </div>
        {uploadedFiles.length > 0 && (
          <div className="group-hover:opacity-100 transition-opacity duration-200">
            <FilePreview
              files={uploadedFiles}
              imageDataList={imageDataList}
              onRemove={(index) => {
                setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
                setImageDataList(imageDataList.filter((_, i) => i !== index));
              }}
            />
          </div>
        )}
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
        <Suggestions suggestions={suggestions} onSuggestionClick={handleSuggestionClick} visible={showSuggestions} />
      </div>
    );
  },
);
