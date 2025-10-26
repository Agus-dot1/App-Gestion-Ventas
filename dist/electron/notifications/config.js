"use strict";
/**
 * Notification System Configuration
 * Centralizes all notification-related settings and thresholds
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationLogger = exports.getNotificationConfig = exports.DEFAULT_CONFIG = void 0;
exports.DEFAULT_CONFIG = {
    scheduler: {
        devIntervalMs: 30000,
        prodIntervalMs: 5 * 60000,
        maxRetries: 3,
        retryDelayMs: 1000,
    },
    stock: {
        lowStockThreshold: 1,
        notificationCooldownMs: 24 * 60 * 60 * 1000, // 24 hours
    },
    installments: {
        upcomingDaysAhead: 7,
        maxUpcomingToProcess: 50,
    },
    cleanup: {
        enableOrphanedCleanup: true,
        maxNotificationAgeDays: 30,
    },
    logging: {
        enableDebugLogs: process.env.NODE_ENV === 'development',
        enablePerformanceMonitoring: false,
    },
};
/**
 * Get the current notification configuration
 * Can be extended to load from external config files or environment variables
 */
function getNotificationConfig() {
    return exports.DEFAULT_CONFIG;
}
exports.getNotificationConfig = getNotificationConfig;
/**
 * Logger utility for notification system
 */
class NotificationLogger {
    constructor(config = exports.DEFAULT_CONFIG) {
        this.config = config;
    }
    debug(message, ...args) {
        if (this.config.logging.enableDebugLogs) {
            console.debug(`[Notifications] ${message}`, ...args);
        }
    }
    info(message, ...args) {
        console.info(`[Notifications] ${message}`, ...args);
    }
    warn(message, ...args) {
        console.warn(`[Notifications] ${message}`, ...args);
    }
    error(message, error, ...args) {
        console.error(`[Notifications] ${message}`, error, ...args);
    }
    performance(operation, startTime) {
        if (this.config.logging.enablePerformanceMonitoring) {
            const duration = Date.now() - startTime;
            console.debug(`[Notifications Performance] ${operation}: ${duration}ms`);
        }
    }
}
exports.NotificationLogger = NotificationLogger;
//# sourceMappingURL=config.js.map