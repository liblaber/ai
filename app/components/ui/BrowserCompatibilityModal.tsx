import React from 'react';
import { toast } from 'sonner';
import { classNames } from '~/utils/classNames';

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
    <div
      className={classNames('fixed inset-0 flex items-center justify-center')}
      style={{
        backdropFilter: 'blur(8px)',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 999999,
      }}
    >
      <div
        className={classNames('relative max-w-lg mx-4 p-10 rounded-2xl shadow-2xl', 'bg-depth-1 border')}
        style={{
          backgroundColor: 'rgb(var(--color-depth-1))',
          borderColor: 'rgb(var(--color-accent-700))',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(59, 206, 255, 0.2)',
        }}
      >
        {/* Warning Icon */}
        <div className="flex justify-center mb-8">
          <div
            className="p-4 rounded-full relative"
            style={{
              backgroundColor: 'rgb(var(--color-accent-500))',
              boxShadow: '0 0 30px rgba(59, 206, 255, 0.4)',
            }}
          >
            <svg
              className="w-12 h-12"
              fill="currentColor"
              viewBox="0 0 20 20"
              style={{ color: 'rgb(var(--color-depth-1))' }}
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-3xl font-bold text-center text-primary mb-6">Browser Not Supported</h2>

        {/* Description */}
        <p className="text-center mb-10 text-lg leading-relaxed text-secondary">
          This application needs advanced browser features to run code and build applications directly in your browser.
          Please switch to a supported browser for the full interactive experience.
        </p>

        {/* Supported Browsers List */}
        <div className="mb-10">
          <h3 className="text-lg font-semibold mb-6 text-center text-primary">Supported Browsers:</h3>
          <div className="grid grid-cols-2 gap-3">
            {['Chrome', 'Edge', 'Brave', 'Opera'].map((browser) => (
              <div
                key={browser}
                className="flex items-center justify-center py-3 px-4 rounded-lg transition-all duration-200 relative group bg-depth-2 text-primary border border-accent-800"
              >
                <span
                  className="w-3 h-3 rounded-full mr-3"
                  style={{ backgroundColor: 'rgb(var(--color-accent-400))' }}
                ></span>
                <span className="font-medium relative">
                  {browser}
                  <span
                    className="absolute bottom-0 left-0 h-0.5 bg-accent-400 transition-all duration-300 group-hover:w-full"
                    style={{
                      width: '0%',
                      backgroundColor: 'rgb(var(--color-accent-400))',
                    }}
                  ></span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Button */}
        <button
          onClick={handleCopyUrl}
          className={classNames(
            'w-full py-4 px-8 rounded-xl font-semibold text-lg transition-all duration-300',
            'flex items-center justify-center gap-3',
            'hover:scale-105 active:scale-95 relative overflow-hidden group',
            'cursor-pointer',
          )}
          style={{
            backgroundColor: 'rgb(var(--color-accent-500))',
            color: 'rgb(var(--color-depth-1))',
            boxShadow: '0 8px 32px rgba(59, 206, 255, 0.3), 0 0 0 1px rgba(59, 206, 255, 0.5)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 transform -skew-x-12 group-hover:animate-pulse"></div>
          <svg className="w-5 h-5 relative z-10" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1zM6 3a2 2 0 00-2 2v6a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"
              clipRule="evenodd"
            />
          </svg>
          <span className="relative z-10">Copy URL to Share</span>
        </button>
      </div>
    </div>
  );
};
