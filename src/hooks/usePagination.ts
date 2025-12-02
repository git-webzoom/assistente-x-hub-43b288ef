import { useState, useEffect, useMemo } from 'react';

interface UsePaginationResult<T> {
  currentPage: number;
  setCurrentPage: (page: number) => void;
  paginatedItems: T[];
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  startIndex: number;
  endIndex: number;
}

export function usePagination<T>(
  items: T[] | undefined,
  itemsPerPage: number = 8
): UsePaginationResult<T> {
  const [currentPage, setCurrentPage] = useState(1);

  const safeItems = items ?? [];

  // Reset to page 1 when items change (search/filter applied)
  useEffect(() => {
    setCurrentPage(1);
  }, [safeItems.length]);

  const totalPages = Math.ceil(safeItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, safeItems.length);

  const paginatedItems = useMemo(() => {
    return safeItems.slice(startIndex, endIndex);
  }, [safeItems, startIndex, endIndex]);

  // Ensure current page is valid
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return {
    currentPage,
    setCurrentPage,
    paginatedItems,
    totalPages,
    totalItems: safeItems.length,
    itemsPerPage,
    startIndex,
    endIndex,
  };
}
