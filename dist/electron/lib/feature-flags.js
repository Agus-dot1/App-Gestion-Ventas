"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.SHOW_MOCK_BUTTONS = void 0;








const envValue = typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_SHOW_MOCK_BUTTONS : undefined;
exports.SHOW_MOCK_BUTTONS = envValue !== undefined
    ? envValue === 'true'
    : (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production');

