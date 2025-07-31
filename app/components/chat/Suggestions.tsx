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
    <div className="flex flex-wrap gap-2 mt-3">
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          onClick={() => onSuggestionClick(suggestion)}
          className={classNames(
            'px-3 py-1.5 text-sm font-medium rounded-full transition-all',
            'bg-liblab-elements-bg-depth-1 hover:bg-liblab-elements-bg-depth-2',
            'text-liblab-elements-textPrimary hover:text-liblab-elements-textPrimary',
            'border border-liblab-elements-borderColorSecondary',
            'hover:border-liblab-elements-borderColorPrimary',
            'cursor-pointer',
          )}
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
};
