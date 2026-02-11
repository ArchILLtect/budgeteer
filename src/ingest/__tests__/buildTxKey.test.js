import { describe, it, expect } from 'vitest';
import { buildTxKey } from '../buildTxKey.js';

function tx(overrides = {}) {
    return {
        accountNumber: 'ACC1',
        date: '2025-02-03',
        description: 'Grocery Store',
        amount: 50.25,
        rawAmount: -50.25,
        ...overrides,
    };
}

describe('buildTxKey', () => {
    it('builds key with balance when present', () => {
        const key = buildTxKey(tx({ original: { Balance: '$123.45' } }));
        expect(key).toContain('|bal:123.45');
    });

    it('normalizes description spacing and case', () => {
        const key = buildTxKey(tx({ description: '  Grocery   STORE  ' }));
        expect(key.endsWith('grocery store')).toBe(true);
    });

    it('includes signed amount with two decimals', () => {
        const key = buildTxKey(tx({ rawAmount: -10 }));
        expect(key).toContain('|-10.00|');
    });
});
