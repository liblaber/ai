'use client';

import { useState, useEffect } from 'react';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('google-spreadsheet-picker');
import { Table, Search, Loader, Calendar, ExternalLink, Sheet } from 'lucide-react';
import { Input } from '~/components/ui/Input';
import { Button } from '~/components/ui/Button';

interface GoogleSpreadsheet {
  id: string;
  title: string;
  createdTime: string;
  modifiedTime: string;
  webViewLink: string;
  thumbnailLink?: string;
  owners?: Array<{ displayName: string; emailAddress: string }>;
  sheets?: Array<{ title: string; sheetId: number }>;
}

interface GoogleSpreadsheetPickerProps {
  accessToken: string;
  onSelect: (spreadsheet: { id: string; title: string; url: string }) => void;
  onError: (error: string) => void;
}

interface GoogleDriveFile {
  id: string;
  name: string;
  createdTime: string;
  modifiedTime: string;
  webViewLink: string;
  thumbnailLink?: string;
  owners?: Array<{ displayName: string; emailAddress: string }>;
}

interface GoogleDriveResponse {
  files?: GoogleDriveFile[];
}

interface GoogleSheetProperties {
  title: string;
  sheetId: number;
}

interface GoogleSheet {
  properties: GoogleSheetProperties;
}

interface GoogleSheetsResponse {
  sheets?: GoogleSheet[];
}

export function GoogleSpreadsheetPicker({ accessToken, onSelect, onError }: GoogleSpreadsheetPickerProps) {
  const [spreadsheets, setSpreadsheets] = useState<GoogleSpreadsheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSheetId, setSelectedSheetId] = useState<string | null>(null);

  useEffect(() => {
    loadSpreadsheets();
  }, [accessToken]);

  const loadSpreadsheets = async () => {
    try {
      setLoading(true);

      // Use Google Drive API to list spreadsheets
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?` +
          `q=mimeType='application/vnd.google-apps.spreadsheet'&` +
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
        throw new Error(`Failed to load spreadsheets: ${response.statusText}`);
      }

      const data = (await response.json()) as GoogleDriveResponse;

      // Get additional sheet info for each spreadsheet
      const formattedSheets: GoogleSpreadsheet[] = await Promise.all(
        (data.files || []).map(async (file: GoogleDriveFile) => {
          let sheets: Array<{ title: string; sheetId: number }> = [];

          try {
            // Get sheet tabs using Sheets API
            const sheetsResponse = await fetch(
              `https://sheets.googleapis.com/v4/spreadsheets/${file.id}?fields=sheets.properties(title,sheetId)`,
              {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
              },
            );

            if (sheetsResponse.ok) {
              const sheetsData = (await sheetsResponse.json()) as GoogleSheetsResponse;
              sheets =
                sheetsData.sheets?.map((sheet: GoogleSheet) => ({
                  title: sheet.properties.title,
                  sheetId: sheet.properties.sheetId,
                })) || [];
            }
          } catch (error) {
            logger.warn(`Failed to load sheet info for ${file.name}:`, error);
          }

          return {
            id: file.id,
            title: file.name || 'Untitled Spreadsheet',
            createdTime: file.createdTime,
            modifiedTime: file.modifiedTime,
            webViewLink: file.webViewLink,
            thumbnailLink: file.thumbnailLink,
            owners: file.owners,
            sheets,
          };
        }),
      );

      setSpreadsheets(formattedSheets);
    } catch (error) {
      logger.error('Failed to load spreadsheets:', error);
      onError('Failed to load your Google Spreadsheets. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredSpreadsheets = spreadsheets.filter((sheet) =>
    sheet.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleSpreadsheetSelect = (spreadsheet: GoogleSpreadsheet) => {
    setSelectedSheetId(spreadsheet.id);
    onSelect({
      id: spreadsheet.id,
      title: spreadsheet.title,
      url: spreadsheet.webViewLink,
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
        <p>Loading your Google Spreadsheets...</p>
      </div>
    );
  }

  if (spreadsheets.length === 0) {
    return (
      <div className="text-center py-8">
        <Table className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-400 mb-4">No Google Spreadsheets found in your account.</p>
        <Button onClick={loadSpreadsheets} variant="outline" className="text-sm">
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
          placeholder="Search your spreadsheets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Spreadsheets List */}
      <div className="max-h-96 overflow-y-auto border border-gray-600 rounded-lg">
        {filteredSpreadsheets.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p>No spreadsheets match your search.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {filteredSpreadsheets.map((spreadsheet) => (
              <div
                key={spreadsheet.id}
                onClick={() => handleSpreadsheetSelect(spreadsheet)}
                className={`p-4 hover:bg-gray-700/50 cursor-pointer transition-colors ${
                  selectedSheetId === spreadsheet.id ? 'bg-green-600/20 border-l-4 border-green-500' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    <Table className="w-5 h-5 text-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-white truncate" title={spreadsheet.title}>
                      {spreadsheet.title}
                    </h3>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Modified {formatDate(spreadsheet.modifiedTime)}
                      </div>
                      {spreadsheet.owners?.[0] && (
                        <div className="truncate">Owner: {spreadsheet.owners[0].displayName}</div>
                      )}
                    </div>

                    {/* Sheet tabs info */}
                    {spreadsheet.sheets && spreadsheet.sheets.length > 0 && (
                      <div className="flex items-center gap-2 mt-2">
                        <Sheet className="w-3 h-3 text-gray-500" />
                        <span className="text-xs text-gray-500">
                          {spreadsheet.sheets.length} sheet{spreadsheet.sheets.length !== 1 ? 's' : ''}
                          {spreadsheet.sheets.length <= 3 && <>: {spreadsheet.sheets.map((s) => s.title).join(', ')}</>}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-2">
                      <a
                        href={spreadsheet.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-xs text-green-400 hover:text-green-300"
                      >
                        Open in Google Sheets
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      {selectedSheetId === spreadsheet.id && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-600/20 text-green-400">
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
        <Button onClick={loadSpreadsheets} variant="outline" disabled={loading} className="text-sm">
          {loading ? (
            <div className="flex items-center gap-2">
              <Loader className="w-4 h-4 animate-spin" />
              Loading...
            </div>
          ) : (
            'Refresh Spreadsheets'
          )}
        </Button>
      </div>
    </div>
  );
}
