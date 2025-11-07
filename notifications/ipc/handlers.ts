import { ipcMain, BrowserWindow } from 'electron'
import { IPC_NOTIFICATIONS } from '../constants'
import { notificationOperations } from '../repository'

export function setupNotificationIpcHandlers(getMainWindow: () => BrowserWindow | null) {
  ipcMain.handle(IPC_NOTIFICATIONS.list, (_e, limit) => notificationOperations.list(limit))
  ipcMain.handle(IPC_NOTIFICATIONS.markRead, (_e, id) => notificationOperations.markRead(id))
  ipcMain.handle(IPC_NOTIFICATIONS.markUnread, (_e, id) => notificationOperations.markUnread(id))
  ipcMain.handle(IPC_NOTIFICATIONS.delete, (_e, id) => notificationOperations.delete(id))
  ipcMain.handle(IPC_NOTIFICATIONS.create, (_e, message, type, key) => notificationOperations.create(message, type, key))
  ipcMain.handle(IPC_NOTIFICATIONS.existsTodayWithMessage, (_e, message) => notificationOperations.existsTodayWithMessage(message))
  ipcMain.handle(IPC_NOTIFICATIONS.existsTodayWithKey, (_e, key) => notificationOperations.existsTodayWithKey(key))


  ipcMain.handle(IPC_NOTIFICATIONS.deleteByMessageToday, (_e, message) => notificationOperations.deleteByMessageToday(message))


  ipcMain.handle(IPC_NOTIFICATIONS.deleteByKeyToday, (_e, key) => notificationOperations.deleteByKeyToday(key))


  ipcMain.handle(IPC_NOTIFICATIONS.clearAll, () => notificationOperations.clearAll())


  ipcMain.handle(IPC_NOTIFICATIONS.listArchived, (_e, limit) => notificationOperations.listArchived(limit))


  ipcMain.handle(IPC_NOTIFICATIONS.purgeArchived, () => notificationOperations.purgeArchived())
  ipcMain.handle(IPC_NOTIFICATIONS.emitTestEvent, (_e, payload: { message: string; type: 'attention' | 'alert' | 'info', message_key?: string }) => {
    try {
      const { message, type, message_key } = payload || ({} as any)
      if (!message || !type) return false



      if (notificationOperations.existsTodayWithKey(message_key || '') || notificationOperations.existsTodayWithMessage(message)) {
        return true
      }

      const normalizedType = type
      const dbType = normalizedType === 'attention' ? 'reminder' : normalizedType
      const nid = notificationOperations.create(message, dbType as any, message_key as any)
      const win = getMainWindow()
      if (win) {


        const latest = message_key ? notificationOperations.getLatestByKey(message_key) : null
        const createdAt = latest?.created_at
        win.webContents.send(IPC_NOTIFICATIONS.event, { id: nid, message, type: normalizedType, meta: { message_key, ...(createdAt ? { created_at: createdAt } : {}) } })
      }
      return true
    } catch (e) {
      console.error('emitTestEvent error:', e)
      return false
    }
  })
}