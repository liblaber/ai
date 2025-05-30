import { memo, useEffect, useState } from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { Button } from '~/components/ui/Button';
import { format } from 'sql-formatter';
import type { ApiError } from '~/types/api-error';
import { AiGeneration } from '~/components/chat/query-modal/AiGeneration';
import { QueryResults } from '~/components/chat/query-modal/QueryResults';
import { QueryEditor } from '~/components/chat/query-modal/QueryEditor';

interface QueryModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  queryId: string | number;
  onUpdateAndRegenerate?: (updatedQuery: string) => void;
}

export const QueryModal = memo(({ isOpen, onOpenChange, queryId, onUpdateAndRegenerate }: QueryModalProps) => {
  const [query, setQuery] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queryResult, setQueryResult] = useState<unknown | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [userPrompt, setUserPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchQuery();
    } else {
      // Reset state when modal is closed
      setQuery(undefined);
      setQueryResult(null);
      setUserPrompt('');
      setError(null);
    }
  }, [isOpen, queryId]);

  const formatSql = (sql: string) => {
    try {
      return format(sql, {
        language: 'postgresql',
        keywordCase: 'upper',
        linesBetweenQueries: 1,
        tabWidth: 2,
        useTabs: false,
      });
    } catch (err) {
      setError(`Failed to format SQL: ${err}`);
      return sql;
    }
  };

  const fetchQuery = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/queries/${queryId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch query');
      }

      const data = (await response.json()) as string;
      setQuery(formatSql(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch query');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerateComponent = async () => {
    try {
      setError(null);

      const formattedQuery = formatSql(query || '');
      const response = await fetch(`/api/queries/${queryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: formattedQuery }),
      });

      if (!response.ok) {
        throw new Error('Failed to update query');
      }

      const updatedQuery = (await response.json()) as string;
      setQuery(formatSql(updatedQuery));

      if (onUpdateAndRegenerate) {
        onUpdateAndRegenerate(updatedQuery);
      }

      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update query');
    }
  };

  const handleTestQuery = async () => {
    if (!query) {
      return;
    }

    try {
      setIsTesting(true);
      setError(null);
      setQueryResult(null);

      const response = await fetch(`/api/execute-query?query=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const responseClone = response.clone();

      if (!response.ok) {
        const body = (await responseClone.json()) as ApiError;
        setError(body?.error || 'Failed to execute query');
      }

      const results = (await response.json()) as { data: unknown };
      setQueryResult(results.data);
    } catch {
      setError('Failed to execute query');
      setQueryResult(null);
    } finally {
      setIsTesting(false);
    }
  };

  const handleGenerateSql = async () => {
    if (!userPrompt.trim()) {
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);

      const response = await fetch('/api/generate-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: userPrompt, existingQuery: query }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate SQL');
      }

      const data = (await response.json()) as string;
      setQuery(formatSql(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate SQL');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFormatSql = () => {
    if (!query) {
      return;
    }

    setQuery(formatSql(query));
  };

  return (
    <RadixDialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999]" />
        <RadixDialog.Content
          className={`fixed top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 ${queryResult || error ? 'w-[95vw]' : 'w-[90vw] md:w-[800px]'} max-w-[1200px] h-[80vh] flex flex-col bg-white dark:bg-[#0A0A0A] rounded-xl shadow-xl z-[9999] border border-[#E5E5E5] dark:border-[#1A1A1A] transition-all duration-300 ease-in-out`}
        >
          <div className="p-6 flex flex-col h-full">
            {isLoading ? (
              <div className="flex items-center justify-center flex-1">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-liblab-elements-textPrimary"></div>
              </div>
            ) : (
              <>
                <div className="flex-1 mt-4 min-h-0 flex gap-4">
                  <QueryEditor
                    query={query}
                    onQueryChange={setQuery}
                    onFormatQuery={handleFormatSql}
                    onTestQuery={handleTestQuery}
                    isTesting={isTesting}
                    queryId={queryId}
                  />

                  {(queryResult !== null || error) && <QueryResults results={queryResult} error={error} />}
                </div>

                <div className="flex flex-col gap-4 mt-6 pt-4 border-t border-[#1E1E1E]">
                  <AiGeneration
                    userPrompt={userPrompt}
                    onPromptChange={setUserPrompt}
                    onGenerateQuery={handleGenerateSql}
                    isGenerating={isGenerating}
                  />

                  <div className="flex justify-end gap-3 mt-3">
                    <Button onClick={() => onOpenChange(false)} size="lg" variant="outline">
                      Cancel
                    </Button>
                    <Button onClick={handleRegenerateComponent} size="lg" variant="primary">
                      Save Query & Regenerate Component
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
});
