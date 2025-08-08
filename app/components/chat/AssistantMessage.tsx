import { Markdown } from './Markdown';
import type { JSONValue } from 'ai';
import Popover from '~/components/ui/Popover';
import { workbenchStore } from '~/lib/stores/workbench';
import { WORK_DIR } from '~/utils/constants';
import { Button } from '~/components/ui/Button';
import { Card } from '~/components/ui/Card';

interface AssistantMessageProps {
  content: string;
  annotations?: JSONValue[];
  error?: Error;
  onRetry: (errorMessage: string) => Promise<void>;
}

function openArtifactInWorkbench(filePath: string) {
  filePath = normalizedFilePath(filePath);

  if (workbenchStore.currentView.get() !== 'code') {
    workbenchStore.currentView.set('code');
  }

  workbenchStore.setSelectedFile(`${WORK_DIR}/${filePath}`);
}

function normalizedFilePath(path: string) {
  let normalizedPath = path;

  if (normalizedPath.startsWith(WORK_DIR)) {
    normalizedPath = path.replace(WORK_DIR, '');
  }

  if (normalizedPath.startsWith('/')) {
    normalizedPath = normalizedPath.slice(1);
  }

  return normalizedPath;
}

export const AssistantMessage = ({ content, annotations, onRetry, error }: AssistantMessageProps) => {
  const filteredAnnotations = (annotations?.filter(
    (annotation: JSONValue) => annotation && typeof annotation === 'object' && Object.keys(annotation).includes('type'),
  ) || []) as { type: string; value: any } & { [key: string]: any }[];

  const chatSummaryAnnotation = filteredAnnotations.find((annotation) => annotation.type === 'chatSummary');
  const codeContextAnnotation = filteredAnnotations.find((annotation) => annotation.type === 'codeContext');
  const usageAnnotation = filteredAnnotations.find((annotation) => annotation.type === 'usage');
  const errorAnnotation = filteredAnnotations.find(
    (annotation) => annotation.type === 'progress' && annotation.status === 'error',
  );

  const chatSummary: string | undefined = chatSummaryAnnotation?.summary;
  const codeContext: string[] | undefined = codeContextAnnotation?.files;
  const errorMessage: string | undefined = errorAnnotation?.errorMessage || error?.message;

  const usage: {
    completionTokens: number;
    promptTokens: number;
    totalTokens: number;
  } = usageAnnotation?.value;

  return (
    <div className="overflow-hidden w-full">
      <>
        <div className="flex gap-2 items-center text-sm text-secondary my-1.5">
          {(codeContext || chatSummary) && !errorMessage && (
            <Popover side="right" align="start" trigger={<div className="i-ph:info" />}>
              {chatSummary && (
                <div className="max-w-chat-width">
                  <div className="summary max-h-96 flex flex-col">
                    <h2 className="border border-depth-3 rounded-md p4">Summary</h2>
                    <div style={{ zoom: 0.7 }} className="overflow-y-auto m4">
                      <Markdown>{chatSummary}</Markdown>
                    </div>
                  </div>
                  {codeContext && (
                    <div className="code-context flex flex-col p4 border border-depth-3 rounded-md">
                      <h2>Context</h2>
                      <div className="flex gap-4 mt-4 liblab" style={{ zoom: 0.6 }}>
                        {codeContext.map((x) => {
                          const normalized = normalizedFilePath(x);
                          return (
                            <>
                              <code
                                className="text-primary px-1.5 py-1 rounded-md text-accent hover:underline cursor-pointer"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  openArtifactInWorkbench(normalized);
                                }}
                              >
                                {normalized}
                              </code>
                            </>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div className="context"></div>
            </Popover>
          )}
          {usage && (
            <div>
              Tokens: {usage.totalTokens} (prompt: {usage.promptTokens}, completion: {usage.completionTokens})
            </div>
          )}
        </div>
      </>
      <div className="text-primary">
        {errorMessage ? (
          <>
            <p className="mt-2">Unfortunately, your request has failed with the following error:</p>{' '}
            <Card className="mt-4 px-4 py-2 text-sm text-red-300 border-red-500/20 bg-red-500/10">
              <p>{errorMessage}</p>
            </Card>
            <Button variant="secondary" size="sm" className="mt-4" onClick={() => onRetry(errorMessage)}>
              <div className="i-ph:arrow-clockwise w-3 h-3 mr-2" />
              Retry
            </Button>
          </>
        ) : (
          <Markdown html>{content}</Markdown>
        )}
      </div>
    </div>
  );
};
