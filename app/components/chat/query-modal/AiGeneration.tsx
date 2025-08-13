import { Sparkles } from 'lucide-react';
import { Button } from '~/components/ui/Button';

interface AiGenerationProps {
  userPrompt: string;
  onPromptChange: (prompt: string) => void;
  onGenerateQuery: () => void;
  isGenerating: boolean;
}

export const AiGeneration = ({ userPrompt, onPromptChange, onGenerateQuery, isGenerating }: AiGenerationProps) => (
  <div className="flex gap-3">
    <input
      type="text"
      placeholder="Describe what you want to query..."
      className="flex-1 px-4 bg-[#1E1E1E] text-white rounded-lg border border-[#2E2E2E] focus:outline-none focus:border-accent placeholder:text-gray-500"
      value={userPrompt}
      onChange={(e) => onPromptChange(e.target.value)}
    />
    <Button
      variant="secondary"
      onClick={onGenerateQuery}
      disabled={isGenerating || !userPrompt.trim()}
      className="flex items-center gap-2"
    >
      <Sparkles className="w-5 h-5" />
      {isGenerating ? 'Generating...' : 'Generate Query with AI'}
    </Button>
  </div>
);
