// Very lightweight classifier (Phase 1 stub)
// TODO Phase 2: improve income detection (e.g., positive vs negative semantics, category hints)
// Phase 2 update: Sign-based income/expense while preserving savings detection.
// - If already (or heuristically) savings => keep savings
// - Else: rawAmount >= 0 -> income, rawAmount < 0 -> expense
//   (Assumes normalizeRow set rawAmount as signed original amount.)
export function classifyTx(tx: any) {
    const desc = (tx.description || '').toLowerCase();

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

    const signed =
        typeof tx.rawAmount === 'number' ? tx.rawAmount : Number(tx.amount) || 0;

    const type = signed >= 0 ? 'income' : 'expense';
    return { ...tx, type };
}
