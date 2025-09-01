import React from 'react';
import { toast } from 'sonner';

const SUPPORTED_BROWSERS = ['Chrome', 'Edge', 'Brave', 'Opera'] as const;

interface BrowserCompatibilityModalProps {
  isOpen: boolean;
}

export const BrowserCompatibilityModal: React.FC<BrowserCompatibilityModalProps> = ({ isOpen }) => {
  if (!isOpen) {
    return null;
  }

  const handleCopyUrl = () => {
    const currentUrl = window.location.href;

    navigator.clipboard
      .writeText(currentUrl)
      .then(() => {
        toast.success('URL copied to clipboard! Paste it in a supported browser for full functionality.');
      })
      .catch(() => {
        const userInput = prompt(
          'Copy this URL to open in a supported browser (Chrome, Edge, Brave, Opera):',
          currentUrl,
        );

        if (userInput !== null) {
          toast.success('Please open the URL in a supported browser for full functionality.');
        }
      });
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      {/* Background overlay */}
      <div className="fixed inset-0 bg-black opacity-20"></div>

      {/* Modal */}
      <div className="rounded-2xl p-7 w-[500px] max-h-[90vh] mx-4 border border-depth-3 shadow-2xl relative z-10 bg-[var(--Grey-Grey-800,#1E2125)]">
        {/* Title */}
        <h2 className="text-xl font-bold text-primary mb-4">Browser Not Supported</h2>

        {/* Description */}
        <p className="text-sm text-secondary mb-5 leading-relaxed">
          This application needs advanced browser features to run code and build applications directly in your browser.
          Please switch to a supported browser for the full interactive experience.
        </p>

        {/* Header Row: Supported Browsers Label and Copy Button */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-medium text-primary whitespace-nowrap">Supported Browsers:</h3>

          <button
            onClick={handleCopyUrl}
            className="flex items-center gap-0.5 px-3 py-2 text-primary rounded-lg text-sm font-medium transition-colors cursor-pointer hover:opacity-80"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M10.6654 8.60016V11.4002C10.6654 13.7335 9.73203 14.6668 7.3987 14.6668H4.5987C2.26536 14.6668 1.33203 13.7335 1.33203 11.4002V8.60016C1.33203 6.26683 2.26536 5.3335 4.5987 5.3335H7.3987C9.73203 5.3335 10.6654 6.26683 10.6654 8.60016Z"
                fill="currentColor"
              />
              <path
                d="M11.3998 1.3335H8.59984C6.67914 1.3335 5.71152 1.97043 5.42907 3.49277C5.32748 4.04033 5.79484 4.50016 6.35175 4.50016H7.39984C10.1998 4.50016 11.4998 5.80016 11.4998 8.60016V9.64826C11.4998 10.2052 11.9597 10.6725 12.5072 10.5709C14.0296 10.2885 14.6665 9.32086 14.6665 7.40016V4.60016C14.6665 2.26683 13.7332 1.3335 11.3998 1.3335Z"
                fill="currentColor"
              />
            </svg>
            Copy URL to Share
          </button>
        </div>

        {/* Supported Browsers Grid */}
        <div className="flex gap-2 justify-center">
          {SUPPORTED_BROWSERS.map((browser) => (
            <div
              key={browser}
              className="flex flex-col items-center justify-center rounded-lg gap-2 w-[102px] h-[90px] border border-white/20 pt-4 px-3 pb-3"
            >
              <img src={`/icons/${browser}.svg`} alt={`${browser} logo`} width={36} height={36} />
              <span className="text-xs text-secondary text-center">{browser}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
