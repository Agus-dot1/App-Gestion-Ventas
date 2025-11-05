import { NotificationItem, NotificationEventPayload, NotificationRecord, NotificationTypeDb, NotificationTypeUi } from './types'
import { CATEGORY, STOCK_LOW_REGEX, CLIENT_ALERT_REGEX } from './constants'

export function mapDbTypeToUi(dbType: NotificationTypeDb): NotificationTypeUi {
  switch (dbType) {
    case 'alert':
      return 'alert'
    case 'info':
      return 'info'
    default:
      return 'attention'
  }
}

// Enhanced function to ensure overdue payments are always classified as 'alert'
export function determineNotificationType(type: NotificationTypeDb | NotificationTypeUi, message: string): NotificationTypeUi {
  // Force overdue payment messages to be 'alert' type regardless of input type
  if (message.toLowerCase().includes('cuota vencida') || message.toLowerCase().includes('vencida hoy')) {
    return 'alert'
  }
  
  // Normalize depending on input domain
  if (type === 'alert' || type === 'info') return type
  // Map DB 'reminder' and UI 'attention' to UI 'attention'
  return 'attention'
}

function deriveCategory(type: NotificationTypeUi, message: string, message_key?: string): 'client' | 'system' | 'stock' {
  // Prefer semantic key namespaces for deterministic category
  if (message_key) {
    if (message_key.startsWith('overdue|') || message_key.startsWith('upcoming|')) return CATEGORY.client
    if (message_key.startsWith('stock_low|')) return CATEGORY.stock
  }
  // Fallback to content heuristics
  if (STOCK_LOW_REGEX.test(message)) return CATEGORY.stock
  if (CLIENT_ALERT_REGEX.test(message)) return CATEGORY.client
  if (type === 'attention') return CATEGORY.client
  return CATEGORY.system
}

function parseClientFields(message: string): Partial<NotificationItem['meta']> {
  try {
    // Caso especial: Recordatorio semanal agregador (no contiene la palabra "cuota")
    const weeklyPattern = /Recordatorio\s*\(Semanal\).*revisar pago/i
    if (weeklyPattern.test(message)) {
      const parts = message.split('—').map(s => s.trim())
      // Estructura generada por el scheduler:
      // "Recordatorio (Semanal): Mañana X — revisar pago — Nombre1, Nombre2, Nombre3 y +N"
      const namesPart = parts[2] || parts[parts.length - 1] || ''
      let namesStr = namesPart
      let extraCount: number | undefined

      // Remover sufijo "y +N" y calcular cantidad total
      const extrasMatch = namesStr.match(/\+\s*(\d+)/)
      if (extrasMatch) {
        const plusN = parseInt(extrasMatch[1], 10)
        if (!Number.isNaN(plusN)) extraCount = plusN
        namesStr = namesStr.replace(/\s*y\s*\+\s*\d+\s*$/i, '').trim()
      }

      const names = namesStr.split(',').map(s => s.trim()).filter(Boolean)
      const customerCount = typeof extraCount === 'number' ? names.length + extraCount : names.length

      return {
        category: CATEGORY.client,
        customerName: names[0],
        customerNames: names,
        customerCount,
      }
    }

    // Manejo habitual: mensajes que contienen "cuota"
    if (!CLIENT_ALERT_REGEX.test(message)) return {}

    // Handle simple format like "Cuota vencida hoy"
    if (message.toLowerCase().includes('cuota vencida hoy')) {
      return { 
        category: CATEGORY.client,
        customerName: 'Cliente', // Default name for simple format
        due_at: new Date().toISOString(), // Today's date for "hoy"
      }
    }

    const parts = message.split('—').map(s => s.trim())
    // Ejemplos:
    // "Cuota vencida — Nombre — 30/9/2024 — $ 10.000"
    // "Cuota próxima a vencer — Nombre — 25/10 — $ 20.000"
    let customerName: string | undefined
    let due_at: string | undefined
    let amount: number | undefined

    if (parts.length >= 2) customerName = parts[1]
    if (parts.length >= 3) {
      const dateStr = parts[2]
      const m = dateStr.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/)
      if (m) {
        const dd = parseInt(m[1], 10)
        const mm = parseInt(m[2], 10)
        const yy = m[3] ? parseInt(m[3], 10) : new Date().getFullYear()
        const iso = new Date(yy, mm - 1, dd).toISOString()
        due_at = iso
      }
    }
    if (parts.length >= 4) {
      const amtStr = parts[3].replace(/[^0-9.,]/g, '').replace(/\./g, '').replace(/,/g, '.')
      const val = parseFloat(amtStr)
      if (!Number.isNaN(val)) amount = val
    }

    return { category: CATEGORY.client, customerName, due_at, amount }
  } catch {
    return {}
  }
}

function parseStockFields(message: string, message_key?: string | null): Partial<NotificationItem['meta']> {
  const meta: Partial<NotificationItem['meta']> = {}
  try {
    // Extrae: nombre, unidades, precio opcional y categoría opcional
    const m = message.match(STOCK_LOW_REGEX)
    if (m) {
      const name = (m[1] || '').trim()
      const units = parseInt(m[2] || '0', 10)
      const priceStr = m[3]
      const categoryStr = (m[4] || '').trim()

      if (name) meta.productName = name
      if (!Number.isNaN(units)) {
        meta.currentStock = units
        meta.stockStatus = `${units} unidad${units === 1 ? '' : 'es'}`
      }
      if (priceStr) {
        const normalized = priceStr.replace(/[^0-9.,]/g, '').replace(/\./g, '').replace(/,/g, '.')
        const price = parseFloat(normalized)
        if (!Number.isNaN(price)) meta.productPrice = price
      }
      if (categoryStr) meta.productCategory = categoryStr
    }
    // Product id from semantic key
    if (message_key && message_key.startsWith('stock_low|')) {
      const pidStr = message_key.split('|')[1]
      const pid = parseInt(pidStr, 10)
      if (!Number.isNaN(pid)) meta.productId = pid
    }
  } catch {}
  return meta
}

export function normalizeDbToUi(n: NotificationRecord): NotificationItem {
    const type = determineNotificationType(n.type, n.message)
    const base: NotificationItem = {
        id: n.id,
        message: n.message,
        type,
        created_at: n.created_at ?? new Date().toISOString(),
        read_at: n.read_at ?? null,
        meta: {
            category: deriveCategory(type, n.message, n.message_key || undefined),
            message_key: n.message_key || undefined,
        },
    }
    // Enriquecer con campos de cliente y stock, pero dejando que meta existente prevalezca
    const parsedClient = parseClientFields(n.message);
    const parsedStock = parseStockFields(n.message, n.message_key);
    base.meta = { ...parsedClient, ...parsedStock, ...base.meta };

    // Si es cliente y es "overdue|" o "upcoming|", preferir due_at para la etiqueta de tiempo
    const key = base.meta?.message_key || ''
    const dueAt = parsedClient?.due_at
    if (base.meta?.category === CATEGORY.client && typeof dueAt === 'string') {
      if (key.startsWith('overdue|') || key.startsWith('upcoming|')) {
        base.created_at = dueAt
      }
    }

    return base
}

export function normalizeEventToUi(ev: NotificationEventPayload): NotificationItem {
    const type = determineNotificationType(ev.type, ev.message)
    const parsedClient = parseClientFields(ev.message);
    const parsedStock = parseStockFields(ev.message, ev.meta?.message_key);

    const base: NotificationItem = {
        id: ev.id,
        message: ev.message,
        type,
        created_at: ev.meta?.created_at || new Date().toISOString(),
        read_at: null,
        meta: {
            category: deriveCategory(type, ev.message, ev.meta?.message_key),
            // Incluye todo meta del evento (si trae más campos, se respetan)
            ...ev.meta,
        },
    }

    // Enriquecer meta calculada
    base.meta = { ...parsedClient, ...parsedStock, ...base.meta };

    // Si es cliente y es "overdue|" o "upcoming|", preferir due_at para la etiqueta de tiempo
    const key = base.meta?.message_key || ''
    const dueAt = parsedClient?.due_at
    if (base.meta?.category === CATEGORY.client && typeof dueAt === 'string') {
      if (key.startsWith('overdue|') || key.startsWith('upcoming|')) {
        base.created_at = dueAt
      }
    }

    return base
}

export function isDuplicate(a: NotificationItem, b: NotificationItem): boolean {
  // Exact match by persisted id
  if (typeof a.id === 'number' && typeof b.id === 'number' && a.id === b.id) return true;

  const dayA = a.created_at ? new Date(a.created_at).toDateString() : '';
  const dayB = b.created_at ? new Date(b.created_at).toDateString() : '';

  // Prefer semantic key if provided; treat same key as duplicate regardless of day
  const keyA = a.meta?.message_key;
  const keyB = b.meta?.message_key;
  if (keyA && keyB && keyA === keyB) return true;

  // Fallback: same message, day, type, and category
  if (a.message !== b.message) return false;
  return dayA === dayB && a.type === b.type && (a.meta?.category ?? '') === (b.meta?.category ?? '');
}

export function dedupe(items: NotificationItem[], existing: NotificationItem[] = []): NotificationItem[] {
  const result: NotificationItem[] = []
  for (const item of items) {
    const pool = [...existing, ...result]
    const dup = pool.some((x) => isDuplicate(x, item))
    if (!dup) result.push(item)
  }
  return result
}

export function sortByCreatedAsc(items: NotificationItem[]): NotificationItem[] {
  return [...items].sort((a, b) => {
    const ta = a.created_at ? new Date(a.created_at).getTime() : 0
    const tb = b.created_at ? new Date(b.created_at).getTime() : 0
    if (ta !== tb) return ta - tb
    const ia = (typeof a.id === 'number' ? a.id : -1)
    const ib = (typeof b.id === 'number' ? b.id : -1)
    return ia - ib
  })
}