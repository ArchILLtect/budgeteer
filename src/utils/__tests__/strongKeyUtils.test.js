import { describe, it, expect } from 'vitest';
import {
    getStrongTransactionKey,
    getUniqueTransactions,
    normalizeTransactionAmount,
} from '../storeHelpers.js';
import { buildTxKey } from '../../ingest/buildTxKey.js';

const baseTx = (over = {}) => ({
    accountNumber: '1111',
    date: '2025-09-01',
    description: 'Coffee Shop',
    amount: 4.5,
    rawAmount: -4.5,
    ...over,
});

describe('strong transaction key utilities', () => {
    it('getStrongTransactionKey produces same as buildTxKey with account injection', () => {
        const tx = baseTx({ accountNumber: undefined });
        const keyViaHelper = getStrongTransactionKey(tx, '1111');
        const keyDirect = buildTxKey({ ...tx, accountNumber: '1111' });
        expect(keyViaHelper).toEqual(keyDirect);
    });

    it('keys differ when signed amount differs', () => {
        const a = baseTx({ rawAmount: -10, amount: 10 });
        const b = baseTx({ rawAmount: -12, amount: 12 });
        expect(getStrongTransactionKey(a, '1111')).not.toEqual(
            getStrongTransactionKey(b, '1111')
        );
    });

    it('getUniqueTransactions filters duplicates within batch and existing', () => {
        const existing = [baseTx({ id: 'e1' })];
        const incoming = [
            baseTx({ id: 'n1' }), // duplicate of existing
            baseTx({ id: 'n2', rawAmount: -5, amount: 5 }), // unique
            baseTx({ id: 'n3', rawAmount: -5, amount: 5 }), // duplicate of previous incoming unique
        ];
        const uniques = getUniqueTransactions(existing, incoming, '1111');
        expect(uniques.map((t) => t.id)).toEqual(['n2']);
    });

    it('normalizeTransactionAmount returns absolute amount', () => {
        expect(normalizeTransactionAmount({ amount: -12.34 })).toBeCloseTo(12.34, 2);
    });
});
