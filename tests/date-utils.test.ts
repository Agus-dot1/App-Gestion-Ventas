import { describe, it, expect } from 'vitest';
import { parseSaleDateInputToISO, formatISOToDDMMYYYY } from '../lib/date-utils';

describe('parseSaleDateInputToISO', () => {
  it('rejects empty input', () => {
    const res = parseSaleDateInputToISO('');
    expect(res.valid).toBe(false);
  });

  it('rejects invalid format', () => {
    const res = parseSaleDateInputToISO('2024-10-01');
    expect(res.valid).toBe(false);
  });

  it('parses dd/mm completing current year', () => {
    const res = parseSaleDateInputToISO('10/01');
    expect(res.valid).toBe(true);
    expect(res.iso).toMatch(/T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('parses dd/mm/aaaa exact', () => {
    const res = parseSaleDateInputToISO('10/01/2024');
    expect(res.valid).toBe(true);
  });

  it('rejects invalid day/month', () => {
    const res = parseSaleDateInputToISO('32/13/2024');
    expect(res.valid).toBe(false);
  });
});

describe('formatISOToDDMMYYYY', () => {
  it('formats ISO correctly', () => {
    const s = '2024-01-10T12:00:00.000Z';
    expect(formatISOToDDMMYYYY(s)).toBe('10/01/2024');
  });
});