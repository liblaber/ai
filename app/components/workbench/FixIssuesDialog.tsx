import { useStore } from '@nanostores/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { AlertTriangle, MessageCircle } from 'lucide-react';
import { workbenchStore } from '~/lib/stores/workbench';

type Props = {
  onFixIssue: (message: string) => void;
};

export function FixIssuesDialog({ onFixIssue }: Props) {
  const codeErrors = useStore(workbenchStore.codeErrors);

  const errorContent = codeErrors.map(({ content }) => content).join('\n\n');

  const [showErrorDetails, setShowErrorDetails] = useState(false);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0 flex items-center justify-center bg-depth-2 z-50"
        style={{ pointerEvents: 'auto' }}
      >
        <div className="max-w-lg mx-auto p-6 text-center">
          <motion.div
            className="flex justify-center mb-4"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="text-4xl text-failed">
              <AlertTriangle className="w-12 h-12" />
            </div>
          </motion.div>

          <motion.h3
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-lg font-medium text-primary mb-3"
          >
            Detected Application Error
          </motion.h3>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-sm text-text-secondary mb-6"
          >
            <p>
              Something went wrong while running the preview. Would you like me to analyze and help resolve this issue?
            </p>
          </motion.div>

          {errorContent && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mb-6">
              <button
                onClick={() => setShowErrorDetails(!showErrorDetails)}
                className="text-sm text-text-secondary hover:text-primary underline cursor-pointer"
              >
                {showErrorDetails ? 'Hide Error Details' : 'Show Error Details'}
              </button>
            </motion.div>
          )}

          <AnimatePresence>
            {showErrorDetails && errorContent && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="text-xs text-text-secondary p-3 bg-depth-3 rounded mb-6 max-h-[400px] text-left overflow-y-scroll"
              >
                <div className="font-medium mb-1">Error Details:</div>
                <div className="whitespace-pre-wrap">{errorContent}</div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            className="flex gap-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <button
              onClick={() => workbenchStore.clearCodeErrors()}
              className="flex-1 px-4 py-2 rounded-md text-sm cursor-pointer font-medium bg-depth-1 hover:bg-depth-1/50 focus:ring-2 focus:ring-offset-2  focus:outline-none text-primary"
            >
              Dismiss
            </button>
            <button
              onClick={() => {
                onFixIssue(workbenchStore.getFixErrorsMessageText());
                workbenchStore.clearCodeErrors();
              }}
              className="flex-1 px-4 py-2 rounded-md text-sm cursor-pointer font-medium bg-accent-500 hover:bg-accent-700 focus:outline-none focus:ring-2 focus:ring-offset-2 text-gray-900 flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              Fix Issue
            </button>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
