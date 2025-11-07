'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { Customer, Product, Sale } from '@/lib/database-operations';

interface PaginatedData<T> {
  items: T[];
  total: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  searchTerm: string;
  timestamp: number;
}

interface CacheEntry<T> {
  data: PaginatedData<T>;
  expiresAt: number;
}

interface DataCacheContextType {


  getCachedCustomers: (page: number, pageSize: number, searchTerm: string) => PaginatedData<Customer> | null;
  setCachedCustomers: (page: number, pageSize: number, searchTerm: string, data: PaginatedData<Customer>) => void;
  isCustomersCacheExpired: (page: number, pageSize: number, searchTerm: string) => boolean;
  


  getCachedProducts: (page: number, pageSize: number, searchTerm: string) => PaginatedData<Product> | null;
  setCachedProducts: (page: number, pageSize: number, searchTerm: string, data: PaginatedData<Product>) => void;
  isProductsCacheExpired: (page: number, pageSize: number, searchTerm: string) => boolean;
  


  getCachedSales: (page: number, pageSize: number, searchTerm: string) => PaginatedData<Sale> | null;
  setCachedSales: (page: number, pageSize: number, searchTerm: string, data: PaginatedData<Sale>) => void;
  isSalesCacheExpired: (page: number, pageSize: number, searchTerm: string) => boolean;
  


  clearCache: () => void;
  invalidateCache: (type: 'customers' | 'products' | 'sales') => void;
}

const DataCacheContext = createContext<DataCacheContextType | undefined>(undefined);



const CACHE_DURATION = 5 * 60 * 1000;

function generateCacheKey(page: number, pageSize: number, searchTerm: string): string {
  return `${page}-${pageSize}-${searchTerm.toLowerCase().trim()}`;
}

function isExpired(entry: CacheEntry<any>): boolean {
  return Date.now() > entry.expiresAt;
}

export function DataCacheProvider({ children }: { children: ReactNode }) {
  const [customerCache, setCustomerCache] = useState<Map<string, CacheEntry<Customer>>>(new Map());
  const [productCache, setProductCache] = useState<Map<string, CacheEntry<Product>>>(new Map());
  const [salesCache, setSalesCache] = useState<Map<string, CacheEntry<Sale>>>(new Map());

  const getCachedCustomers = useCallback((page: number, pageSize: number, searchTerm: string) => {
    const key = generateCacheKey(page, pageSize, searchTerm);
    const entry = customerCache.get(key);
    
    if (entry) {


      return entry.data;
    }
    
    return null;
  }, [customerCache]);

  const isCustomersCacheExpired = useCallback((page: number, pageSize: number, searchTerm: string) => {
    const key = generateCacheKey(page, pageSize, searchTerm);
    const entry = customerCache.get(key);
    return !entry || isExpired(entry);
  }, [customerCache]);

  const setCachedCustomers = useCallback((page: number, pageSize: number, searchTerm: string, data: PaginatedData<Customer>) => {
    const key = generateCacheKey(page, pageSize, searchTerm);
    const entry: CacheEntry<Customer> = {
      data: { ...data, timestamp: Date.now() },
      expiresAt: Date.now() + CACHE_DURATION
    };
    
    setCustomerCache(prev => {
      const newCache = new Map(prev);
      newCache.set(key, entry);
      


      if (newCache.size > 50) {
        const firstKey = newCache.keys().next().value;
        if (firstKey !== undefined) {
          newCache.delete(firstKey);
        }
      }
      
      return newCache;
    });
  }, []);

  const getCachedProducts = useCallback((page: number, pageSize: number, searchTerm: string) => {
    const key = generateCacheKey(page, pageSize, searchTerm);
    const entry = productCache.get(key);
    
    if (entry) {


      return entry.data;
    }
    
    return null;
  }, [productCache]);

  const isProductsCacheExpired = useCallback((page: number, pageSize: number, searchTerm: string) => {
    const key = generateCacheKey(page, pageSize, searchTerm);
    const entry = productCache.get(key);
    return !entry || isExpired(entry);
  }, [productCache]);

  const setCachedProducts = useCallback((page: number, pageSize: number, searchTerm: string, data: PaginatedData<Product>) => {
    const key = generateCacheKey(page, pageSize, searchTerm);
    const entry: CacheEntry<Product> = {
      data: { ...data, timestamp: Date.now() },
      expiresAt: Date.now() + CACHE_DURATION
    };
    
    setProductCache(prev => {
      const newCache = new Map(prev);
      newCache.set(key, entry);
      
      if (newCache.size > 50) {
        const firstKey = newCache.keys().next().value;
        if (firstKey !== undefined) {
          newCache.delete(firstKey);
        }
      }
      
      return newCache;
    });
  }, []);

  const getCachedSales = useCallback((page: number, pageSize: number, searchTerm: string) => {
    const key = generateCacheKey(page, pageSize, searchTerm);
    const entry = salesCache.get(key);
    
    if (entry) {


      return entry.data;
    }
    
    return null;
  }, [salesCache]);

  const isSalesCacheExpired = useCallback((page: number, pageSize: number, searchTerm: string) => {
    const key = generateCacheKey(page, pageSize, searchTerm);
    const entry = salesCache.get(key);
    return !entry || isExpired(entry);
  }, [salesCache]);

  const setCachedSales = useCallback((page: number, pageSize: number, searchTerm: string, data: PaginatedData<Sale>) => {
    const key = generateCacheKey(page, pageSize, searchTerm);
    const entry: CacheEntry<Sale> = {
      data: { ...data, timestamp: Date.now() },
      expiresAt: Date.now() + CACHE_DURATION
    };
    
    setSalesCache(prev => {
      const newCache = new Map(prev);
      newCache.set(key, entry);
      
      if (newCache.size > 50) {
        const firstKey = newCache.keys().next().value;
        if (firstKey !== undefined) {
          newCache.delete(firstKey);
        }
      }
      
      return newCache;
    });
  }, []);

  const clearCache = useCallback(() => {
    setCustomerCache(new Map());
    setProductCache(new Map());
    setSalesCache(new Map());
  }, []);

  const invalidateCache = useCallback((type: 'customers' | 'products' | 'sales') => {
    switch (type) {
      case 'customers':
        setCustomerCache(new Map());
        break;
      case 'products':
        setProductCache(new Map());
        break;
      case 'sales':
        setSalesCache(new Map());
        break;
    }
  }, []);

  const value: DataCacheContextType = {
    getCachedCustomers,
    setCachedCustomers,
    isCustomersCacheExpired,
    getCachedProducts,
    setCachedProducts,
    isProductsCacheExpired,
    getCachedSales,
    setCachedSales,
    isSalesCacheExpired,
    clearCache,
    invalidateCache
  };

  return (
    <DataCacheContext.Provider value={value}>
      {children}
    </DataCacheContext.Provider>
  );
}

export function useDataCache() {
  const context = useContext(DataCacheContext);
  if (context === undefined) {
    throw new Error('useDataCache must be used within a DataCacheProvider');
  }
  return context;
}



export function usePrefetch() {
  const cache = useDataCache();
  
  const prefetchCustomers = useCallback(async (page: number = 1, pageSize: number = 25, searchTerm: string = '') => {
    if (typeof window === 'undefined' || !window.electronAPI) return;
    
    const cached = cache.getCachedCustomers(page, pageSize, searchTerm);
    if (cached) return; // Already cached
    
    try {
      const result = await window.electronAPI.database.customers.getPaginated(page, pageSize, searchTerm);
      cache.setCachedCustomers(page, pageSize, searchTerm, {
        items: result.customers,
        total: result.total,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        pageSize: result.pageSize,
        searchTerm,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Failed to prefetch customers:', error);
    }
  }, [cache]);
  
  const prefetchProducts = useCallback(async (page: number = 1, pageSize: number = 25, searchTerm: string = '') => {
    if (typeof window === 'undefined' || !window.electronAPI) return;
    
    const cached = cache.getCachedProducts(page, pageSize, searchTerm);
    if (cached) return;
    
    try {
      const result = await window.electronAPI.database.products.getPaginated(page, pageSize, searchTerm);
      cache.setCachedProducts(page, pageSize, searchTerm, {
        items: result.products,
        total: result.total,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        pageSize: result.pageSize,
        searchTerm,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Failed to prefetch products:', error);
    }
  }, [cache]);
  
  const prefetchSales = useCallback(async (page: number = 1, pageSize: number = 25, searchTerm: string = '') => {
    if (typeof window === 'undefined' || !window.electronAPI) return;
    
    const cached = cache.getCachedSales(page, pageSize, searchTerm);
    if (cached) return;
    
    try {
      const result = await window.electronAPI.database.sales.getPaginated(page, pageSize, searchTerm);
      cache.setCachedSales(page, pageSize, searchTerm, {
        items: result.sales,
        total: result.total,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        pageSize: result.pageSize,
        searchTerm,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Failed to prefetch sales:', error);
    }
  }, [cache]);
  
  return {
    prefetchCustomers,
    prefetchProducts,
    prefetchSales
  };
}