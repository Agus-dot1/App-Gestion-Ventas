"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkLowStockAfterSale = exports.setupNotificationScheduler = void 0;
const repository_1 = require("./repository");
const database_operations_1 = require("../lib/database-operations");
const constants_1 = require("./constants");
const isDev = process.env.NODE_ENV === 'development';
function cleanupOrphanedNotifications() {
    try {
        const all = repository_1.notificationOperations.list(500);
        const seen = new Set();
        for (const n of all) {
            if (n.message_key) {
                const key = `${n.message_key}|active`; // distinct label for active
                if (seen.has(key)) {
                    repository_1.notificationOperations.delete(n.id);
                }
                else {
                    seen.add(key);
                }
            }
        }
    }
    catch (e) {
        console.error('Error during notification cleanup:', e);
    }
}
function setupNotificationScheduler(getMainWindow, intervalMs = isDev ? 30000 : 5 * 60000) {
    function tick() {
        try {
            cleanupOrphanedNotifications();
            const overdue = database_operations_1.installmentOperations.getOverdue();
            if (overdue && overdue.length > 0) {
                overdue.forEach((inst) => {
                    try {
                        // Validar que la cuota tenga datos válidos
                        if (!inst.id || (!inst.customerName && !inst.customer_name) || !inst.balance || inst.balance <= 0) {
                            return;
                        }
                        const customer = inst.customerName || inst.customer_name;
                        const msg = `Hay una cuota vencida — ${customer} — ${new Date(inst.due_date).toLocaleDateString('es-AR')} — $ ${inst.balance}`;
                        const key = `overdue|${inst.id}`;
                        // Dedup consistente basado solo en clave semántica
                        const existsActive = repository_1.notificationOperations.existsActiveWithKey(key);
                        const existsToday = repository_1.notificationOperations.existsTodayWithKey(key);
                        if (!existsActive && !existsToday) {
                            const dbType = 'alert';
                            const nid = repository_1.notificationOperations.create(msg, dbType, key);
                            const win = getMainWindow();
                            if (win) {
                                const latest = repository_1.notificationOperations.getLatestByKey(key);
                                const createdAt = latest?.created_at;
                                win.webContents.send(constants_1.IPC_NOTIFICATIONS.event, { id: nid, message: msg, type: 'alert', meta: { message_key: key, customerName: customer, due_at: inst.due_date ? new Date(inst.due_date).toISOString() : new Date().toISOString(), amount: inst.balance, ...(createdAt ? { created_at: createdAt } : {}) } });
                            }
                        }
                    }
                    catch (e) {
                        console.error('Error processing overdue installment:', e);
                    }
                });
            }
            // Notificación de cuotas próximas a vencer
            const upcoming = database_operations_1.installmentOperations.getUpcoming();
            if (upcoming && upcoming.length > 0) {
                upcoming.forEach((inst) => {
                    try {
                        // Validar que la cuota tenga datos válidos
                        if (!inst.id || (!inst.customerName && !inst.customer_name) || !inst.balance || inst.balance <= 0) {
                            return;
                        }
                        const customer = inst.customerName || inst.customer_name;
                        const msg = `Cuota próxima a vencer — ${customer} — ${new Date(inst.due_date).toLocaleDateString('es-AR')} — ${inst.balance.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}`;
                        const key = `upcoming|${inst.id}`;
                        // Dedup consistente basado solo en clave semántica
                        const existsActive = repository_1.notificationOperations.existsActiveWithKey(key);
                        const existsToday = repository_1.notificationOperations.existsTodayWithKey(key);
                        if (!existsActive && !existsToday) {
                            const nid = repository_1.notificationOperations.create(msg, 'reminder', key);
                            const win = getMainWindow();
                            if (win) {
                                const latest = repository_1.notificationOperations.getLatestByKey(key);
                                const createdAt = latest?.created_at;
                                win.webContents.send(constants_1.IPC_NOTIFICATIONS.event, {
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
                                });
                            }
                        }
                    }
                    catch (e) {
                        console.error('Error processing upcoming installment:', e);
                    }
                });
            }
            // Recordatorio específico para ventas semanales (1 y 15): avisar un día antes
            try {
                const now = new Date();
                const tomorrow = new Date(now);
                tomorrow.setDate(now.getDate() + 1);
                const tDay = tomorrow.getDate();
                if (tDay === 1 || tDay === 15) {
                    const weeklySales = (database_operations_1.saleOperations.getAll() || []).filter((s) => s?.payment_type === 'installments' && s?.period_type === 'weekly');
                    if (weeklySales.length > 0) {
                        try {
                            const customers = [];
                            for (const s of weeklySales) {
                                if (!s?.id || !s?.customer_id || !s?.customer_name || s?.payment_type !== 'installments' || s?.period_type !== 'weekly')
                                    continue;
                                const installments = database_operations_1.installmentOperations.getBySale(s.id) || [];
                                const hasPending = installments.some((i) => i?.status === 'pending' && i?.balance > 0);
                                if (!hasPending)
                                    continue;
                                const cid = s.customer_id;
                                const customer = s.customer_name || (typeof cid === 'number' ? database_operations_1.customerOperations.getById(cid).name : undefined) || 'Cliente';
                                customers.push(customer);
                            }
                            if (customers.length > 0) {
                                const cycleLabel = tDay === 1 ? '1 del mes' : '15 del mes';
                                const listPreview = customers.slice(0, 3).join(', ');
                                const extras = Math.max(0, customers.length - 3);
                                const msg = extras > 0
                                    ? `Recordatorio (Semanal): Mañana ${cycleLabel} — revisar pago — ${listPreview} y +${extras}`
                                    : `Recordatorio (Semanal): Mañana ${cycleLabel} — revisar pago — ${listPreview}`;
                                const key = `weekly_precheck|summary|${tomorrow.toISOString().slice(0, 10)}`;
                                const existsActive = repository_1.notificationOperations.existsActiveWithKey(key);
                                const existsToday = repository_1.notificationOperations.existsTodayWithKey(key);
                                if (!existsActive && !existsToday) {
                                    const nid = repository_1.notificationOperations.create(msg, 'reminder', key);
                                    const win = getMainWindow();
                                    if (win) {
                                        const latest = repository_1.notificationOperations.getLatestByKey(key);
                                        const createdAt = latest?.created_at;
                                        win.webContents.send(constants_1.IPC_NOTIFICATIONS.event, {
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
                                        });
                                    }
                                }
                            }
                        }
                        catch (e) {
                            console.error('Error creating weekly precheck notification:', e);
                        }
                    }
                }
            }
            catch (e) {
                console.error('Weekly precheck scheduler error:', e);
            }
        }
        catch (e) {
            console.error('Scheduler error:', e);
        }
    }
    tick();
    setInterval(tick, intervalMs);
}
exports.setupNotificationScheduler = setupNotificationScheduler;
// Hook para notificaciones por stock bajo tras crear venta
function checkLowStockAfterSale(saleData, getMainWindow) {
    try {
        if (saleData && Array.isArray(saleData.items)) {
            for (const item of saleData.items) {
                if (item?.product_id != null) {
                    try {
                        const p = database_operations_1.productOperations.getById(item.product_id);
                        if (p && typeof p.stock === 'number' && p.stock <= 1) {
                            const msg = `Stock bajo: ${p.name} — quedó en ${p.stock} unidad${p.stock === 1 ? '' : 'es'} — $${p.price}${p.category ? ` — ${p.category}` : ''}`;
                            const key = `stock_low|${p.id}`;
                            // State-aware dedupe: only suppress if an active exists and no restock since last
                            const existsActive = repository_1.notificationOperations.existsActiveWithKey(key);
                            const latest = repository_1.notificationOperations.getLatestByKey(key);
                            const productUpdatedAt = p.updated_at ? new Date(p.updated_at).getTime() : 0;
                            const lastCreatedAt = latest?.created_at ? new Date(latest.created_at).getTime() : 0;
                            const recoveredSinceLast = !!latest && productUpdatedAt > lastCreatedAt;
                            const shouldNotify = !existsActive && (!latest || recoveredSinceLast);
                            if (shouldNotify) {
                                const dbType = 'reminder';
                                const nid = repository_1.notificationOperations.create(msg, dbType, key);
                                const win = getMainWindow();
                                if (win) {
                                    const latestNew = repository_1.notificationOperations.getLatestByKey(key);
                                    const createdAtNew = latestNew?.created_at;
                                    win.webContents.send(constants_1.IPC_NOTIFICATIONS.event, {
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
                                    });
                                }
                            }
                        }
                    }
                    catch (e) {
                        console.error('Error checking product stock:', e);
                    }
                }
            }
        }
    }
    catch (e) {
        console.error('Low stock notification error:', e);
    }
}
exports.checkLowStockAfterSale = checkLowStockAfterSale;
//# sourceMappingURL=scheduler.js.map