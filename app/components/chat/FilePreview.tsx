import React from 'react';
import { X } from 'lucide-react';

interface FilePreviewProps {
  files: File[];
  imageDataList: string[];
  onRemove: (index: number) => void;
}

const FilePreview: React.FC<FilePreviewProps> = ({ files, imageDataList, onRemove }) => {
  if (!files || files.length === 0) {
    return null;
  }

  return (
    <div className="absolute top-full left-0 mt-2 p-2 bg-gray-900 rounded-lg shadow-lg border border-gray-700 max-w-[300px]">
      <div className="flex flex-row overflow-x-auto gap-2">
        {files.map((file, index) => (
          <div key={file.name + file.size} className="relative">
            {imageDataList[index] && (
              <div className="relative">
                <img src={imageDataList[index]} alt={file.name} className="max-h-20" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(index);
                  }}
                  className="absolute top-1 right-1 z-10 bg-black rounded-full w-5 h-5 shadow-md hover:bg-gray-900 transition-colors flex items-center justify-center"
                >
                  <X className="w-3 h-3 text-gray-200" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FilePreview;
