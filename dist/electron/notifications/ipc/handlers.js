"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupNotificationIpcHandlers = void 0;
const electron_1 = require("electron");
const constants_1 = require("../constants");
const repository_1 = require("../repository");
function setupNotificationIpcHandlers(getMainWindow) {
    electron_1.ipcMain.handle(constants_1.IPC_NOTIFICATIONS.list, (_e, limit) => repository_1.notificationOperations.list(limit));
    electron_1.ipcMain.handle(constants_1.IPC_NOTIFICATIONS.markRead, (_e, id) => repository_1.notificationOperations.markRead(id));
    electron_1.ipcMain.handle(constants_1.IPC_NOTIFICATIONS.markUnread, (_e, id) => repository_1.notificationOperations.markUnread(id));
    electron_1.ipcMain.handle(constants_1.IPC_NOTIFICATIONS.delete, (_e, id) => repository_1.notificationOperations.delete(id));
    electron_1.ipcMain.handle(constants_1.IPC_NOTIFICATIONS.create, (_e, message, type, key) => repository_1.notificationOperations.create(message, type, key));
    electron_1.ipcMain.handle(constants_1.IPC_NOTIFICATIONS.existsTodayWithMessage, (_e, message) => repository_1.notificationOperations.existsTodayWithMessage(message));
    electron_1.ipcMain.handle(constants_1.IPC_NOTIFICATIONS.existsTodayWithKey, (_e, key) => repository_1.notificationOperations.existsTodayWithKey(key));
    // Nuevo: borrar por mensaje del día
    electron_1.ipcMain.handle(constants_1.IPC_NOTIFICATIONS.deleteByMessageToday, (_e, message) => repository_1.notificationOperations.deleteByMessageToday(message));
    // Nuevo: borrar por clave del día
    electron_1.ipcMain.handle(constants_1.IPC_NOTIFICATIONS.deleteByKeyToday, (_e, key) => repository_1.notificationOperations.deleteByKeyToday(key));
    // Nuevo: limpiar todas las notificaciones activas
    electron_1.ipcMain.handle(constants_1.IPC_NOTIFICATIONS.clearAll, () => repository_1.notificationOperations.clearAll());
    // Nuevo: listar notificaciones archivadas
    electron_1.ipcMain.handle(constants_1.IPC_NOTIFICATIONS.listArchived, (_e, limit) => repository_1.notificationOperations.listArchived(limit));
    // Nuevo: vaciar archivadas (eliminación permanente)
    electron_1.ipcMain.handle(constants_1.IPC_NOTIFICATIONS.purgeArchived, () => repository_1.notificationOperations.purgeArchived());
    electron_1.ipcMain.handle(constants_1.IPC_NOTIFICATIONS.emitTestEvent, (_e, payload) => {
        try {
            const { message, type, message_key } = payload || {};
            if (!message || !type)
                return false;
            // Guardar: si ya existe hoy (incluyendo eliminadas hoy), no crear ni emitir
            if (repository_1.notificationOperations.existsTodayWithKey(message_key || '') || repository_1.notificationOperations.existsTodayWithMessage(message)) {
                return true;
            }
            const normalizedType = type;
            const dbType = normalizedType === 'attention' ? 'reminder' : normalizedType;
            const nid = repository_1.notificationOperations.create(message, dbType, message_key);
            const win = getMainWindow();
            if (win) {
                // Obtener created_at real del registro recién creado (si hay clave)
                const latest = message_key ? repository_1.notificationOperations.getLatestByKey(message_key) : null;
                const createdAt = latest?.created_at;
                win.webContents.send(constants_1.IPC_NOTIFICATIONS.event, { id: nid, message, type: normalizedType, meta: { message_key, ...(createdAt ? { created_at: createdAt } : {}) } });
            }
            return true;
        }
        catch (e) {
            console.error('emitTestEvent error:', e);
            return false;
        }
    });
}
exports.setupNotificationIpcHandlers = setupNotificationIpcHandlers;
//# sourceMappingURL=handlers.js.map