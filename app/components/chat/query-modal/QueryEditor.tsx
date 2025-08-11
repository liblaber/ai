import { List, Play } from 'lucide-react';
import { CodeMirrorEditor } from '~/components/editor/codemirror/CodeMirrorEditor';
import { Button } from '~/components/ui/Button';

export interface QueryEditorProps {
  query: string | undefined;
  onQueryChange: (query: string) => void;
  onFormatQuery: () => void;
  onTestQuery: () => void;
  isTesting: boolean;
  queryId: string | number;
}

export const QueryEditor = ({
  query,
  onQueryChange,
  onFormatQuery,
  onTestQuery,
  isTesting,
  queryId,
}: QueryEditorProps) => (
  <div className="flex-1 relative rounded-lg border border-[#1E1E1E] flex flex-col">
    <div className="bg-[#1E1E1E] p-3 text-xs text-gray-400 flex justify-between items-center h-12">
      <span>Query</span>
      <div className="flex gap-2">
        <Button
          className="text-xs bg-[#2E2E2E] text-[#A78BFA] hover:bg-[#3E3E3E] hover:text-[#A78BFA] px-2 py-1 flex items-center gap-1"
          onClick={onFormatQuery}
        >
          <List className="w-4 h-4" />
          Format
        </Button>
        <Button
          className="text-xs bg-[#2E2E2E] text-[#A78BFA] hover:bg-[#3E3E3E] hover:text-[#A78BFA] px-2 py-1 flex items-center gap-1"
          onClick={onTestQuery}
          disabled={isTesting}
        >
          <Play className="w-4 h-4" />
          {isTesting ? 'Running...' : 'Run Test Query'}
        </Button>
      </div>
    </div>
    <div className="flex-1 overflow-hidden">
      <CodeMirrorEditor
        editable={true}
        settings={{
          fontSize: '14px',
          tabSize: 2,
        }}
        doc={{
          value: query || '',
          filePath: `query-${queryId}.sql`,
          isBinary: false,
        }}
        onChange={({ content }) => onQueryChange(content)}
      />
    </div>
  </div>
);
