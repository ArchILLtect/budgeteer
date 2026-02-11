import { describe, it, expect } from 'vitest';
import {
    createCategoryContext,
    inferCategoryPerTx,
    applyConsensusCategories,
} from '../inferCategory.js';

function baseTx(overrides = {}) {
    return {
        id: crypto.randomUUID(),
        date: '2025-03-01',
        description: 'Starbucks Coffee',
        amount: 4.5,
        rawAmount: -4.5,
        type: 'expense',
        category: undefined,
        ...overrides,
    };
}

describe('category inference immediate rules', () => {
    it('uses provided category when present and not uncategorized', () => {
        const ctx = createCategoryContext();
        const tx = baseTx({ category: 'Dining' });
        const out = inferCategoryPerTx(tx, ctx);
        expect(out.category).toBe('Dining');
        expect(out._catSource).toBe('provided');
    });

    it('matches keyword map (netflix)', () => {
        const ctx = createCategoryContext();
        const tx = baseTx({ description: 'NETFLIX.COM SUB' });
        const out = inferCategoryPerTx(tx, ctx);
        expect(out.category).toBe('Subscriptions');
        expect(out._catSource).toBe('keyword');
    });

    it('falls back to regex rule when no keyword', () => {
        const ctx = createCategoryContext();
        const tx = baseTx({ description: 'Local SuperMart #123' });
        const out = inferCategoryPerTx(tx, ctx);
        expect(out.category).toBe('Groceries');
        expect(out._catSource).toBe('regex');
    });

    it('remains none when no rule applies', () => {
        const ctx = createCategoryContext();
        const tx = baseTx({ description: 'Random Vendor XYZ' });
        const out = inferCategoryPerTx(tx, ctx);
        expect(out.category).toBeUndefined();
        expect(out._catSource).toBe('none');
    });
});

describe('vendor consensus pass', () => {
    it('applies consensus when dominant category meets thresholds', () => {
        const ctx = createCategoryContext();
        const vendor = 'Local Coffeehouse'; // avoid keyword hits so consensus path is responsible for final label
        // Seed labeled samples (simulate prior labeled txns)
        const labeled = [
            baseTx({ description: vendor, category: 'Dining' }),
            baseTx({ description: vendor, category: 'Dining' }),
            baseTx({ description: vendor, category: 'Dining' }),
            baseTx({ description: vendor, category: 'Dining' }),
            baseTx({ description: vendor, category: 'Groceries' }), // minority
        ];
        const unlabeled = [baseTx({ description: vendor, category: undefined })];

        // Run immediate phase to record vendor stats
        const accepted = [];
        for (const t of labeled.concat(unlabeled)) {
            accepted.push(inferCategoryPerTx(t, ctx));
        }

        // Run consensus
        applyConsensusCategories(accepted, ctx, {
            minOccurrences: 3,
            dominanceRatio: 0.6,
        });

        const inferred = accepted[accepted.length - 1];
        expect(inferred.category).toBe('Dining');
        expect(inferred._catSource).toBe('consensus');
    });

    it('does not apply consensus if dominance ratio not met', () => {
        const ctx = createCategoryContext();
        const vendor = 'Example Vendor';
        const samples = [
            baseTx({ description: vendor, category: 'Dining' }),
            baseTx({ description: vendor, category: 'Groceries' }),
            baseTx({ description: vendor, category: 'Dining' }),
        ];
        const unlabeled = baseTx({ description: vendor, category: undefined });
        const accepted = [];
        for (const t of samples.concat(unlabeled)) {
            accepted.push(inferCategoryPerTx(t, ctx));
        }
        applyConsensusCategories(accepted, ctx, {
            minOccurrences: 3,
            dominanceRatio: 0.7,
        }); // raise threshold to block
        const last = accepted[accepted.length - 1];
        expect(last.category).toBeUndefined();
    });
});
