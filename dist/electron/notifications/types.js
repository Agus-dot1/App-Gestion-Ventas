"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationDatabaseError = exports.NotificationValidationError = exports.NotificationError = void 0;
// Error types for better error handling
class NotificationError extends Error {
    constructor(message, code, context) {
        super(message);
        this.code = code;
        this.context = context;
        this.name = 'NotificationError';
    }
}
exports.NotificationError = NotificationError;
class NotificationValidationError extends NotificationError {
    constructor(message, context) {
        super(message, 'VALIDATION_ERROR', context);
        this.name = 'NotificationValidationError';
    }
}
exports.NotificationValidationError = NotificationValidationError;
class NotificationDatabaseError extends NotificationError {
    constructor(message, context) {
        super(message, 'DATABASE_ERROR', context);
        this.name = 'NotificationDatabaseError';
    }
}
exports.NotificationDatabaseError = NotificationDatabaseError;
//# sourceMappingURL=types.js.map