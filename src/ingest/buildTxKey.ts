// Strong transaction key only.
// Format: accountNumber|YYYY-MM-DD|signedAmount|normalized description[|bal:<balance>]

function normalizeDescription(desc: any) {
    return (desc || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function coerceSignedAmount(tx: any) {
    if (typeof tx.rawAmount === 'number') return tx.rawAmount;
    const n = Number(tx.amount);
    return Number.isFinite(n) ? n : 0;
}

function extractBalance(tx: any) {
    const b = tx.original?.Balance ?? tx.original?.balance;
    const num = Number(String(b).replace(/[$,]/g, ''));
    return Number.isFinite(num) ? num : null;
}

export function buildTxKey(tx: any) {
    const acct = tx.accountNumber || 'NA';
    const signed = coerceSignedAmount(tx);
    const desc = normalizeDescription(tx.description);
    let key = `${acct}|${tx.date}|${signed.toFixed(2)}|${desc}`;
    const bal = extractBalance(tx);
    if (bal !== null) key += `|bal:${bal.toFixed(2)}`;
    return key;
}
