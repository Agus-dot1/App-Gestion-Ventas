// Global type declaration for Electron preload API

export type InvokeResult<T = any> = Promise<T>

export interface ElectronAPI {
  database: {
    customers: {
      getAll: () => InvokeResult<any[]>
      getPaginated: (page: number, pageSize: number, searchTerm: string) => InvokeResult<any>
      search: (searchTerm: string, limit: number) => InvokeResult<any[]>
      getById: (id: number) => InvokeResult<any>
      create: (customer: any) => InvokeResult<any>
      update: (id: number, customer: any) => InvokeResult<any>
      delete: (id: number) => InvokeResult<void>
      getCount: () => InvokeResult<number>
      getRecent: (limit: number) => InvokeResult<any[]>
      getMonthlyComparison: () => InvokeResult<any>
      deleteAll: () => InvokeResult<void>
    }
    products: {
      getAll: () => InvokeResult<any[]>
      getPaginated: (page: number, pageSize: number, searchTerm: string) => InvokeResult<any>
      search: (searchTerm: string, limit: number) => InvokeResult<any[]>
      getActive: () => InvokeResult<any[]>
      getById: (id: number) => InvokeResult<any>
      create: (product: any) => InvokeResult<any>
      update: (id: number, product: any) => InvokeResult<any>
      delete: (id: number) => InvokeResult<void>
      getCount: () => InvokeResult<number>
      getMonthlyComparison: () => InvokeResult<any>
      deleteAll: () => InvokeResult<void>
    }
    sales: {
      getAll: () => InvokeResult<any[]>
      getPaginated: (page: number, pageSize: number, searchTerm: string) => InvokeResult<any>

      search: (searchTerm: string, limit: number) => InvokeResult<any[]>
      getById: (id: number) => InvokeResult<any>
      getByCustomer: (customerId: number) => InvokeResult<any[]>
      create: (saleData: any) => InvokeResult<any>
      update: (id: number, sale: any) => InvokeResult<any>
      delete: (id: number) => InvokeResult<void>
      getCount: () => InvokeResult<number>
      getTotalRevenue: () => InvokeResult<number>
      getRecent: (limit: number) => InvokeResult<any[]>
      getSalesChartData: (days: number) => InvokeResult<any[]>
      getStatsComparison: () => InvokeResult<any>
      getWithDetails: (id: number) => InvokeResult<any>
      getOverdueSales: () => InvokeResult<any[]>
      getOverdueSalesCount: () => InvokeResult<number>
      deleteAll: () => InvokeResult<void>
    }
    installments: {
      getBySale: (saleId: number) => InvokeResult<any[]>
      getOverdue: () => InvokeResult<any[]>
      getUpcoming: (limit: number) => InvokeResult<any[]>
      recordPayment: (installmentId: number, amount: number, paymentMethod: string, reference?: string) => InvokeResult<any>
      applyLateFee: (installmentId: number, fee: number) => InvokeResult<void>
      revertPayment: (installmentId: number, transactionId: number) => InvokeResult<void>
      create: (installment: any) => InvokeResult<any>
      update: (id: number, installment: any) => InvokeResult<any>
      markAsPaid: (id: number) => InvokeResult<void>
      delete: (id: number) => InvokeResult<void>
      deleteAll: () => InvokeResult<void>
    }
    saleItems: {
      getBySale: (saleId: number) => InvokeResult<any[]>
      create: (saleItem: any) => InvokeResult<any>
      getSalesForProduct: (productId: number) => InvokeResult<any[]>
      deleteAll: () => InvokeResult<void>
    }
    payments: {
      getBySale: (saleId: number) => InvokeResult<any[]>
      create: (payment: any) => InvokeResult<any>
      getOverdue: () => InvokeResult<any[]>
      deleteAll: () => InvokeResult<void>
    }
  }
  cache: {
    getSize: () => InvokeResult<string>
    clear: () => InvokeResult<void>
  }
  backup: {
    save: (data: any) => InvokeResult<any>
    load: () => InvokeResult<any>
    importCustomers: (customers: any[]) => InvokeResult<any>
    importProducts: (products: any[]) => InvokeResult<any>
    importSales: (sales: any[]) => InvokeResult<any>
  }
  notifications: {
    list: (limit?: number) => InvokeResult<any[]>
    markRead: (id: number) => InvokeResult<void>
    markUnread: (id: number) => InvokeResult<void>
    delete: (id: number) => InvokeResult<void>
    deleteByMessageToday: (message: string) => InvokeResult<void>
    clearAll: () => InvokeResult<void>
    listArchived: (limit?: number) => InvokeResult<any[]>
    purgeArchived: () => InvokeResult<void>
    create: (message: string, type?: string) => InvokeResult<any>
    existsTodayWithMessage: (message: string) => InvokeResult<boolean>
    onEvent: (callback: (payload: any) => void) => void
    emitTestEvent: (payload: any) => InvokeResult<void>
  }
  openExternal: (url: string) => InvokeResult<void>
  showSaveDialog: (options: any) => InvokeResult<any>
  showOpenDialog: (options: any) => InvokeResult<any>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}