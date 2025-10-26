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