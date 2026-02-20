// Very lightweight classifier (Phase 1 stub)
// TODO(P2): Phase 2: improve income detection (e.g., positive vs negative semantics, category hints)
// Phase 2 update: Sign-based income/expense while preserving savings detection.
// - If already (or heuristically) savings => keep savings
// - Else: rawAmount >= 0 -> income, rawAmount < 0 -> expense
//   (Assumes normalizeRow set rawAmount as signed original amount.)
import type { Transaction, TransactionType } from "../types";

export function classifyTx<TTx extends Transaction>(tx: TTx): TTx & { type: TransactionType } {
    const desc = String(tx.description || '').toLowerCase();

    // Preserve explicit savings or heuristic savings
    if (
        tx.type === 'savings' ||
        desc.includes('transfer') ||
        desc.includes('tfr ') ||
        desc.includes(' save') ||
        desc.includes('savings')
    ) {
        return { ...tx, type: 'savings' };
    }

    const signed = typeof tx.rawAmount === 'number' ? tx.rawAmount : Number(tx.amount) || 0;

    const type: TransactionType = signed >= 0 ? 'income' : 'expense';
    return { ...tx, type };
}
