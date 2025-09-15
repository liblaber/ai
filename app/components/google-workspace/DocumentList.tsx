'use client';

import { useState } from 'react';
import { classNames } from '~/utils/classNames';
import { Input } from '~/components/ui/Input';

interface Document {
  id: string;
  name: string;
  modified: string;
  owner: string;
  url: string;
}

interface DocumentListProps {
  documents: Document[];
  selectedDocument: Document | null;
  onDocumentSelect: (doc: Document) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export function DocumentList({
  documents,
  selectedDocument,
  onDocumentSelect,
  onRefresh,
  isLoading,
}: DocumentListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDocuments = documents.filter((doc) => doc.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div>
      <h2
        style={{
          fontFamily: 'SF Pro Text',
          fontWeight: 500,
          fontSize: '16px',
          lineHeight: '24px',
          letterSpacing: '0%',
          verticalAlign: 'middle',
          color: 'var(--Grey-Grey-50, #F7F7F8)',
          marginBottom: '16px',
        }}
      >
        Select Google Spreadsheet
      </h2>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            style={{
              gap: '8px',
              borderRadius: '50px',
              paddingTop: '8px',
              paddingRight: '10px',
              paddingBottom: '8px',
              paddingLeft: '40px',
              background: 'var(--Grey-Grey-600, #4A4F59)',
              color: '#fff',
              border: 'none',
            }}
          />
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none" style={{ left: '12px' }}>
            <img src="/icons/search.svg" alt="Search" style={{ width: '16px', height: '16px' }} />
          </div>
        </div>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center gap-2 cursor-pointer transition-colors hover:bg-[var(--color-gray-700)] border border-[var(--color-gray-600)] rounded-lg"
          style={{
            height: '40px',
            padding: '10px 16px',
            borderRadius: '8px',
          }}
        >
          <img src="/icons/refresh.svg" alt="Refresh" style={{ width: '16px', height: '16px' }} />
          <span
            style={{
              fontFamily: 'SF Pro Text, sans-serif',
              fontSize: '14px',
              color: 'var(--color-gray-300)',
            }}
          >
            Refresh
          </span>
        </button>
      </div>

      <div
        style={{
          maxHeight: '200px',
          overflowY: 'scroll',
        }}
      >
        <div
          className="flex items-center border-b border-[var(--color-gray-600)] text-[var(--color-gray-300)]"
          style={{
            height: '40px',
            padding: '0 16px',
            fontFamily: 'SF Pro Text, sans-serif',
            fontSize: '12px',
            fontWeight: 500,
          }}
        >
          <div style={{ width: '6%' }} />
          <div style={{ width: '54%' }}>Sheet Name</div>
          <div style={{ width: '40%' }}>Modified</div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div
              style={{
                fontFamily: 'SF Pro Text, sans-serif',
                fontSize: '14px',
                color: 'var(--color-gray-400)',
              }}
            >
              Loading documents...
            </div>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div
              style={{
                fontFamily: 'SF Pro Text, sans-serif',
                fontSize: '14px',
                color: 'var(--color-gray-400)',
              }}
            >
              No documents found
            </div>
          </div>
        ) : (
          <div>
            {filteredDocuments.map((doc, index) => (
              <div
                key={doc.id}
                onClick={() => onDocumentSelect(doc)}
                className={classNames(
                  'flex items-center cursor-pointer transition-colors hover:bg-[var(--color-gray-700)] border-b border-[var(--color-gray-600)]',
                  selectedDocument?.id === doc.id ? 'bg-[var(--color-gray-700)]' : '',
                )}
                style={{
                  height: '56px',
                  padding: '0 16px',
                  borderBottomWidth: index === filteredDocuments.length - 1 ? '0' : '1px',
                }}
              >
                <div
                  className={classNames(
                    'rounded-full border-2 mr-4',
                    selectedDocument?.id === doc.id
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent)]'
                      : 'border-[var(--color-gray-500)]',
                  )}
                  style={{
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {selectedDocument?.id === doc.id && (
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--color-gray-900)',
                      }}
                    />
                  )}
                </div>
                <div className="flex items-center flex-1">
                  <div style={{ width: '60%' }}>
                    <div>
                      <img
                        src="/icons/google-sheets.svg"
                        alt="Google Sheets"
                        style={{ width: '16px', height: '16px', marginRight: '8px', display: 'inline-block' }}
                      />
                      <div
                        style={{
                          fontFamily: 'SF Pro Text, sans-serif',
                          fontSize: '14px',
                          fontWeight: 400,
                          color: 'var(--color-gray-50)',
                          marginBottom: '2px',
                          display: 'inline-block',
                        }}
                      >
                        {doc.name}
                      </div>
                    </div>
                    <div
                      style={{
                        fontFamily: 'SF Pro Text, sans-serif',
                        fontSize: '12px',
                        color: 'var(--color-gray-400)',
                      }}
                    >
                      {doc.owner}
                    </div>
                  </div>
                  <div style={{ width: '40%' }}>
                    <div
                      style={{
                        fontFamily: 'SF Pro Text, sans-serif',
                        fontSize: '14px',
                        color: 'var(--color-gray-300)',
                      }}
                    >
                      {doc.modified}
                    </div>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(doc.url, '_blank');
                  }}
                  className="ml-2 cursor-pointer transition-colors hover:bg-[var(--color-gray-600)] rounded"
                  style={{
                    padding: '4px',
                  }}
                >
                  <img src="/icons/external-link.svg" alt="Open" style={{ width: '16px', height: '16px' }} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
