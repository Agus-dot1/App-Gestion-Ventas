import { BrowserWindow } from 'electron'
import { notificationOperations } from './repository'
import { customerOperations, productOperations, saleOperations, installmentOperations } from '../lib/database-operations'
import { IPC_NOTIFICATIONS } from './constants'


function cleanupOrphanedNotifications() {
  try { notificationOperations.dedupeActiveByMessageKey() } catch (e) { console.error('Error during notification cleanup:', e) }
}

export function setupNotificationScheduler(getMainWindow: () => BrowserWindow | null, intervalMs: number = 5 * 60_000) {
  function tick() {
    try {
      cleanupOrphanedNotifications()
      const suppressIfMuted = (process.env.NOTIFICATIONS_SUPPRESS_WHEN_MUTED ?? 'true') !== 'false'
      const isMuted = !getMainWindow()
      
      const overdue = installmentOperations.getOverdue();
      if (overdue && overdue.length > 0) {
        const batchThreshold = parseInt(process.env.NOTIFICATIONS_BATCH_THRESHOLD || '10', 10)
        const payloads: any[] = []
        overdue.forEach((inst: any) => {
          try {


            if (!inst.id || (!inst.customerName && !inst.customer_name) || !inst.balance || inst.balance <= 0) {
              return;
            }
            const customer = inst.customerName || inst.customer_name
            const msg = `Hay una cuota vencida — ${customer} — ${new Date(inst.due_date).toLocaleDateString('es-AR')} — $ ${inst.balance}`
            const key = `overdue|${inst.id}`


            const existsActive = notificationOperations.existsActiveWithKey(key)
            const existsToday = notificationOperations.existsTodayWithKey(key)
            if (!existsActive && !existsToday) {
              if (!(suppressIfMuted && isMuted)) {
                const dbType = 'alert'
                const nid = notificationOperations.create(msg, dbType as any, key as any)
                const latest = notificationOperations.getLatestByKey(key)
                const createdAt = latest?.created_at
                payloads.push({ id: nid, message: msg, type: 'alert', meta: { message_key: key, customerName: customer, due_at: inst.due_date ? new Date(inst.due_date).toISOString() : new Date().toISOString(), amount: inst.balance, ...(createdAt ? { created_at: createdAt } : {}) } })
              }
            }
          } catch (e) {
            console.error('Error processing overdue installment:', e)
          }
        })
        const win = getMainWindow()
        if (win && payloads.length > 0) {
          if (payloads.length >= batchThreshold) {
            win.webContents.send(IPC_NOTIFICATIONS.eventBatch, payloads)
          } else {
            for (const p of payloads) { win.webContents.send(IPC_NOTIFICATIONS.event, p) }
          }
        }
      }



      const upcoming = installmentOperations.getUpcoming()
      if (upcoming && upcoming.length > 0) {
        const batchThreshold = parseInt(process.env.NOTIFICATIONS_BATCH_THRESHOLD || '10', 10)
        const payloads: any[] = []
        upcoming.forEach((inst: any) => {
          try {


            if (!inst.id || (!inst.customerName && !inst.customer_name) || !inst.balance || inst.balance <= 0) {
              return;
            }
            const customer = inst.customerName || inst.customer_name
            const msg = `Cuota próxima a vencer — ${customer} — ${new Date(inst.due_date).toLocaleDateString('es-AR')} — ${inst.balance.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}`
            const key = `upcoming|${inst.id}`


            const existsActive = notificationOperations.existsActiveWithKey(key)
            const existsToday = notificationOperations.existsTodayWithKey(key)
            if (!existsActive && !existsToday) {
              if (!(suppressIfMuted && isMuted)) {
                const nid = notificationOperations.create(msg, 'reminder' as any, key as any)
                const latest = notificationOperations.getLatestByKey(key)
                const createdAt = latest?.created_at
                payloads.push({
                  id: nid,
                  message: msg,
                  type: 'attention',
                  meta: {
                      message_key: key,
                      customerName: customer,
                      due_at: new Date(inst.due_date).toISOString(),
                      amount: inst.balance,
                      ...(createdAt ? { created_at: createdAt } : {}),
                  }
                })
              }
            }
          } catch (e) {
            console.error('Error processing upcoming installment:', e)
          }
        })
        const win = getMainWindow()
        if (win && payloads.length > 0) {
          if (payloads.length >= batchThreshold) {
            win.webContents.send(IPC_NOTIFICATIONS.eventBatch, payloads)
          } else {
            for (const p of payloads) { win.webContents.send(IPC_NOTIFICATIONS.event, p) }
          }
        }
      }



      try {
        const now = new Date()
        const tomorrow = new Date(now)
        tomorrow.setDate(now.getDate() + 1)
        const tDay = tomorrow.getDate()

        if (tDay === 1 || tDay === 15) {
          const weeklySales = (saleOperations.getAll() || []).filter((s: any) => s?.payment_type === 'installments' && s?.period_type === 'weekly')
          if (weeklySales.length > 0) {
            try {
              const customers: string[] = []
              for (const s of weeklySales) {
                if (!s?.id || !s?.customer_id || !s?.customer_name || s?.payment_type !== 'installments' || s?.period_type !== 'weekly') continue
                const installments = installmentOperations.getBySale(s.id) || []
                const hasPending = installments.some((i: any) => i?.status === 'pending' && i?.balance > 0)
                if (!hasPending) continue
                const cid = s.customer_id
                const customer = s.customer_name || (typeof cid === 'number' ? customerOperations.getById(cid).name : undefined) || 'Cliente'
                customers.push(customer)
              }

              if (customers.length > 0) {
                const cycleLabel = tDay === 1 ? '1 del mes' : '15 del mes'
                const listPreview = customers.slice(0, 3).join(', ')
                const extras = Math.max(0, customers.length - 3)
                const msg = extras > 0
                  ? `Recordatorio (Semanal): Mañana ${cycleLabel} — revisar pago — ${listPreview} y +${extras}`
                  : `Recordatorio (Semanal): Mañana ${cycleLabel} — revisar pago — ${listPreview}`
                const key = `weekly_precheck|summary|${tomorrow.toISOString().slice(0,10)}`

                const existsActive = notificationOperations.existsActiveWithKey(key)
                const existsToday = notificationOperations.existsTodayWithKey(key)
                if (!existsActive && !existsToday) {
                  if (!(suppressIfMuted && isMuted)) {
                    const nid = notificationOperations.create(msg, 'reminder' as any, key as any)
                    const win = getMainWindow()
                    if (win) {
                      const latest = notificationOperations.getLatestByKey(key)
                      const createdAt = latest?.created_at
                      win.webContents.send(IPC_NOTIFICATIONS.event, {
                        id: nid,
                        message: msg,
                        type: 'attention',
                        meta: {
                          message_key: key,
                          customerName: customers[0],
                          customerNames: customers.slice(0, 3),
                          customerCount: customers.length,
                          due_at: tomorrow.toISOString(),
                          actionLabel: 'Revisar',
                          route: '/sales?tab=installments',
                          ...(createdAt ? { created_at: createdAt } : {}),
                        }
                      })
                    }
                  }
                }
              }
            } catch (e) {
              console.error('Error creating weekly precheck notification:', e)
            }
          }
        }
      } catch (e) {
        console.error('Weekly precheck scheduler error:', e)
      }

      try {
        const now = new Date()
        const retentionDays = parseInt(process.env.NOTIFICATIONS_RETENTION_DAYS || '90', 10)
        if (Number.isFinite(retentionDays) && retentionDays > 0) {
          if (now.getHours() === 1) {
            notificationOperations.purgeArchivedOlderThan(retentionDays)
          }
        }
      } catch (e) {
        console.error('Retention purge scheduler error:', e)
      }
    } catch (e) {
      console.error('Scheduler error:', e)
    }
  }

  tick()
  setInterval(tick, intervalMs)
}



export function checkLowStockAfterSale(saleData: any, getMainWindow: () => BrowserWindow | null) {
  try {
    if (saleData && Array.isArray(saleData.items)) {
      for (const item of saleData.items) {
        if (item?.product_id != null) {
          try {
            const p = productOperations.getById(item.product_id)
            if (p && typeof p.stock === 'number' && p.stock <= 1) {
              const msg = `Stock bajo: ${p.name} — quedó en ${p.stock} unidad${p.stock === 1 ? '' : 'es'} — $${p.price}${p.category ? ` — ${p.category}` : ''}`
              const key = `stock_low|${p.id}`


              const existsActive = notificationOperations.existsActiveWithKey(key)
              const latest = notificationOperations.getLatestByKey(key)
              const productUpdatedAt = p.updated_at ? new Date(p.updated_at).getTime() : 0
              const lastCreatedAt = latest?.created_at ? new Date(latest.created_at).getTime() : 0
              const recoveredSinceLast = !!latest && productUpdatedAt > lastCreatedAt
              const shouldNotify = !existsActive && (!latest || recoveredSinceLast)
              if (shouldNotify) {
                const suppressIfMuted = (process.env.NOTIFICATIONS_SUPPRESS_WHEN_MUTED ?? 'true') !== 'false'
                const isMuted = !getMainWindow()
                if (!(suppressIfMuted && isMuted)) {
                  const dbType = 'reminder'
                  const nid = notificationOperations.create(msg, dbType as any, key as any)
                  const win = getMainWindow()
                  if (win) {
                    const latestNew = notificationOperations.getLatestByKey(key)
                    const createdAtNew = latestNew?.created_at
                    win.webContents.send(IPC_NOTIFICATIONS.event, { 
                      id: nid, 
                      message: msg, 
                      type: 'attention', 
                      meta: { 
                        message_key: key, 
                        stockStatus: `${p.stock} unidad${p.stock === 1 ? '' : 'es'}`, 
                        productId: p.id,
                        productName: p.name,
                        productPrice: p.price,
                        productCategory: p.category || 'Sin categoría',
                        currentStock: p.stock,
                        ...(createdAtNew ? { created_at: createdAtNew } : {}),
                      } 
                    })
                  }
                }
              }
            }
          } catch (e) {
            console.error('Error checking product stock:', e)
          }
        }
      }
    }
  } catch (e) {
    console.error('Low stock notification error:', e)
  }
}
