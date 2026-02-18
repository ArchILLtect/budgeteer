import { describe, expect, it } from 'vitest';
import { calculateNetIncome } from '../calcUtils';

describe('calculateNetIncome (income types)', () => {
  it('includes weekly income (annualized)', () => {
    const total = calculateNetIncome([{ type: 'weekly', weeklySalary: 1000 }]);
    expect(total).toBe(52000);
  });

  it('includes bi-weekly income (annualized)', () => {
    const total = calculateNetIncome([{ type: 'bi-weekly', biWeeklySalary: 2000 }]);
    expect(total).toBe(52000);
  });

  it('still supports salary income', () => {
    const total = calculateNetIncome([{ type: 'salary', grossSalary: 52000 }]);
    expect(total).toBe(52000);
  });
});
