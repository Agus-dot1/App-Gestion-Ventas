const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  database: {
    customers: {
      getAll: () => ipcRenderer.invoke('db:customers:getAll'),
      getCount: () => ipcRenderer.invoke('db:customers:getCount'),
      getPaginated: (page, pageSize, searchTerm) => ipcRenderer.invoke('db:customers:getPaginated', page, pageSize, searchTerm),
      search: (searchTerm, limit) => ipcRenderer.invoke('db:customers:search', searchTerm, limit),
      getById: (id) => ipcRenderer.invoke('db:customers:getById', id),
      create: (customer) => ipcRenderer.invoke('db:customers:create', customer),
      update: (id, customer) => ipcRenderer.invoke('db:customers:update', id, customer),
      delete: (id) => ipcRenderer.invoke('db:customers:delete', id),
      getRecent: (limit) => ipcRenderer.invoke('db:customers:getRecent', limit),
      getMonthlyComparison: () => ipcRenderer.invoke('db:customers:getMonthlyComparison')
    },
    products: {
      getAll: () => ipcRenderer.invoke('db:products:getAll'),
      getCount: () => ipcRenderer.invoke('db:products:getCount'),
      getPaginated: (page, pageSize, searchTerm) => ipcRenderer.invoke('db:products:getPaginated', page, pageSize, searchTerm),
      search: (searchTerm, limit) => ipcRenderer.invoke('db:products:search', searchTerm, limit),
      getById: (id) => ipcRenderer.invoke('db:products:getById', id),
      getActive: () => ipcRenderer.invoke('db:products:getActive'),
      create: (product) => ipcRenderer.invoke('db:products:create', product),
      update: (id, product) => ipcRenderer.invoke('db:products:update', id, product),
      delete: (id) => ipcRenderer.invoke('db:products:delete', id),
      getMonthlyComparison: () => ipcRenderer.invoke('db:products:getMonthlyComparison')
    },
    sales: {
      getAll: () => ipcRenderer.invoke('db:sales:getAll'),
      getCount: () => ipcRenderer.invoke('db:sales:getCount'),
      getTotalRevenue: () => ipcRenderer.invoke('db:sales:getTotalRevenue'),
      getPaginated: (page, pageSize, searchTerm) => ipcRenderer.invoke('db:sales:getPaginated', page, pageSize, searchTerm),
      search: (searchTerm, limit) => ipcRenderer.invoke('db:sales:search', searchTerm, limit),
      getById: (id) => ipcRenderer.invoke('db:sales:getById', id),
      getByCustomer: (customerId) => ipcRenderer.invoke('db:sales:getByCustomer', customerId),
      create: (sale) => ipcRenderer.invoke('db:sales:create', sale),
      update: (id, sale) => ipcRenderer.invoke('db:sales:update', id, sale),
      delete: (id) => ipcRenderer.invoke('db:sales:delete', id),
      getWithDetails: (id) => ipcRenderer.invoke('db:sales:getWithDetails', id),
      getOverdueSales: () => ipcRenderer.invoke('db:sales:getOverdueSales'),
      getRecent: (limit) => ipcRenderer.invoke('db:sales:getRecent', limit),
      getSalesChartData: (days) => ipcRenderer.invoke('db:sales:getSalesChartData', days),
      getStatsComparison: () => ipcRenderer.invoke('db:sales:getStatsComparison')
    },
    installments: {
      getBySale: (saleId) => ipcRenderer.invoke('db:installments:getBySale', saleId),
      getOverdue: () => ipcRenderer.invoke('db:installments:getOverdue'),
      create: (installment) => ipcRenderer.invoke('db:installments:create', installment),
      markAsPaid: (id) => ipcRenderer.invoke('db:installments:markAsPaid', id),
      recordPayment: (installmentId, amount, paymentMethod, reference) =>
        ipcRenderer.invoke('db:installments:recordPayment', installmentId, amount, paymentMethod, reference),
      applyLateFee: (installmentId, fee) =>
        ipcRenderer.invoke('db:installments:applyLateFee', installmentId, fee),
      revertPayment: (installmentId, transactionId) =>
        ipcRenderer.invoke('db:installments:revertPayment', installmentId, transactionId),
      delete: (id) => ipcRenderer.invoke('db:installments:delete', id)
    },
    payments: {
      getBySale: (saleId) => ipcRenderer.invoke('db:payments:getBySale', saleId),
      create: (payment) => ipcRenderer.invoke('db:payments:create', payment)
    },
    saleItems: {
      getBySale: (saleId) => ipcRenderer.invoke('db:saleItems:getBySale', saleId),
      create: (saleItem) => ipcRenderer.invoke('db:saleItems:create', saleItem)
    }
  }
});