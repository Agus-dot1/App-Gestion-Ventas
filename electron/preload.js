const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Database operations
  getCustomers: () => ipcRenderer.invoke('get-customers'),
  addCustomer: (customer) => ipcRenderer.invoke('add-customer', customer),
  updateCustomer: (id, customer) => ipcRenderer.invoke('update-customer', id, customer),
  deleteCustomer: (id) => ipcRenderer.invoke('delete-customer', id),
  
  getProducts: () => ipcRenderer.invoke('get-products'),
  addProduct: (product) => ipcRenderer.invoke('add-product', product),
  updateProduct: (id, product) => ipcRenderer.invoke('update-product', id, product),
  deleteProduct: (id) => ipcRenderer.invoke('delete-product', id),
  
  getSales: () => ipcRenderer.invoke('get-sales'),
  addSale: (sale) => ipcRenderer.invoke('add-sale', sale),
  updateSale: (id, sale) => ipcRenderer.invoke('update-sale', id, sale),
  deleteSale: (id) => ipcRenderer.invoke('delete-sale', id),
  
  getInstallments: () => ipcRenderer.invoke('get-installments'),
  addInstallment: (installment) => ipcRenderer.invoke('add-installment', installment),
  updateInstallment: (id, installment) => ipcRenderer.invoke('update-installment', id, installment),
  deleteInstallment: (id) => ipcRenderer.invoke('delete-installment', id),
  
  getEvents: () => ipcRenderer.invoke('get-events'),
  addEvent: (event) => ipcRenderer.invoke('add-event', event),
  updateEvent: (id, event) => ipcRenderer.invoke('update-event', id, event),
  deleteEvent: (id) => ipcRenderer.invoke('delete-event', id),
  
  // Utility functions
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options)
});