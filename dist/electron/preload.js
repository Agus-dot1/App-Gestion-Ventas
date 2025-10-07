const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  database: {
    customers: {
      getAll: () => ipcRenderer.invoke('db:customers:getAll'),
      getPaginated: (page, pageSize, searchTerm) => ipcRenderer.invoke('db:customers:getPaginated', page, pageSize, searchTerm),
      search: (searchTerm, limit) => ipcRenderer.invoke('db:customers:search', searchTerm, limit),
      getById: (id) => ipcRenderer.invoke('db:customers:getById', id),
      create: (customer) => ipcRenderer.invoke('db:customers:create', customer),
      update: (id, customer) => ipcRenderer.invoke('db:customers:update', id, customer),
      delete: (id) => ipcRenderer.invoke('db:customers:delete', id),
      getCount: () => ipcRenderer.invoke('db:customers:getCount'),
      getRecent: (limit) => ipcRenderer.invoke('db:customers:getRecent', limit),
      getMonthlyComparison: () => ipcRenderer.invoke('db:customers:getMonthlyComparison')
    },
    products: {
      getAll: () => ipcRenderer.invoke('db:products:getAll'),
      getPaginated: (page, pageSize, searchTerm) => ipcRenderer.invoke('db:products:getPaginated', page, pageSize, searchTerm),
      search: (searchTerm, limit) => ipcRenderer.invoke('db:products:search', searchTerm, limit),
      getById: (id) => ipcRenderer.invoke('db:products:getById', id),
      getActive: () => ipcRenderer.invoke('db:products:getActive'),
      create: (product) => ipcRenderer.invoke('db:products:create', product),
      update: (id, product) => ipcRenderer.invoke('db:products:update', id, product),
      delete: (id) => ipcRenderer.invoke('db:products:delete', id),
      getCount: () => ipcRenderer.invoke('db:products:getCount'),
      getRecent: (limit) => ipcRenderer.invoke('db:products:getRecent', limit),
      getMonthlyComparison: () => ipcRenderer.invoke('db:products:getMonthlyComparison')
    },
    sales: {
      getAll: () => ipcRenderer.invoke('db:sales:getAll'),
      getPaginated: (page, pageSize, searchTerm) => ipcRenderer.invoke('db:sales:getPaginated', page, pageSize, searchTerm),
      search: (searchTerm, limit) => ipcRenderer.invoke('db:sales:search', searchTerm, limit),
      getById: (id) => ipcRenderer.invoke('db:sales:getById', id),
      getRecent: (limit) => ipcRenderer.invoke('db:sales:getRecent', limit),
      create: (sale) => ipcRenderer.invoke('db:sales:create', sale),
      update: (id, sale) => ipcRenderer.invoke('db:sales:update', id, sale),
      delete: (id) => ipcRenderer.invoke('db:sales:delete', id),
      getCount: () => ipcRenderer.invoke('db:sales:getCount'),
      getTotalRevenue: () => ipcRenderer.invoke('db:sales:getTotalRevenue'),
      getSalesChartData: (days) => ipcRenderer.invoke('db:sales:getSalesChartData', days),
      getStatsComparison: () => ipcRenderer.invoke('db:sales:getStatsComparison'),
      getOverdueSales: () => ipcRenderer.invoke('db:sales:getOverdueSales'),
      exportToCSV: (sales) => ipcRenderer.invoke('sales:exportToCSV', sales),
      importFromCSV: (filePath) => ipcRenderer.invoke('sales:importFromCSV', filePath)
    },
    installments: {
      getAll: () => ipcRenderer.invoke('db:installments:getAll'),
      getBySale: (saleId) => ipcRenderer.invoke('db:installments:getBySale', saleId),
      getByCustomerId: (customerId) => ipcRenderer.invoke('installments:getByCustomerId', customerId),
      getOverdue: () => ipcRenderer.invoke('db:installments:getOverdue'),
      getDueThisWeek: () => ipcRenderer.invoke('installments:getDueThisWeek'),
      create: (installment) => ipcRenderer.invoke('db:installments:create', installment),
      update: (id, installment) => ipcRenderer.invoke('installments:update', id, installment),
      delete: (id) => ipcRenderer.invoke('db:installments:delete', id),
      markAsPaid: (id, paymentData) => ipcRenderer.invoke('db:installments:markAsPaid', id, paymentData),
      recordPayment: (installmentId, amount, paymentMethod, reference) => ipcRenderer.invoke('db:installments:recordPayment', installmentId, amount, paymentMethod, reference),
      revertPayment: (installmentId, transactionId) => ipcRenderer.invoke('db:installments:revertPayment', installmentId, transactionId)
    },
    saleItems: {
      getBySale: (saleId) => ipcRenderer.invoke('db:saleItems:getBySale', saleId),
      create: (saleItem) => ipcRenderer.invoke('db:saleItems:create', saleItem)
    },
    payments: {
      getAll: () => ipcRenderer.invoke('payments:getAll'),
      getBySale: (saleId) => ipcRenderer.invoke('db:payments:getBySale', saleId),
      getByInstallmentId: (installmentId) => ipcRenderer.invoke('payments:getByInstallmentId', installmentId),
      getOverdue: () => ipcRenderer.invoke('db:payments:getOverdue'),
      create: (payment) => ipcRenderer.invoke('db:payments:create', payment),
      update: (id, payment) => ipcRenderer.invoke('payments:update', id, payment),
      delete: (id) => ipcRenderer.invoke('payments:delete', id)
    }
  },
  // Cache management
  cache: {
    getSize: () => ipcRenderer.invoke('cache:getSize'),
    clear: () => ipcRenderer.invoke('cache:clear')
  },
  // Utility functions
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options)
});