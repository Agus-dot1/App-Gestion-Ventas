import { notificationsAdapter } from './adapter'
import type { NotificationItem } from '../types'
import { dedupe, sortByCreatedAsc } from '../normalize'

export async function loadPersisted(limit?: number): Promise<NotificationItem[]> {
  const list = await notificationsAdapter.list(limit)
  
  return sortByCreatedAsc(dedupe(list))
}

export function subscribeNotifications(
  getState: () => NotificationItem[],
  setState: (next: NotificationItem[] | ((prev: NotificationItem[]) => NotificationItem[])) => void,
): () => void {
  const unsub = notificationsAdapter.subscribe((incoming: NotificationItem) => {


    setState((current) => sortByCreatedAsc(dedupe([...(current || []), incoming], current || [])))
  })
  return unsub
}