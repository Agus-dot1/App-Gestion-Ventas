'use client';

import { useCallback } from 'react';
import { useDataCache } from './use-data-cache';

export function useRoutePrefetch() {
  const dataCache = useDataCache();

  const prefetchProducts = useCallback(async () => {


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




    console.log('Calendar prefetch skipped - handled by component');
  }, []);



  const prefetchAllRoutes = useCallback(async () => {


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