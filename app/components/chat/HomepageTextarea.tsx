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
import IcSendBlack from '~/icons/ic_send_black.svg';
import IcAttach from '~/icons/ic_attach.svg';
import IcMagic from '~/icons/ic_magic.svg';

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
        <button
          className="flex justify-center cursor-pointer items-center text-white opacity-80 hover:opacity-100 bg-transparent p-1"
          onClick={() => handleFileUpload()}
        >
          <IcAttach className="text-2xl mr-2" />
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
                setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
                setImageDataList(imageDataList.filter((_, i) => i !== index));
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
      <div className="w-full sm:max-w-[90%] lg:max-w-3xl mx-auto text-center space-y-8">
        <div className="relative">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[80px] rounded-full blur-[80px] shadow-[0_20px_50px_80px] shadow-accent-700/80" />
          <div
            className={classNames(
              'relative h-[190px] p-7 border-2 border-accent-900/50 rounded-2xl',
              'bg-black/60',
              'focus-within:border-accent-800/70 transition-all duration-300',
            )}
          >
            <div className="absolute bottom-6 left-6">
              <div className="flex items-center text-sm mt-2">
                <div className="flex items-center gap-4">
                  {selectedEnvironmentDataSource && (
                    <button
                      className="flex justify-center cursor-pointer items-center text-white opacity-80 hover:opacity-100 bg-transparent p-1 transition-all"
                      onClick={fetchSuggestions}
                      disabled={isLoadingSuggestions}
                    >
                      <IcMagic className="mr-1 transition-all" />
                      <span className="font-thick">{isLoadingSuggestions ? 'Loading...' : 'Suggestions'}</span>
                    </button>
                  )}
                  {fileUploadButton}
                </div>
              </div>
            </div>
            <div className="absolute bottom-6 right-6 flex">
              <DataSourcePicker
                onAddNew={handleConnectDataSource}
                onManageEnvironments={handleManageEnvironments}
                disabled={dataSources.length === 0}
              />
              <button
                data-testid="send-message-button"
                className="flex cursor-pointer justify-center items-center w-[36px] h-[36px] p-1 bg-accent-500 enabled:hover:shadow-[0_0_20px_3px] enabled:hover:shadow-accent-700/80 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                <IcSendBlack />
              </button>
            </div>

            <textarea
              ref={ref}
              value={value}
              onChange={onChange}
              onKeyDown={onKeyDown}
              onPaste={onPaste}
              placeholder="Create a clean revenue dashboard"
              data-testid="homepage-textarea"
              className={classNames(
                'w-full max-h-[120px] text-2xl font-light tracking-wide',
                'bg-transparent resize-none',
                'outline-none transition-colors',
                'text-primary placeholder-tertiary',
              )}
            />
          </div>
        </div>
        <Suggestions suggestions={suggestions} onSuggestionClick={handleSuggestionClick} visible={showSuggestions} />
        <FilePreview
          files={uploadedFiles}
          imageDataList={imageDataList}
          onRemove={(index) => {
            setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
            setImageDataList(imageDataList.filter((_, i) => i !== index));
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
