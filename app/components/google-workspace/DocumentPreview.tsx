'use client';

type PreviewType = 'document' | 'apps-script';

interface PreviewData {
  title?: string;
  documentId?: string;
  scriptId?: string;
  modified?: string;
  owner?: string;
  url?: string;
}

interface DocumentPreviewProps {
  type: PreviewType;
  data: PreviewData;
}

export function DocumentPreview({ type, data }: DocumentPreviewProps) {
  const isDocument = type === 'document';
  const isAppsScript = type === 'apps-script';

  // Dynamic content based on type
  const icon = isDocument ? '/icons/google-sheets.svg' : '/icons/apps-script.svg';
  const iconSize = isDocument ? { width: '20px', height: '20px' } : { width: '14px', height: '20px' };
  const title = isDocument ? data.title || 'Google Sheets Document' : 'Apps Script Web App';
  const buttonText = isDocument ? 'Open in Google Sheets' : 'Test Apps Script';
  const buttonIcon = isDocument ? 'after' : 'before';

  return (
    <div
      className="rounded-lg"
      style={{
        gap: '16px',
        borderRadius: '8px',
        padding: '20px',
        borderTop: '1px solid #FFFFFF33',
        border: '1px solid #FFFFFF33',
      }}
    >
      <div className="flex items-center" style={{ marginBottom: '16px' }}>
        <img src={icon} alt={isDocument ? 'Google Sheets' : 'Apps Script'} style={iconSize} />
        <span
          style={{
            fontFamily: 'SF Pro Text, sans-serif',
            fontSize: '16px',
            fontWeight: 500,
            color: 'var(--color-gray-100)',
            marginLeft: '5px',
          }}
        >
          {title}
        </span>
      </div>

      <div style={{ marginBottom: '16px' }}>
        {isDocument && (
          <>
            <div
              style={{
                fontFamily: 'SF Pro Text, sans-serif',
                fontSize: '14px',
                fontWeight: 400,
                lineHeight: '20px',
                color: 'var(--color-gray-300)',
                marginBottom: '4px',
              }}
            >
              Document ID: {data.documentId}
            </div>
            <div
              style={{
                fontFamily: 'SF Pro Text, sans-serif',
                fontSize: '14px',
                fontWeight: 400,
                lineHeight: '20px',
                color: 'var(--color-gray-300)',
                marginBottom: '4px',
              }}
            >
              Modified: {data.modified}
            </div>
            <div
              style={{
                fontFamily: 'SF Pro Text, sans-serif',
                fontSize: '14px',
                fontWeight: 400,
                lineHeight: '20px',
                color: 'var(--color-gray-300)',
              }}
            >
              Owner: {data.owner}
            </div>
          </>
        )}

        {isAppsScript && (
          <div
            style={{
              fontFamily: 'SF Pro Text, sans-serif',
              fontSize: '14px',
              fontWeight: 400,
              lineHeight: '20px',
              color: 'var(--color-gray-300)',
            }}
          >
            Script ID: {data.scriptId}
          </div>
        )}
      </div>

      <button
        onClick={() => window.open(data.url, '_blank')}
        className="flex items-center gap-2 cursor-pointer transition-colors hover:bg-[var(--color-gray-700)] border border-[var(--color-gray-600)] rounded-lg"
        style={{
          height: '36px',
          padding: '8px 12px',
          borderRadius: '8px',
        }}
      >
        {buttonIcon === 'before' && (
          <img src="/icons/external-link.svg" alt="External link" style={{ width: '16px', height: '16px' }} />
        )}
        <span
          style={{
            fontFamily: 'SF Pro Text, sans-serif',
            fontSize: '14px',
            color: 'var(--color-gray-300)',
          }}
        >
          {buttonText}
        </span>
        {buttonIcon === 'after' && (
          <img src="/icons/external-link.svg" alt="External link" style={{ width: '16px', height: '16px' }} />
        )}
      </button>
    </div>
  );
}

// Legacy exports for backward compatibility
export function AppsScriptPreview({ data }: { data: { scriptId?: string; url?: string } }) {
  return <DocumentPreview type="apps-script" data={data} />;
}
