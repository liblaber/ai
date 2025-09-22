import React from 'react';
import { AlertCircleIcon, Loader2, Trash2 } from 'lucide-react';
import { Button } from '~/components/ui/Button';
import { CloseCircle } from 'iconsax-reactjs';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  entityName: string;
  customWarning?: {
    title: string;
    description: string;
  };
  isLoading?: boolean;
  text?: string;
  confirmButtonText?: string;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  entityName,
  customWarning,
  isLoading = false,
  text = `Are you sure you want to delete ${entityName}?`,
  confirmButtonText = 'Delete',
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-depth-1/80 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-depth-2 rounded-xl p-3 max-w-sm w-full mx-4 shadow-lg shadow-black">
        <div className="w-full flex justify-end">
          <CloseCircle
            variant="Bold"
            className="w-6 h-6 text-gray-500 dark:text-white hover:text-gray-700 dark:hover:text-gray-400 transition-colors cursor-pointer"
            onClick={onClose}
          />
        </div>
        <div className="px-3">
          <div className="space-y-3 my-4 text-center text-balance">
            <p>{text}</p>
            {customWarning && (
              <div className="mt-5">
                <Alert variant="destructive" className="text-left text-wrap text-red-500">
                  <AlertCircleIcon />
                  <AlertTitle>{customWarning.title}</AlertTitle>
                  <AlertDescription>
                    <p>{customWarning.description}</p>
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-depth-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading} className="flex-grow">
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            variant="destructiveFill"
            className="flex-grow"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                <span>{confirmButtonText}</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
