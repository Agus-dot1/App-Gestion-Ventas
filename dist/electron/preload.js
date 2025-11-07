const { contextBridge, ipcRenderer } = require('electron');





contextBridge.exposeInMainWorld('electronAPI', {
  database: {
    customers: {
      getAll: () => ipcRenderer.invoke('customers:getAll'),
      getPaginated: (page, pageSize, searchTerm) => ipcRenderer.invoke('customers:getPaginated', page, pageSize, searchTerm),
      search: (searchTerm, limit) => ipcRenderer.invoke('customers:search', searchTerm, limit),
      getById: (id) => ipcRenderer.invoke('customers:getById', id),
      create: (customer) => ipcRenderer.invoke('customers:create', customer),
      update: (id, customer) => ipcRenderer.invoke('customers:update', id, customer),
      delete: (id) => ipcRenderer.invoke('customers:delete', id),
      getCount: () => ipcRenderer.invoke('customers:getCount'),
      getRecent: (limit) => ipcRenderer.invoke('customers:getRecent', limit),
      getMonthlyComparison: () => ipcRenderer.invoke('customers:getMonthlyComparison'),
      deleteAll: () => ipcRenderer.invoke('customers:deleteAll')
    },
    products: {
      getAll: () => ipcRenderer.invoke('products:getAll'),
      getPaginated: (page, pageSize, searchTerm) => ipcRenderer.invoke('products:getPaginated', page, pageSize, searchTerm),
      search: (searchTerm, limit) => ipcRenderer.invoke('products:search', searchTerm, limit),
      getActive: () => ipcRenderer.invoke('products:getActive'),
      getById: (id) => ipcRenderer.invoke('products:getById', id),
      create: (product) => ipcRenderer.invoke('products:create', product),
      update: (id, product) => ipcRenderer.invoke('products:update', id, product),
      delete: (id) => ipcRenderer.invoke('products:delete', id),
      getCount: () => ipcRenderer.invoke('products:getCount'),
      getMonthlyComparison: () => ipcRenderer.invoke('products:getMonthlyComparison'),
      deleteAll: () => ipcRenderer.invoke('products:deleteAll')
    },
    sales: {
      getAll: () => ipcRenderer.invoke('sales:getAll'),
      getPaginated: (page, pageSize, searchTerm) => ipcRenderer.invoke('sales:getPaginated', page, pageSize, searchTerm),
      search: (searchTerm, limit) => ipcRenderer.invoke('sales:search', searchTerm, limit),
      getById: (id) => ipcRenderer.invoke('sales:getById', id),
      getByCustomer: (customerId) => ipcRenderer.invoke('sales:getByCustomer', customerId),
      create: (saleData) => ipcRenderer.invoke('sales:create', saleData),
      update: (id, sale) => ipcRenderer.invoke('sales:update', id, sale),
      delete: (id) => ipcRenderer.invoke('sales:delete', id),
      getCount: () => ipcRenderer.invoke('sales:getCount'),
      getTotalRevenue: () => ipcRenderer.invoke('sales:getTotalRevenue'),
      getRecent: (limit) => ipcRenderer.invoke('sales:getRecent', limit),
      getSalesChartData: (days) => ipcRenderer.invoke('sales:getSalesChartData', days),
      getStatsComparison: () => ipcRenderer.invoke('sales:getStatsComparison'),
      getWithDetails: (id) => ipcRenderer.invoke('sales:getWithDetails', id),
      getOverdueSales: () => ipcRenderer.invoke('sales:getOverdueSales'),
      getOverdueSalesCount: () => ipcRenderer.invoke('sales:getOverdueSalesCount'),
      deleteAll: () => ipcRenderer.invoke('sales:deleteAll')
    },
    installments: {
      getBySale: (saleId) => ipcRenderer.invoke('installments:getBySale', saleId),
      getOverdue: () => ipcRenderer.invoke('installments:getOverdue'),
      getUpcoming: (limit) => ipcRenderer.invoke('installments:getUpcoming', limit),
      recordPayment: (installmentId, amount, paymentMethod, reference) => ipcRenderer.invoke('installments:recordPayment', installmentId, amount, paymentMethod, reference),
      applyLateFee: (installmentId, fee) => ipcRenderer.invoke('installments:applyLateFee', installmentId, fee),
      revertPayment: (installmentId, transactionId) => ipcRenderer.invoke('installments:revertPayment', installmentId, transactionId),
      create: (installment) => ipcRenderer.invoke('installments:create', installment),
      markAsPaid: (id) => ipcRenderer.invoke('installments:markAsPaid', id),
      delete: (id) => ipcRenderer.invoke('installments:delete', id),
      deleteAll: () => ipcRenderer.invoke('installments:deleteAll')
    },
    saleItems: {
      getBySale: (saleId) => ipcRenderer.invoke('saleItems:getBySale', saleId),
      create: (saleItem) => ipcRenderer.invoke('saleItems:create', saleItem),
      getSalesForProduct: (productId) => ipcRenderer.invoke('saleItems:getSalesForProduct', productId),
      deleteAll: () => ipcRenderer.invoke('saleItems:deleteAll')
    },
    payments: {
      getBySale: (saleId) => ipcRenderer.invoke('payments:getBySale', saleId),
      create: (payment) => ipcRenderer.invoke('payments:create', payment),
      getOverdue: () => ipcRenderer.invoke('payments:getOverdue'),
      deleteAll: () => ipcRenderer.invoke('payments:deleteAll')
    },
    partners: {
      getAll: () => ipcRenderer.invoke('partners:getAll'),
      create: (partner) => ipcRenderer.invoke('partners:create', partner),
      update: (id, partner) => ipcRenderer.invoke('partners:update', id, partner),
      delete: (id) => ipcRenderer.invoke('partners:delete', id)
    }
  },


  cache: {
    getSize: () => ipcRenderer.invoke('cache:getSize'),
    clear: () => ipcRenderer.invoke('cache:clear')
  },


  backup: {
    save: (data) => ipcRenderer.invoke('backup:save', data),
    load: () => ipcRenderer.invoke('backup:load'),
    importCustomers: (customers) => ipcRenderer.invoke('backup:importCustomers', customers),
    importProducts: (products) => ipcRenderer.invoke('backup:importProducts', products),
    importSales: (sales) => ipcRenderer.invoke('backup:importSales', sales)
  },


  notifications: {
    list: (limit) => ipcRenderer.invoke('notifications:list', limit),
    markRead: (id) => ipcRenderer.invoke('notifications:markRead', id),
    markUnread: (id) => ipcRenderer.invoke('notifications:markUnread', id),
    delete: (id) => ipcRenderer.invoke('notifications:delete', id),


    deleteByMessageToday: (message) => ipcRenderer.invoke('notifications:deleteByMessageToday', message),


    deleteByKeyToday: (key) => ipcRenderer.invoke('notifications:deleteByKeyToday', key),


    clearAll: () => ipcRenderer.invoke('notifications:clearAll'),
    create: (message, type, key) => ipcRenderer.invoke('notifications:create', message, type, key),
    existsTodayWithMessage: (message) => ipcRenderer.invoke('notifications:existsTodayWithMessage', message),
    existsTodayWithKey: (key) => ipcRenderer.invoke('notifications:existsTodayWithKey', key),


    listArchived: (limit) => ipcRenderer.invoke('notifications:listArchived', limit),


    purgeArchived: () => ipcRenderer.invoke('notifications:purgeArchived'),
    onEvent: (callback) => {
      const handler = (_event, payload) => callback(payload);
      ipcRenderer.on('notifications:event', handler);
      return () => {
        ipcRenderer.removeListener('notifications:event', handler);
      };
    },
    emitTestEvent: (payload) => ipcRenderer.invoke('notifications:emitTestEvent', payload)
  },


  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options)
});