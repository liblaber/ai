'use client';

interface BasePreviewData {
  url?: string;
}

interface DocumentData extends BasePreviewData {
  title?: string;
  documentId?: string;
  modified?: string;
  owner?: string;
}

interface AppsScriptData extends BasePreviewData {
  scriptId?: string;
}

const commonContainerStyle = {
  gap: '16px',
  borderRadius: '8px',
  padding: '20px',
  borderTop: '1px solid #FFFFFF33',
  border: '1px solid #FFFFFF33',
};

const commonTextStyle = {
  fontFamily: 'SF Pro Text, sans-serif',
  fontSize: '14px',
  fontWeight: 400,
  lineHeight: '20px',
  color: 'var(--color-gray-300)',
};

function PreviewButton({ url, text, iconPosition }: { url?: string; text: string; iconPosition: 'before' | 'after' }) {
  return (
    <button
      onClick={() => window.open(url, '_blank')}
      className="flex items-center gap-2 cursor-pointer transition-colors hover:bg-[var(--color-gray-700)] border border-[var(--color-gray-600)] rounded-lg"
      style={{
        height: '36px',
        padding: '8px 12px',
        borderRadius: '8px',
      }}
    >
      {iconPosition === 'before' && (
        <img src="/icons/external-link.svg" alt="External link" style={{ width: '16px', height: '16px' }} />
      )}
      <span
        style={{
          fontFamily: 'SF Pro Text, sans-serif',
          fontSize: '14px',
          color: 'var(--color-gray-300)',
        }}
      >
        {text}
      </span>
      {iconPosition === 'after' && (
        <img src="/icons/external-link.svg" alt="External link" style={{ width: '16px', height: '16px' }} />
      )}
    </button>
  );
}

export function GoogleSheetsPreview({ data }: { data: DocumentData }) {
  return (
    <div className="rounded-lg" style={commonContainerStyle}>
      <div className="flex items-center" style={{ marginBottom: '16px' }}>
        <img src="/icons/google-sheets.svg" alt="Google Sheets" style={{ width: '20px', height: '20px' }} />
        <span
          style={{
            fontFamily: 'SF Pro Text, sans-serif',
            fontSize: '16px',
            fontWeight: 500,
            color: 'var(--color-gray-100)',
            marginLeft: '5px',
          }}
        >
          {data.title || 'Google Sheets Document'}
        </span>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <div style={{ ...commonTextStyle, marginBottom: '4px' }}>Document ID: {data.documentId}</div>
        <div style={{ ...commonTextStyle, marginBottom: '4px' }}>Modified: {data.modified}</div>
        <div style={commonTextStyle}>Owner: {data.owner}</div>
      </div>

      <PreviewButton url={data.url} text="Open in Google Sheets" iconPosition="after" />
    </div>
  );
}

export function AppsScriptPreview({ data }: { data: AppsScriptData }) {
  return (
    <div className="rounded-lg" style={commonContainerStyle}>
      <div className="flex items-center" style={{ marginBottom: '16px' }}>
        <img src="/icons/apps-script.svg" alt="Apps Script" style={{ width: '14px', height: '20px' }} />
        <span
          style={{
            fontFamily: 'SF Pro Text, sans-serif',
            fontSize: '16px',
            fontWeight: 500,
            color: 'var(--color-gray-100)',
            marginLeft: '5px',
          }}
        >
          Apps Script Web App
        </span>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <div style={commonTextStyle}>Script ID: {data.scriptId}</div>
      </div>

      <PreviewButton url={data.url} text="Test Apps Script" iconPosition="before" />
    </div>
  );
}

// Legacy unified component for backward compatibility
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
  if (type === 'document') {
    return <GoogleSheetsPreview data={data} />;
  }

  return <AppsScriptPreview data={data} />;
}
