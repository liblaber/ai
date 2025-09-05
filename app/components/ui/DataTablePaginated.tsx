'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DataTablePaginatedProps {
  data: any[];
  pageSize?: number;
  className?: string;
}

export function DataTablePaginated({ data, pageSize = 50, className = '' }: DataTablePaginatedProps) {
  const [currentPage, setCurrentPage] = useState(0);

  const paginatedData = useMemo(() => {
    const startIndex = currentPage * pageSize;
    const endIndex = startIndex + pageSize;

    return data.slice(startIndex, endIndex);
  }, [data, currentPage, pageSize]);

  const totalPages = Math.ceil(data.length / pageSize);
  const hasNextPage = currentPage < totalPages - 1;
  const hasPrevPage = currentPage > 0;

  // Don't show pagination for small datasets
  if (data.length <= pageSize) {
    return (
      <div className={className}>
        <DataTable data={data} />
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="mb-4 flex items-center justify-between text-sm text-gray-600">
        <div>
          Showing {currentPage * pageSize + 1}-{Math.min((currentPage + 1) * pageSize, data.length)} of {data.length}{' '}
          rows
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
            disabled={!hasPrevPage}
            className="flex items-center gap-1 px-2 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ChevronLeft size={16} />
            Previous
          </button>
          <span className="px-2">
            Page {currentPage + 1} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
            disabled={!hasNextPage}
            className="flex items-center gap-1 px-2 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <DataTable data={paginatedData} />

      {totalPages > 1 && (
        <div className="mt-4 flex justify-center">
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(10, totalPages) }).map((_, index) => {
              const pageIndex = Math.floor(currentPage / 10) * 10 + index;

              if (pageIndex >= totalPages) {
                return null;
              }

              return (
                <button
                  key={pageIndex}
                  onClick={() => setCurrentPage(pageIndex)}
                  className={`px-2 py-1 rounded text-sm ${
                    pageIndex === currentPage
                      ? 'bg-blue-500 text-white'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600'
                  }`}
                >
                  {pageIndex + 1}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function DataTable({ data }: { data: any[] }) {
  if (data.length === 0) {
    return <div className="text-center text-gray-500 p-8">No data to display</div>;
  }

  const headers = Object.keys(data[0]).filter((key) => !key.startsWith('_'));

  return (
    <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            {headers.map((header) => (
              <th
                key={header}
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
          {data.map((row, index) => (
            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
              {headers.map((header) => (
                <td key={header} className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {row[header]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
