import { IconButton } from '~/components/ui/IconButton';
import { classNames } from '~/utils/classNames';
import { Mic, MicOff } from 'lucide-react';
import React from 'react';

export const SpeechRecognitionButton = ({
  isListening,
  onStart,
  onStop,
  disabled,
}: {
  isListening: boolean;
  onStart: () => void;
  onStop: () => void;
  disabled: boolean;
}) => {
  return (
    <IconButton
      title={isListening ? 'Stop listening' : 'Start speech recognition'}
      disabled={disabled}
      className={classNames('transition-all', {
        'text-accent': isListening,
      })}
      onClick={isListening ? onStop : onStart}
    >
      {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
    </IconButton>
  );
};
