"use strict";
/**
 * Notification System Utilities
 * Common functions for validation, error handling, and operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationKeyGenerator = exports.NotificationFormatter = exports.Debouncer = exports.safeDbOperation = exports.withRetry = exports.NotificationValidator = void 0;
const types_1 = require("./types");
const config_1 = require("./config");
const logger = new config_1.NotificationLogger();
/**
 * Validation utilities
 */
class NotificationValidator {
    static validateInstallment(installment) {
        if (!installment) {
            throw new types_1.NotificationValidationError('Installment data is required');
        }
        if (!installment.id || typeof installment.id !== 'number') {
            throw new types_1.NotificationValidationError('Valid installment ID is required', { installment });
        }
        if (!installment.balance || typeof installment.balance !== 'number' || installment.balance <= 0) {
            throw new types_1.NotificationValidationError('Valid installment balance is required', { installment });
        }
        const customerName = installment.customerName || installment.customer_name;
        if (!customerName || typeof customerName !== 'string') {
            throw new types_1.NotificationValidationError('Customer name is required', { installment });
        }
        if (!installment.due_date) {
            throw new types_1.NotificationValidationError('Due date is required', { installment });
        }
        return {
            id: installment.id,
            customerName: installment.customerName,
            customer_name: installment.customer_name,
            balance: installment.balance,
            due_date: installment.due_date,
            sale_id: installment.sale_id
        };
    }
    static validateProduct(product) {
        if (!product) {
            throw new types_1.NotificationValidationError('Product data is required');
        }
        if (!product.id || typeof product.id !== 'number') {
            throw new types_1.NotificationValidationError('Valid product ID is required', { product });
        }
        if (!product.name || typeof product.name !== 'string') {
            throw new types_1.NotificationValidationError('Product name is required', { product });
        }
        if (typeof product.stock !== 'number') {
            throw new types_1.NotificationValidationError('Valid product stock is required', { product });
        }
        return {
            id: product.id,
            name: product.name,
            stock: product.stock,
            updated_at: product.updated_at
        };
    }
    static validateSaleData(saleData) {
        if (!saleData) {
            throw new types_1.NotificationValidationError('Sale data is required');
        }
        if (!Array.isArray(saleData.items)) {
            throw new types_1.NotificationValidationError('Sale items must be an array', { saleData });
        }
        const validatedItems = saleData.items.map((item, index) => {
            if (!item.product_id || typeof item.product_id !== 'number') {
                throw new types_1.NotificationValidationError(`Invalid product_id in item ${index}`, { item, index });
            }
            if (!item.quantity || typeof item.quantity !== 'number' || item.quantity <= 0) {
                throw new types_1.NotificationValidationError(`Invalid quantity in item ${index}`, { item, index });
            }
            return {
                product_id: item.product_id,
                quantity: item.quantity,
                price: item.price,
                product_name: item.product_name
            };
        });
        return {
            id: saleData.id,
            items: validatedItems,
            customer_id: saleData.customer_id,
            total: saleData.total
        };
    }
}
exports.NotificationValidator = NotificationValidator;
/**
 * Safe operation wrapper with retry logic
 */
async function withRetry(operation, maxRetries = 3, delayMs = 1000, operationName = 'operation') {
    let lastError = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const startTime = Date.now();
            const result = await operation();
            logger.performance(operationName, startTime);
            return {
                success: true,
                data: result
            };
        }
        catch (error) {
            lastError = error;
            logger.warn(`${operationName} failed on attempt ${attempt}/${maxRetries}`, error);
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
            }
        }
    }
    logger.error(`${operationName} failed after ${maxRetries} attempts`, lastError);
    return {
        success: false,
        error: lastError?.message || 'Unknown error',
        data: null
    };
}
exports.withRetry = withRetry;
/**
 * Safe database operation wrapper
 */
function safeDbOperation(operation, operationName, context) {
    try {
        const startTime = Date.now();
        const result = operation();
        logger.performance(operationName, startTime);
        return {
            success: true,
            data: result
        };
    }
    catch (error) {
        const dbError = new types_1.NotificationDatabaseError(`Database operation failed: ${operationName}`, { ...context, originalError: error });
        logger.error(`Database operation failed: ${operationName}`, dbError, context);
        return {
            success: false,
            error: dbError.message,
            data: null
        };
    }
}
exports.safeDbOperation = safeDbOperation;
/**
 * Debounce utility for reducing frequent operations
 */
class Debouncer {
    constructor(defaultDelay = 0) {
        this.timers = new Map();
        this.pending = new Map();
        this.defaultDelay = defaultDelay;
    }
    debounce(key, func, delay) {
        return (...args) => {
            const existingTimer = this.timers.get(key);
            if (existingTimer) {
                clearTimeout(existingTimer);
            }
            const timer = setTimeout(() => {
                func(...args);
                this.timers.delete(key);
            }, delay);
            this.timers.set(key, timer);
        };
    }
    execute(func, key = 'default', delay) {
        const d = typeof delay === 'number' ? delay : this.defaultDelay;
        const existingTimer = this.timers.get(key);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }
        let pending = this.pending.get(key);
        if (!pending) {
            let resolveFn;
            let rejectFn;
            const promise = new Promise((resolve, reject) => {
                resolveFn = resolve;
                rejectFn = reject;
            });
            pending = { resolve: resolveFn, reject: rejectFn, promise };
            this.pending.set(key, pending);
        }
        const timer = setTimeout(async () => {
            try {
                const result = await func();
                pending.resolve(result);
            }
            catch (err) {
                pending.reject(err);
            }
            finally {
                this.timers.delete(key);
                this.pending.delete(key);
            }
        }, d);
        this.timers.set(key, timer);
        return pending.promise;
    }
    clear(key) {
        if (key) {
            const timer = this.timers.get(key);
            if (timer) {
                clearTimeout(timer);
                this.timers.delete(key);
            }
            // Clear any pending promise
            if (this.pending.has(key)) {
                this.pending.delete(key);
            }
        }
        else {
            this.timers.forEach(timer => clearTimeout(timer));
            this.timers.clear();
            this.pending.clear();
        }
    }
}
exports.Debouncer = Debouncer;
/**
 * Format utilities for consistent message formatting
 */
class NotificationFormatter {
    static formatCurrency(amount) {
        return amount.toLocaleString('es-AR', {
            style: 'currency',
            currency: 'ARS'
        });
    }
    static formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('es-AR');
    }
    static formatOverdueMessage(installment) {
        const customerName = installment.customerName || installment.customer_name;
        return `Cuota vencida — ${customerName} — ${this.formatDate(new Date().toISOString())} — ${this.formatCurrency(installment.balance)}`;
    }
    static formatUpcomingMessage(installment) {
        const customerName = installment.customerName || installment.customer_name;
        return `Cuota próxima a vencer — ${customerName} — ${this.formatDate(installment.due_date)} — ${this.formatCurrency(installment.balance)}`;
    }
    static formatLowStockMessage(product) {
        return `Stock bajo: ${product.name}`;
    }
}
exports.NotificationFormatter = NotificationFormatter;
/**
 * Key generation utilities for consistent notification keys
 */
class NotificationKeyGenerator {
    static overdueKey(installmentId) {
        return `overdue|${installmentId}`;
    }
    static upcomingKey(installmentId) {
        return `upcoming|${installmentId}`;
    }
    static lowStockKey(productId) {
        return `stock_low|${productId}`;
    }
    static parseKey(key) {
        const parts = key.split('|');
        if (parts.length !== 2)
            return null;
        const id = parseInt(parts[1], 10);
        if (isNaN(id))
            return null;
        return {
            type: parts[0],
            id
        };
    }
}
exports.NotificationKeyGenerator = NotificationKeyGenerator;
//# sourceMappingURL=utils.js.map