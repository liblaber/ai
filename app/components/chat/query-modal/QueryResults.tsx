import { CodeMirrorEditor } from '~/components/editor/codemirror/CodeMirrorEditor';
import type { Theme } from '~/types/theme';

export interface QueryResultsProps {
  results: unknown;
  error: string | null;
  theme: Theme;
}

export const QueryResults = ({ results, error, theme }: QueryResultsProps) => (
  <div className="flex-1 relative rounded-lg border border-[#1E1E1E] flex flex-col">
    <div className="bg-[#1E1E1E] p-3 text-xs text-gray-400 h-12 flex items-center">Query Results</div>
    <div className="flex-1 overflow-hidden">
      {error ? (
        <div className="p-4 text-red-500 bg-[#1E1E1E] h-full">{error}</div>
      ) : (
        <CodeMirrorEditor
          theme={theme}
          editable={false}
          settings={{
            fontSize: '14px',
            tabSize: 2,
          }}
          doc={{
            value: JSON.stringify(results, null, 2),
            filePath: 'results.json',
            isBinary: false,
          }}
        />
      )}
    </div>
  </div>
);
