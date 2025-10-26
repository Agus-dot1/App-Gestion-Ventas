import type { NotificationItem, NotificationEventPayload } from '../types'
import { normalizeDbToUi, normalizeEventToUi } from '../normalize'

function getApi() {
  return (window as any)?.electronAPI?.notifications
}

async function list(limit?: number): Promise<NotificationItem[]> {
  const api = getApi()
  if (!api?.list) return []
  const rows = await api.list(limit)
  return Array.isArray(rows) ? rows.map(normalizeDbToUi) : []
}

async function listArchived(limit?: number): Promise<NotificationItem[]> {
  const api = getApi()
  if (!api?.listArchived) return []
  const rows = await api.listArchived(limit)
  return Array.isArray(rows) ? rows.map(normalizeDbToUi) : []
}

// Keep a SINGLE underlying IPC listener and fan-out to subscribers.
// This prevents MaxListenersExceededWarning when multiple components subscribe.
const subscribers = new Set<(item: NotificationItem) => void>()
let removeIpcListener: (() => void) | null = null

function ensureIpcListener() {
  if (removeIpcListener) return
  const api = getApi()
  if (!api || typeof api.onEvent !== 'function') return
  removeIpcListener = api.onEvent((payload: NotificationEventPayload) => {
    const item = normalizeEventToUi(payload)
    // Fan out to all current subscribers safely
    for (const cb of Array.from(subscribers)) {
      try {
        cb(item)
      } catch {
        // ignore subscriber errors
      }
    }
  })
}

function subscribe(onEvent: (item: NotificationItem) => void): () => void {
  subscribers.add(onEvent)
  ensureIpcListener()
  return () => {
    subscribers.delete(onEvent)
    if (subscribers.size === 0 && removeIpcListener) {
      try { removeIpcListener() } catch {}
      removeIpcListener = null
    }
  }
}

async function remove(id: number): Promise<void> {
  const api = getApi()
  if (api?.delete) return api.delete(id)
}

async function markRead(id: number): Promise<void> {
  const api = getApi()
  if (api?.markRead) return api.markRead(id)
}

async function markUnread(id: number): Promise<void> {
  const api = getApi()
  if (api?.markUnread) return api.markUnread(id)
}

async function clearAll(): Promise<void> {
  const api = getApi()
  if (api?.clearAll) return api.clearAll()
}

async function purgeArchived(): Promise<void> {
  const api = getApi()
  if (api?.purgeArchived) return api.purgeArchived()
}

async function emitTestEvent(payload: NotificationEventPayload): Promise<boolean> {
  const api = getApi()
  if (api?.emitTestEvent) {
    try {
      const res = await api.emitTestEvent(payload)
      return !!res
    } catch {
      return false
    }
  }
  return false
}

// removed unused existsTodayWithMessage

// removed unused existsTodayWithKey

async function deleteByMessageToday(message: string): Promise<void> {
  const api = getApi()
  if (api?.deleteByMessageToday) return api.deleteByMessageToday(message)
}

async function deleteByKeyToday(key: string): Promise<void> {
  const api = getApi()
  if (api?.deleteByKeyToday) return api.deleteByKeyToday(key)
}

export const notificationsAdapter = {
  list,
  listArchived,
  subscribe,
  markRead,
  markUnread,
  delete: remove,
  deleteByMessageToday,
  deleteByKeyToday,
  clearAll,
  purgeArchived,
  emitTestEvent,
  // removed: existsTodayWithMessage,
  // removed: existsTodayWithKey,
}