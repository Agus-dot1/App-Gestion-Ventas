

export const IPC_NOTIFICATIONS = {
  list: 'notifications:list',
  markRead: 'notifications:markRead',
  markUnread: 'notifications:markUnread',
  delete: 'notifications:delete',
  create: 'notifications:create',
  existsTodayWithMessage: 'notifications:existsTodayWithMessage',
  existsTodayWithKey: 'notifications:existsTodayWithKey',
  emitTestEvent: 'notifications:emitTestEvent',
  event: 'notifications:event',


  deleteByMessageToday: 'notifications:deleteByMessageToday',


  deleteByKeyToday: 'notifications:deleteByKeyToday',


  clearAll: 'notifications:clearAll',


  listArchived: 'notifications:listArchived',


  purgeArchived: 'notifications:purgeArchived',
} as const;

export const CATEGORY = {
  client: 'client',
  system: 'system',
  stock: 'stock',
} as const;

export const STOCK_LOW_REGEX = /Stock bajo:\s*(.+?)\s*—\s*qued[oó] en\s*(\d+)\s*unidad(?:es)?(?:\s*—\s*\$?\s*([\d.,]+))?(?:\s*—\s*(.+))?/i;



export const CLIENT_ALERT_REGEX = /(cuota|cuotas)/i;