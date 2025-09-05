'use client';

import { useState, useEffect } from 'react';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('google-document-picker');
import { FileText, Search, Loader, Calendar, ExternalLink } from 'lucide-react';
import { Input } from '~/components/ui/Input';
import { Button } from '~/components/ui/Button';

interface GoogleDocument {
  id: string;
  title: string;
  createdTime: string;
  modifiedTime: string;
  webViewLink: string;
  thumbnailLink?: string;
  owners?: Array<{ displayName: string; emailAddress: string }>;
}

interface GoogleDocumentPickerProps {
  accessToken: string;
  onSelect: (document: { id: string; title: string; url: string }) => void;
  onError: (error: string) => void;
}

export function GoogleDocumentPicker({ accessToken, onSelect, onError }: GoogleDocumentPickerProps) {
  const [documents, setDocuments] = useState<GoogleDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  useEffect(() => {
    loadDocuments();
  }, [accessToken]);

  const loadDocuments = async () => {
    try {
      setLoading(true);

      // Use Google Drive API to list documents
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?` +
          `q=mimeType='application/vnd.google-apps.document'&` +
          `orderBy=modifiedTime desc&` +
          `fields=files(id,name,createdTime,modifiedTime,webViewLink,thumbnailLink,owners)&` +
          `pageSize=50`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to load documents: ${response.statusText}`);
      }

      const data = (await response.json()) as { files?: any[] };

      const formattedDocs: GoogleDocument[] =
        data.files?.map((file: any) => ({
          id: file.id,
          title: file.name || 'Untitled Document',
          createdTime: file.createdTime,
          modifiedTime: file.modifiedTime,
          webViewLink: file.webViewLink,
          thumbnailLink: file.thumbnailLink,
          owners: file.owners,
        })) || [];

      setDocuments(formattedDocs);
    } catch (error) {
      logger.error('Failed to load documents:', error);
      onError('Failed to load your Google Documents. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredDocuments = documents.filter((doc) => doc.title.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleDocumentSelect = (document: GoogleDocument) => {
    setSelectedDocId(document.id);
    onSelect({
      id: document.id,
      title: document.title,
      url: document.webViewLink,
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-gray-400">
        <Loader className="w-8 h-8 animate-spin mb-4" />
        <p>Loading your Google Documents...</p>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-400 mb-4">No Google Documents found in your account.</p>
        <Button onClick={loadDocuments} variant="outline" className="text-sm">
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Search your documents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Documents List */}
      <div className="max-h-96 overflow-y-auto border border-gray-600 rounded-lg">
        {filteredDocuments.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p>No documents match your search.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {filteredDocuments.map((document) => (
              <div
                key={document.id}
                onClick={() => handleDocumentSelect(document)}
                className={`p-4 hover:bg-gray-700/50 cursor-pointer transition-colors ${
                  selectedDocId === document.id ? 'bg-blue-600/20 border-l-4 border-blue-500' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    <FileText className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-white truncate" title={document.title}>
                      {document.title}
                    </h3>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Modified {formatDate(document.modifiedTime)}
                      </div>
                      {document.owners?.[0] && <div className="truncate">Owner: {document.owners[0].displayName}</div>}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <a
                        href={document.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                      >
                        Open in Google Docs
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      {selectedDocId === document.id && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-600/20 text-blue-400">
                          Selected
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Refresh Button */}
      <div className="text-center">
        <Button onClick={loadDocuments} variant="outline" disabled={loading} className="text-sm">
          {loading ? (
            <div className="flex items-center gap-2">
              <Loader className="w-4 h-4 animate-spin" />
              Loading...
            </div>
          ) : (
            'Refresh Documents'
          )}
        </Button>
      </div>
    </div>
  );
}
