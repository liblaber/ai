import React from 'react';
import { classNames } from '~/utils/classNames';

interface SuggestionsProps {
  suggestions: string[];
  onSuggestionClick: (suggestion: string) => void;
  visible: boolean;
}

export const Suggestions: React.FC<SuggestionsProps> = ({ suggestions, onSuggestionClick, visible }) => {
  if (!visible || suggestions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 mt-3 justify-center">
      {suggestions.map((suggestion) => (
        <button
          key={suggestion}
          onClick={() => onSuggestionClick(suggestion)}
          className={classNames(
            'px-3 py-1.5 text-sm font-medium rounded-full transition-all',
            'bg-depth-1 hover:bg-depth-2',
            'text-primary hover:text-primary',
            'border border-depth-2',
            'hover:border-depth-3Primary',
            'cursor-pointer',
          )}
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
};
