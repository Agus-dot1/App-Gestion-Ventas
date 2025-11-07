'use client';









const envValue = typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_SHOW_MOCK_BUTTONS : undefined;
export const SHOW_MOCK_BUTTONS = envValue !== undefined
  ? envValue === 'true'
  : (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production');