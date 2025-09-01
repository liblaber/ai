'use client';

import { HomepageTextarea } from '~/components/chat/HomepageTextarea';
import { Header } from '~/components/header/Header';
import { Background } from '~/components/ui/Background';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useEnvironmentDataSourcesStore } from '~/lib/stores/environmentDataSources';
import { Menu } from '~/components/sidebar/Menu.client';
import * as Tooltip from '@radix-ui/react-tooltip';
import type { PendingPrompt } from '~/components/chat/BaseChat';
import { HomepageHeadings } from '~/components/homepage/HomepageHeadings';
import { DATA_SOURCE_CONNECTION_ROUTE } from '~/lib/constants/routes';
import { useAuth } from '~/components/auth/AuthContext';
import { useSession } from '~/auth/auth-client';
import { detectBrowser, type BrowserInfo } from '~/lib/utils/browser-detection';
import { BrowserCompatibilityModal } from '~/components/ui/BrowserCompatibilityModal';
import { toast } from 'sonner';

export default function Index() {
  const router = useRouter();
  const { selectedEnvironmentDataSource, environmentDataSources } = useEnvironmentDataSourcesStore();
  const [input, setInput] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [imageDataList, setImageDataList] = useState<string[]>([]);
  const { data: session } = useSession();
  const { toggleLoginModal } = useAuth();
  const [browserInfo, setBrowserInfo] = useState<BrowserInfo>(() => ({
    name: 'Other',
    version: 'unknown',
    supportsWebContainers: true,
  }));

  useEffect(() => {
    setBrowserInfo(detectBrowser());
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const handleSendMessage = async () => {
    if (!browserInfo.supportsWebContainers) {
      toast.error('Please use Chrome, Edge, Brave, or Opera for full functionality');
      return;
    }

    const messageInput = input.trim();

    if (!messageInput) {
      return;
    }

    const pendingPrompt: PendingPrompt = {
      input,
      files: uploadedFiles.map((f) => f.name),
      images: imageDataList,
      environmentDataSource: selectedEnvironmentDataSource,
    };

    sessionStorage.setItem('pendingPrompt', JSON.stringify(pendingPrompt));

    if (!session) {
      toggleLoginModal(true, 'Log in to continue');

      return;
    }

    if (environmentDataSources.length === 0 || !selectedEnvironmentDataSource) {
      router.push(DATA_SOURCE_CONNECTION_ROUTE);

      return;
    }

    router.push('/chat');
  };

  return (
    <Tooltip.Provider delayDuration={200}>
      <div className="flex flex-col h-full w-full bg-depth-1">
        {session?.user && <Menu />}
        <Background />
        <Header />
        <div className="flex flex-col h-full w-full z-1">
          <HomepageHeadings />
          <HomepageTextarea
            value={input}
            onChange={handleInputChange}
            onKeyDown={async (event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                await handleSendMessage();
              }
            }}
            onSend={handleSendMessage}
            uploadedFiles={uploadedFiles}
            setUploadedFiles={setUploadedFiles}
            imageDataList={imageDataList}
            setImageDataList={setImageDataList}
            onPaste={(e) => {
              const items = e.clipboardData?.items;

              if (!items) {
                return;
              }

              for (const item of items) {
                if (item.type.startsWith('image/')) {
                  e.preventDefault();

                  const file = item.getAsFile();

                  if (file) {
                    const reader = new FileReader();

                    reader.onload = (e) => {
                      const base64Image = e.target?.result as string;
                      setUploadedFiles((prev) => [...prev, file]);
                      setImageDataList((prev) => [...prev, base64Image]);
                    };
                    reader.readAsDataURL(file);
                  }

                  break;
                }
              }
            }}
          />
        </div>

        {/* Browser Compatibility Modal */}
        <BrowserCompatibilityModal isOpen={!browserInfo.supportsWebContainers} />
      </div>
    </Tooltip.Provider>
  );
}
