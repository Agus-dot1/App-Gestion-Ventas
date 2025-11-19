export type NotificationTypeDb = 'alert' | 'info' | 'reminder'
export type NotificationTypeUi = 'attention' | 'alert' | 'info'

export interface NotificationRecord {
  id?: number
  user_id?: number
  message: string
  type: NotificationTypeDb
  read_at?: string | null
  created_at?: string
  deleted_at?: string | null
  message_key?: string | null
}

export interface NotificationEventPayload {
  id?: number
  message: string
  type: NotificationTypeUi
  meta?: {
    category?: 'client' | 'system' | 'stock'
    message_key?: string
    created_at?: string
  }
}

export interface NotificationItem {
  id?: number
  message: string
  type: NotificationTypeUi
  read_at?: string | null
  created_at: string
  meta?: {
    category?: 'client' | 'system' | 'stock'
    customerName?: string
    customerNames?: string[]
    systemStatus?: string
    stockStatus?: string
    due_at?: string
    duration_ms?: number
    amount?: number
    actionLabel?: string
    route?: string
    customer?: string
    customerCount?: number
    customerPhone?: string
    message_key?: string
    productId?: number
    productName?: string
    productPrice?: number
    productCategory?: string
    currentStock?: number
    downloadFilename?: string
    downloadPath?: string
  }
}