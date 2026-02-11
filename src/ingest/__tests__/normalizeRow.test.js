import { describe, it, expect } from 'vitest';
import { normalizeRow } from '../normalizeRow.js';

function baseRaw(overrides = {}) {
    return {
        date: '2025-01-15',
        description: 'Sample Vendor',
        amount: '12.34',
        ...overrides,
    };
}

describe('normalizeRow', () => {
    it('parses basic positive amount', () => {
        const n = normalizeRow(baseRaw());
        expect(n.date).toBe('2025-01-15');
        expect(n.description).toBe('Sample Vendor');
        expect(n.amount).toBe(12.34);
        expect(n.rawAmount).toBe(12.34);
    });

    it('parses negative parentheses amount', () => {
        const n = normalizeRow(baseRaw({ amount: '($45.10)' }));
        expect(n.amount).toBe(45.1);
        expect(n.rawAmount).toBe(-45.1);
    });

    it('parses trailing minus amount', () => {
        const n = normalizeRow(baseRaw({ amount: '99.99-' }));
        expect(n.rawAmount).toBe(-99.99);
    });

    it('returns null for invalid date', () => {
        const n = normalizeRow(baseRaw({ date: 'not-a-date' }));
        expect(n).toBeNull();
    });

    it('returns null for missing description', () => {
        const raw = baseRaw({ description: '' });
        const n = normalizeRow(raw);
        expect(n).toBeNull();
    });
});
