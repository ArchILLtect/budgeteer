// Phase 5: Streaming CSV parser using PapaParse with chunk callbacks.
// This utility wraps Papa.parse to emit normalized row objects progressively.
// It does not classify/dedupe; it simply parses and pushes raw rows.
// Downstream code can accumulate or feed rows into runIngestion via the `parsedRows` option.

import Papa from 'papaparse';

/**
 * streamParseCsv
 * @param {File|String} fileOrText - File object (browser) or raw CSV string
 * @param {Object} opts
 *  - onRow(row, index) -> void | boolean (return false to stop)
 *  - onProgress({ rows, bytes, finished }) progressive callback
 *  - onComplete({ rows, meta }) final callback (rows truncated if stop early)
 *  - header: boolean (default true) treat first row as header
 *  - preview: number optional preview limit
 */

type StreamParseOpts = {
    onRow?: (row: any, index: number) => void | boolean;
    onProgress?: (progress: { rows: number; bytes: number | null; finished: boolean }) => void;
    onComplete?: (result: { rows: any[]; meta: { rowCount: number; aborted: boolean; parseErrors: any[] }; error?: any }) => void;
    header?: boolean;
    preview?: number;
    chunkSize?: number;
};

export function streamParseCsv(fileOrText: File | string, opts: StreamParseOpts = {}) {
    const {
        onRow = () => {},
        onProgress = () => {},
        onComplete = () => {},
        header = true,
        preview,
        chunkSize = 1024 * 64, // 64KB
    } = opts;

    let rowCount = 0; // counts data rows (excluding header)
    let stopped = false;
    const collected: any[] = [];
    const parseErrors: any[] = [];

    let parserRef: any = null;
    const controller = {
        abort: () => {
            stopped = true;
            if (parserRef && parserRef.abort) {
                try {
                    parserRef.abort();
                } catch {
                    /* ignore */
                }
            }
        },
    };

    Papa.parse(fileOrText, {
        header,
        preview,
        skipEmptyLines: true,
        worker: false, // can set true; left false to simplify dev scenario
        chunkSize,
        chunk: (results: Papa.ParseResult<any>, parser: any) => {
            if (!parserRef) parserRef = parser;
            if (stopped) {
                parser.abort();
                return;
            }
            for (const row of results.data) {
                // Assign 1-based file line number: header assumed at line 1 when header=true
                if (header) {
                    row.__line = rowCount + 2; // +2 => header line (1) + current data index +1
                } else {
                    row.__line = rowCount + 1;
                }
                const cont = onRow(row, rowCount);
                collected.push(row);
                rowCount++;
                if (cont === false) {
                    stopped = true;
                    parser.abort();
                    break;
                }
            }
            onProgress({ rows: rowCount, bytes: null, finished: false });
        },
        complete: (results: Papa.ParseResult<any>) => {
            if (results && results.errors && results.errors.length) {
                for (const err of results.errors) {
                    parseErrors.push({ line: (err.row ?? -1) + 1, message: err.message });
                }
            }
            onProgress({ rows: rowCount, bytes: null, finished: true });
            onComplete({
                rows: collected,
                meta: { rowCount, aborted: stopped, parseErrors },
            });
        },
        error: (err: any) => {
            parseErrors.push({
                line: null,
                message: err?.message || 'Streaming parse error',
            });
            onComplete({
                error: err,
                rows: collected,
                meta: { rowCount, aborted: stopped, parseErrors },
            });
        },
    });
    return controller;
}
