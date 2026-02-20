/**
 * Phase 1 CSV parser (simple, synchronous, minimal quoting support).
 * Assumptions:
 *  - First line = headers.
 *  - Comma separated.
 *  - Quotes may wrap fields; embedded commas inside quotes are handled; embedded newlines NOT supported (Phase 5 will replace with streaming parser).
 *  - Header names flexible: date/Date, description/Description/memo, amount/Amount/amt, type/Type.
 * TODO(P3): Phase 5: Replace with PapaParse worker-based streaming & better error capture.
 */
export type CsvParseError = { line: number; message: string };

// Target row shape for Budgeteer imports (matches `/samples`).
// Values are parsed as strings; downstream normalization handles coercion.
export type CsvRow = { [key: string]: string | number; __line: number };

export function parseCsv(text: string) {
    const errors: CsvParseError[] = [];
    if (!text) return { rows: [], errors };
    const lines = text.split(/\r?\n/);
    // Identify header (first non-empty line)
    let headerLineIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().length > 0) {
            headerLineIndex = i;
            break;
        }
    }
    if (headerLineIndex === -1) return { rows: [], errors };
    const headers = splitLine(lines[headerLineIndex]).map((h) => h.trim());
    const rows: CsvRow[] = [];

    for (let i = headerLineIndex + 1; i < lines.length; i++) {
        const rawLine = lines[i];
        if (!rawLine.trim()) continue;
        try {
            const cols = splitLine(rawLine);
            if (!cols.length) continue;
            const obj: Record<string, string> = {};
            headers.forEach((h, idx) => {
                const cell = cols[idx] ?? '';
                obj[h] = cell.replace(/^"(.*)"$/, '$1');
            });
            rows.push({
                ...obj,
                __line: i + 1, // natural line numbering (1-based)
            });
        } catch (e: Error | unknown) {
            errors.push({
                line: i + 1,
                message: (e as Error)?.message || 'Parse failure',
            });
        }
    }
    return { rows, errors };
}

function splitLine(line: string): string[] {
    const result = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
            const next = line[i + 1];
            if (next === '"') {
                // escaped quote
                cur += '"';
                i++; // skip next
                continue;
            }
            inQuotes = !inQuotes;
            continue;
        }
        if (c === ',' && !inQuotes) {
            result.push(cur);
            cur = '';
        } else {
            cur += c;
        }
    }
    result.push(cur);
    return result;
}
