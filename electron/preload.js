const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  database: {
    customers: {
      getAll: () => ipcRenderer.invoke('db:customers:getAll'),
      getPaginated: (page, pageSize, searchTerm) => ipcRenderer.invoke('db:customers:getPaginated', page, pageSize, searchTerm),
      search: (searchTerm, limit) => ipcRenderer.invoke('db:customers:search', searchTerm, limit),
      getById: (id) => ipcRenderer.invoke('db:customers:getById', id),
      create: (customer) => ipcRenderer.invoke('db:customers:create', customer),
      update: (id, customer) => ipcRenderer.invoke('db:customers:update', id, customer),
      delete: (id) => ipcRenderer.invoke('db:customers:delete', id)
    },
    products: {
      getAll: () => ipcRenderer.invoke('db:products:getAll'),
      getPaginated: (page, pageSize, searchTerm) => ipcRenderer.invoke('db:products:getPaginated', page, pageSize, searchTerm),
      search: (searchTerm, limit) => ipcRenderer.invoke('db:products:search', searchTerm, limit),
      getById: (id) => ipcRenderer.invoke('db:products:getById', id),
      getActive: () => ipcRenderer.invoke('db:products:getActive'),
      create: (product) => ipcRenderer.invoke('db:products:create', product),
      update: (id, product) => ipcRenderer.invoke('db:products:update', id, product),
      delete: (id) => ipcRenderer.invoke('db:products:delete', id)
    },
    sales: {
      getAll: () => ipcRenderer.invoke('db:sales:getAll'),
      getPaginated: (page, pageSize, searchTerm) => ipcRenderer.invoke('db:sales:getPaginated', page, pageSize, searchTerm),
      search: (searchTerm, limit) => ipcRenderer.invoke('db:sales:search', searchTerm, limit),
      getById: (id) => ipcRenderer.invoke('db:sales:getById', id),
      getByCustomer: (customerId) => ipcRenderer.invoke('db:sales:getByCustomer', customerId),
      create: (sale) => ipcRenderer.invoke('db:sales:create', sale),
      update: (id, sale) => ipcRenderer.invoke('db:sales:update', id, sale),
      delete: (id) => ipcRenderer.invoke('db:sales:delete', id),
      getWithDetails: (id) => ipcRenderer.invoke('db:sales:getWithDetails', id),
      getOverdueSales: () => ipcRenderer.invoke('db:sales:getOverdueSales')
    },
    installments: {
      getBySale: (saleId) => ipcRenderer.invoke('db:installments:getBySale', saleId),
      getOverdue: () => ipcRenderer.invoke('db:installments:getOverdue'),
      recordPayment: (installmentId, amount, paymentMethod, reference) =>
        ipcRenderer.invoke('db:installments:recordPayment', installmentId, amount, paymentMethod, reference),
      applyLateFee: (installmentId, fee) =>
        ipcRenderer.invoke('db:installments:applyLateFee', installmentId, fee),
      revertPayment: (installmentId, transactionId) =>
        ipcRenderer.invoke('db:installments:revertPayment', installmentId, transactionId)
    },
    payments: {
      getBySale: (saleId) => ipcRenderer.invoke('db:payments:getBySale', saleId),
      create: (payment) => ipcRenderer.invoke('db:payments:create', payment)
    }
  }
});