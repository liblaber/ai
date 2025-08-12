import { useEffect, useState } from 'react';
import { type BundledLanguage, bundledLanguages, codeToHtml, isSpecialLang, type SpecialLanguage } from 'shiki';
import { Clipboard } from 'lucide-react';
import { classNames } from '~/utils/classNames';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('CodeBlock');

interface CodeBlockProps {
  className?: string;
  code: string;
  language?: BundledLanguage | SpecialLanguage;
  theme?: 'light-plus' | 'dark-plus';
  disableCopy?: boolean;
}

export const CodeBlock = ({
  className,
  code,
  language = 'plaintext',
  theme = 'dark-plus',
  disableCopy = false,
}: CodeBlockProps) => {
  const [html, setHTML] = useState<string | undefined>(undefined);
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    if (copied) {
      return;
    }

    navigator.clipboard.writeText(code);

    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  useEffect(() => {
    if (language && !isSpecialLang(language) && !(language in bundledLanguages)) {
      logger.warn(`Unsupported language '${language}'`);
    }

    logger.trace(`Language = ${language}`);

    const processCode = async () => {
      setHTML(await codeToHtml(code, { lang: language, theme }));
    };

    processCode();
  }, [code]);

  return (
    <div className={classNames('relative group text-left', className)}>
      <div
        className={classNames(
          'absolute top-[10px] right-[10px] rounded-md z-10 text-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity',
          {
            'rounded-l-0 opacity-100': copied,
          },
        )}
      >
        {!disableCopy && (
          <button
            className={classNames(
              'relative flex items-center bg-accent-500 p-[6px] justify-center rounded-md transition-theme',
              {
                'before:content-["Copied"] before:absolute before:left-[-53px] before:px-1.5 before:py-0.5 before:h-[30px] before:text-xs before:bg-white before:text-gray-500 before:rounded before:border before:border-gray-300':
                  copied,
              },
            )}
            title="Copy Code"
            onClick={() => copyToClipboard()}
          >
            <Clipboard className="w-4 h-4" />
          </button>
        )}
      </div>
      <div dangerouslySetInnerHTML={{ __html: html ?? '' }}></div>
    </div>
  );
};
