'use client';

import { HomepageTextarea } from '~/components/chat/HomepageTextarea';
import { Header } from '~/components/header/Header';
import { Background } from '~/components/ui/Background';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDataSourcesStore } from '~/lib/stores/dataSources';
import { Menu } from '~/components/sidebar/Menu.client';
import * as Tooltip from '@radix-ui/react-tooltip';
import type { PendingPrompt } from '~/components/chat/BaseChat';
import { HomepageHeadings } from '~/components/homepage/HomepageHeadings';
import { DATA_SOURCE_CONNECTION_ROUTE } from '~/lib/constants/routes';
import { useAuth } from '~/components/auth/AuthContext';
import { useSession } from '~/auth/auth-client';

export default function Index() {
  const router = useRouter();
  const { selectedDataSourceId, dataSources } = useDataSourcesStore();
  const [input, setInput] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [imageDataList, setImageDataList] = useState<string[]>([]);
  const { data: session } = useSession();
  const { toggleLoginModal } = useAuth();

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const handleSendMessage = async () => {
    const messageInput = input.trim();

    if (!messageInput) {
      return;
    }

    const pendingPrompt: PendingPrompt = {
      input,
      files: uploadedFiles.map((f) => f.name),
      images: imageDataList,
      dataSourceId: selectedDataSourceId,
    };

    sessionStorage.setItem('pendingPrompt', JSON.stringify(pendingPrompt));

    if (!session) {
      toggleLoginModal(true, 'Log in to continue');

      return;
    }

    if (dataSources.length === 0 || !selectedDataSourceId) {
      router.push(DATA_SOURCE_CONNECTION_ROUTE);

      return;
    }

    router.push('/chat');
  };

  return (
    <Tooltip.Provider delayDuration={200}>
      <div className="flex flex-col h-full w-full bg-liblab-elements-bg-depth-1">
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
            onSend={handleSendMessage}
            isStreaming={false}
            uploadedFiles={uploadedFiles}
            setUploadedFiles={setUploadedFiles}
            imageDataList={imageDataList}
            setImageDataList={setImageDataList}
          />
        </div>
      </div>
    </Tooltip.Provider>
  );
}
