// Canales IPC centralizados (mantener nombres existentes)
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
  // Nuevo canal: borrar por mensaje hoy
  deleteByMessageToday: 'notifications:deleteByMessageToday',
  // Nuevo canal: borrar por clave hoy
  deleteByKeyToday: 'notifications:deleteByKeyToday',
  // Nuevo canal: limpiar todas las notificaciones activas
  clearAll: 'notifications:clearAll',
  // Nuevo canal: listar archivadas
  listArchived: 'notifications:listArchived',
  // Nuevo canal: vaciar archivadas (eliminación permanente)
  purgeArchived: 'notifications:purgeArchived',
} as const;

export const CATEGORY = {
  client: 'client',
  system: 'system',
  stock: 'stock',
} as const;

export const STOCK_LOW_REGEX = /Stock bajo:\s*(.+?)\s*—\s*qued[oó] en\s*(\d+)\s*unidad(?:es)?(?:\s*—\s*\$?\s*([\d.,]+))?(?:\s*—\s*(.+))?/i;

// Detecta mensajes de cuotas (vencidas o próximas) para clasificar como cliente
export const CLIENT_ALERT_REGEX = /(cuota|cuotas)/i;