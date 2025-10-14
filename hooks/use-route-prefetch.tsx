'use client';

import { useCallback } from 'react';
import { useDataCache } from './use-data-cache';

export function useRoutePrefetch() {
  const dataCache = useDataCache();

  const prefetchProducts = useCallback(async () => {
    // Only prefetch if we're in Electron and don't have cached data
    if (typeof window !== 'undefined' && window.electronAPI) {
      const cached = dataCache.getCachedProducts(1, 25, '');
      if (!cached) {
        try {
          const result = await window.electronAPI.database.products.getPaginated(1, 25, '');

          const paginatedData = {
            items: result.products,
            total: result.total,
            totalPages: result.totalPages,
            currentPage: result.currentPage,
            pageSize: result.pageSize,
            searchTerm: '',
            timestamp: Date.now()
          };

          dataCache.setCachedProducts(1, 25, '', paginatedData);
        } catch (error) {
          console.log('Prefetch products failed:', error);
        }
      }
    }
  }, [dataCache]);

  const prefetchCustomers = useCallback(async () => {
    // Only prefetch if we're in Electron and don't have cached data
    if (typeof window !== 'undefined' && window.electronAPI) {
      const cached = dataCache.getCachedCustomers(1, 10, '');
      if (!cached) {
        try {
          const result = await window.electronAPI.database.customers.getPaginated(1, 10, '');

          const paginatedData = {
            items: result.customers,
            total: result.total,
            totalPages: result.totalPages,
            currentPage: result.currentPage,
            pageSize: result.pageSize,
            searchTerm: '',
            timestamp: Date.now()
          };

          dataCache.setCachedCustomers(1, 10, '', paginatedData);
        } catch (error) {
          console.log('Prefetch customers failed:', error);
        }
      }
    }
  }, [dataCache]);

  const prefetchSales = useCallback(async () => {
    // Only prefetch if we're in Electron and don't have cached data
    if (typeof window !== 'undefined' && window.electronAPI) {
      const cached = dataCache.getCachedSales(1, 25, '');
      if (!cached) {
        try {
          const result = await window.electronAPI.database.sales.getPaginated(1, 25, '');

          const paginatedData = {
            items: result.sales,
            total: result.total,
            totalPages: result.totalPages,
            currentPage: result.currentPage,
            pageSize: result.pageSize,
            searchTerm: '',
            timestamp: Date.now()
          };

          dataCache.setCachedSales(1, 25, '', paginatedData);
        } catch (error) {
          console.log('Prefetch sales failed:', error);
        }
      }
    }
  }, [dataCache]);

  const prefetchCalendar = useCallback(async () => {
    // Calendar events are handled differently - no prefetching needed
    // as they are loaded directly in the calendar component
    console.log('Calendar prefetch skipped - handled by component');
  }, []);

  // Prefetch all common routes
  const prefetchAllRoutes = useCallback(async () => {
    // Use setTimeout to avoid blocking the main thread
    setTimeout(() => {
      prefetchProducts();
    }, 100);

    setTimeout(() => {
      prefetchCustomers();
    }, 200);

    setTimeout(() => {
      prefetchSales();
    }, 300);
  }, [prefetchProducts, prefetchCustomers, prefetchSales]);

  return {
    prefetchProducts,
    prefetchCustomers,
    prefetchSales,
    prefetchCalendar,
    prefetchAllRoutes
  };
}