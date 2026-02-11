import dayjs from 'dayjs';

// Parse signed monetary string: handles ($1.04), -1.04, 1.04-, $ prefixes, commas.
function parseSignedAmount(rawVal: any): { raw: number; abs: number } | null {
    if (rawVal === null || rawVal === undefined) return null;
    let s = String(rawVal).trim();
    if (!s) return null;

    let sign = 1;

    // Parentheses indicate negative
    if (/^\(.*\)$/.test(s)) {
        sign = -1;
        s = s.slice(1, -1).trim();
    }

    // Remove currency symbols & whitespace
    s = s.replace(/[$]/g, '').trim();

    // Leading sign
    if (/^[+-]/.test(s)) {
        if (s[0] === '-') sign = -1;
        s = s.slice(1).trim();
    }

    // Trailing sign (e.g., 1234-)
    if (/[+-]$/.test(s)) {
        const trail = s.slice(-1);
        if (trail === '-') sign = -1;
        s = s.slice(0, -1).trim();
    }

    // Remove commas
    s = s.replace(/,/g, '');

    if (!s || !/^\d+(\.\d+)?$/.test(s)) {
        const n = Number(s);
        if (!Number.isFinite(n)) return null;
        return { raw: sign * n, abs: Math.abs(sign * n) };
    }

    const num = Number(s);
    if (!Number.isFinite(num)) return null;
    return { raw: sign * num, abs: Math.abs(sign * num) };
}

export function normalizeRow(raw: any) {
    if (!raw) return null;

    // 1. Date (supports bank "Posted Date" m/d/YYYY)
    const dateRaw = (raw.date || raw.Date || raw['Posted Date'] || '').toString().trim();
    if (!dateRaw) return null;

    let parsed = dayjs(dateRaw);
    // Fallback simple MM/DD/YY(YY) normalization
    if (!parsed.isValid()) {
        const m = dateRaw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
        if (m) {
            const [, mm, dd, yyyyRaw] = m;
            let yyyy = yyyyRaw;
            if (yyyy.length === 2) yyyy = (Number(yyyy) < 70 ? '20' : '19') + yyyy;
            parsed = dayjs(`${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`);
        }
    }
    if (!parsed.isValid()) return null;
    const date = parsed.format('YYYY-MM-DD');

    // 2. Description
    const descriptionRaw = (
        raw.description ||
        raw.Description ||
        raw.memo ||
        raw.Memo ||
        ''
    )
        .toString()
        .trim();
    if (!descriptionRaw) return null;

    // 3. Amount (signed + absolute)
    const amountField = raw.amount ?? raw.Amount ?? raw.amt ?? raw.Amt ?? '';
    const amtParsed = parseSignedAmount(amountField);
    if (!amtParsed) return null;

    // 4. Category promotion
    const rawCategory = (raw.category || raw.Category || raw.CATEGORY || '')
        .toString()
        .trim();
    const category = rawCategory || undefined;

    // 5. Optional type (may be overridden by classifier except savings)
    const typeCandidate = (raw.type || raw.Type || '').toString().toLowerCase().trim();
    const type = ['income', 'expense', 'savings'].includes(typeCandidate)
        ? typeCandidate
        : null;

    return {
        id: crypto.randomUUID(),
        date,
        description: descriptionRaw,
        amount: amtParsed.abs, // absolute for UI sums if needed
        rawAmount: amtParsed.raw, // signed (critical)
        type, // may be null → classifier sets
        category,
        original: raw,
    };
}
