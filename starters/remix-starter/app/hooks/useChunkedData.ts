import { useMemo, useState, useCallback } from 'react';

interface UseChunkedDataOptions {
  chunkSize?: number;
  enableVirtualization?: boolean;
}

export function useChunkedData<T>(data: T[], options: UseChunkedDataOptions = {}) {
  const { chunkSize = 100, enableVirtualization = false } = options;
  const [currentPage, setCurrentPage] = useState(0);

  // Memoize chunks to prevent recalculation
  const chunks = useMemo(() => {
    if (!data || data.length === 0) return [];

    const result: T[][] = [];
    for (let i = 0; i < data.length; i += chunkSize) {
      result.push(data.slice(i, i + chunkSize));
    }
    return result;
  }, [data, chunkSize]);

  // Current visible data
  const currentData = useMemo(() => {
    if (enableVirtualization) {
      // For virtualization, return all data
      return data;
    }

    // For pagination, return current chunk
    return chunks[currentPage] || [];
  }, [chunks, currentPage, enableVirtualization, data]);

  // Aggregated data for calculations (always use full dataset)
  const aggregatedData = useMemo(() => {
    if (!data || data.length === 0)
      return {
        total: 0,
        count: data?.length || 0,
        average: 0,
        sum: 0,
      };

    // Calculate aggregations on full dataset
    const numericValues = data
      .map((item: any) => {
        // Try to extract numeric values from common field patterns
        const numericFields = Object.keys(item).filter(
          (key) => key.includes('numeric') || key.includes('amount') || key.includes('value'),
        );

        const firstNumericField = numericFields[0];
        return firstNumericField ? Number(item[firstNumericField]) || 0 : 0;
      })
      .filter((val) => !isNaN(val));

    const sum = numericValues.reduce((acc, val) => acc + val, 0);
    const count = data.length;
    const average = count > 0 ? sum / count : 0;

    return {
      total: count,
      count,
      average,
      sum,
      numericValues,
    };
  }, [data]);

  const nextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(prev + 1, chunks.length - 1));
  }, [chunks.length]);

  const previousPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(prev - 1, 0));
  }, []);

  const goToPage = useCallback(
    (page: number) => {
      setCurrentPage(Math.max(0, Math.min(page, chunks.length - 1)));
    },
    [chunks.length],
  );

  return {
    currentData,
    aggregatedData,
    totalPages: chunks.length,
    currentPage,
    hasNextPage: currentPage < chunks.length - 1,
    hasPreviousPage: currentPage > 0,
    nextPage,
    previousPage,
    goToPage,
    totalItems: data?.length || 0,
    currentPageSize: currentData.length,
  };
}
