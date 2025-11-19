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





const subscribers = new Set<(item: NotificationItem) => void>()
let removeIpcListener: (() => void) | null = null

function ensureIpcListener() {
  if (removeIpcListener) return
  const api = getApi()
  if (!api) return
  const removers: Array<() => void> = []
  if (typeof api.onEvent === 'function') {
    const off = api.onEvent((payload: NotificationEventPayload) => {
      const item = normalizeEventToUi(payload)
      for (const cb of Array.from(subscribers)) {
        try { cb(item) } catch {}
      }
    })
    removers.push(off)
  }
  if (typeof api.onEventBatch === 'function') {
    const offBatch = api.onEventBatch((payloads: NotificationEventPayload[] | any) => {
      const arr: NotificationEventPayload[] = Array.isArray(payloads) ? payloads : []
      if (arr.length === 0) return
      const items = arr.map(normalizeEventToUi)
      for (const item of items) {
        for (const cb of Array.from(subscribers)) {
          try { cb(item) } catch {}
        }
      }
    })
    removers.push(offBatch)
  }
  if (removers.length > 0) {
    removeIpcListener = () => {
      for (const r of removers) { try { r() } catch {} }
    }
  }
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




}