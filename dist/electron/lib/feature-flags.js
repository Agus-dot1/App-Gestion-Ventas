"use strict";
// Centralized feature flags for staged rollouts
// Toggle via environment variables prefixed with NEXT_PUBLIC_FEATURE_*
// Example: NEXT_PUBLIC_FEATURE_INSTALLMENTS=true
Object.defineProperty(exports, "__esModule", { value: true });
exports.flags = void 0;
function readBool(envValue, defaultValue) {
    if (envValue === undefined)
        return defaultValue;
    const normalized = envValue.trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}
exports.flags = {
    // Phase 2: Installments & Payments
    installments: readBool(process.env.NEXT_PUBLIC_FEATURE_INSTALLMENTS, false),
    payments: readBool(process.env.NEXT_PUBLIC_FEATURE_PAYMENTS, false),
    // Phase 3: Calendar & Advanced filters
    calendar: readBool(process.env.NEXT_PUBLIC_FEATURE_CALENDAR, true),
    advancedSearch: readBool(process.env.NEXT_PUBLIC_FEATURE_ADVANCED_SEARCH, true),
    // Phase 4: Bulk operations, column toggles
    bulkOps: readBool(process.env.NEXT_PUBLIC_FEATURE_BULK_OPS, true),
    columnToggle: readBool(process.env.NEXT_PUBLIC_FEATURE_COLUMN_TOGGLE, true),
    // Dev helper: Allow web preview to behave as Electron (so we can demo in browser)
    webPreview: readBool(process.env.NEXT_PUBLIC_FEATURE_WEB_PREVIEW, true),
};
//# sourceMappingURL=feature-flags.js.map