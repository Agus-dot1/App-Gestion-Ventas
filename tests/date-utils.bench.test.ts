import { describe, it, expect } from 'vitest';
import { parseSaleDateInputToISO } from '../lib/date-utils';

function runBatch(cases: string[], iterations: number): number {
  const start = performance.now();
  let ok = 0;
  for (let i = 0; i < iterations; i++) {
    for (const c of cases) {
      const res = parseSaleDateInputToISO(c);
      if (res.valid) ok++;
    }
  }
  const end = performance.now();
  // Return elapsed ms, ensure side-effects to avoid dead-code elim
  return Math.round(end - start + ok * 0);
}

describe('date utils performance', () => {
  it('parsing should be fast for common inputs', () => {
    const common = ['01/01', '10/02', '31/12/2024', '15/06/2023', '28/02'];
    const elapsedMs = runBatch(common, 1000);
    // Expect under 300ms for 5k parses on typical hardware; adjust if needed
    expect(elapsedMs).toBeLessThan(300);
  });
});