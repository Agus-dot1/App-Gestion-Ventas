"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLIENT_ALERT_REGEX = exports.STOCK_LOW_REGEX = exports.CATEGORY = exports.IPC_NOTIFICATIONS = void 0;
exports.IPC_NOTIFICATIONS = {
    list: 'notifications:list',
    markRead: 'notifications:markRead',
    markUnread: 'notifications:markUnread',
    delete: 'notifications:delete',
    create: 'notifications:create',
    existsTodayWithMessage: 'notifications:existsTodayWithMessage',
    existsTodayWithKey: 'notifications:existsTodayWithKey',
    emitTestEvent: 'notifications:emitTestEvent',
    event: 'notifications:event',
    eventBatch: 'notifications:eventBatch',
    deleteByMessageToday: 'notifications:deleteByMessageToday',
    deleteByKeyToday: 'notifications:deleteByKeyToday',
    clearAll: 'notifications:clearAll',
    listArchived: 'notifications:listArchived',
    purgeArchived: 'notifications:purgeArchived',
};
exports.CATEGORY = {
    client: 'client',
    system: 'system',
    stock: 'stock',
};
exports.STOCK_LOW_REGEX = /Stock bajo:\s*(.+?)\s*—\s*qued[oó] en\s*(\d+)\s*unidad(?:es)?(?:\s*—\s*\$?\s*([\d.,]+))?(?:\s*—\s*(.+))?/i;
exports.CLIENT_ALERT_REGEX = /(cuota|cuotas)/i;
//# sourceMappingURL=constants.js.map