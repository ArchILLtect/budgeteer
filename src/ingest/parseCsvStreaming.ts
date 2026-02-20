// Phase 5: Streaming CSV parser using PapaParse with chunk callbacks.
// This utility wraps Papa.parse to emit normalized row objects progressively.
// It does not classify/dedupe; it simply parses and pushes raw rows.
// Downstream code can accumulate or feed rows into analyzeImport via the `parsedRows` option.

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

export type StreamCsvRow = Record<string, unknown> & { __line?: number };

type StreamParseError = {
    line: number | null;
    message: string;
};

type StreamParseOpts<Row extends StreamCsvRow = StreamCsvRow> = {
    onRow?: (row: Row, index: number) => void | boolean;
    onChunk?: (
        rows: Row[],
        startIndex: number,
        meta: { bytes: number | null }
    ) => void | boolean | Promise<void | boolean>;
    onProgress?: (progress: { rows: number; bytes: number | null; finished: boolean }) => void;
    onComplete?: (result: {
        rows: Row[];
        meta: { rowCount: number; aborted: boolean; parseErrors: StreamParseError[] };
        error?: unknown;
    }) => void;
    header?: boolean;
    preview?: number;
    chunkSize?: number;
    worker?: boolean | 'auto';
    collectRows?: boolean;
};

export function streamParseCsv<Row extends StreamCsvRow = StreamCsvRow>(
    fileOrText: File | string,
    opts: StreamParseOpts<Row> = {}
) {
    const {
        onRow = () => {},
        onChunk,
        onProgress = () => {},
        onComplete = () => {},
        header = true,
        preview,
        chunkSize = 1024 * 64, // 64KB
        worker = 'auto',
        collectRows = true,
    } = opts;

    let rowCount = 0; // counts data rows (excluding header)
    let stopped = false;
    const collected: Row[] = [];
    const parseErrors: StreamParseError[] = [];

    let parserRef: Papa.Parser | null = null;
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

    if (typeof fileOrText === 'string') {
        // String input is parsed synchronously; emulate streaming callbacks.
        const results = Papa.parse<Row>(fileOrText, {
            header,
            preview,
            skipEmptyLines: true,
        });

        const bytes: number | null =
            typeof results.meta?.cursor === 'number' ? results.meta.cursor : null;

        for (const err of results.errors ?? []) {
            parseErrors.push({
                line: typeof err.row === 'number' ? err.row + 1 : 0,
                message: err.message,
            });
        }

        for (const row of results.data) {
            if (header) row.__line = rowCount + 2;
            else row.__line = rowCount + 1;

            const cont = onRow(row, rowCount);
            if (collectRows) collected.push(row);
            rowCount++;
            if (cont === false) {
                stopped = true;
                break;
            }
        }

        onProgress({ rows: rowCount, bytes, finished: true });
        onComplete({ rows: collected, meta: { rowCount, aborted: stopped, parseErrors } });
    } else {
        const resolvedWorker =
            worker === 'auto' ? (fileOrText.size || 0) > 500_000 : worker;

        const fileConfig: Papa.ParseLocalConfig<Row, File> = {
            header,
            preview,
            skipEmptyLines: true,
            worker: resolvedWorker === true,
            chunkSize,
            chunk: (results: Papa.ParseResult<Row>, parser: Papa.Parser) => {
                if (!parserRef) parserRef = parser;
                if (stopped) {
                    parser.abort();
                    return;
                }

                const bytes: number | null =
                    typeof results.meta?.cursor === 'number' ? results.meta.cursor : null;

                const rows = results.data;
                const startIndex = rowCount;

                for (const row of rows) {
                    if (header) row.__line = rowCount + 2;
                    else row.__line = rowCount + 1;

                    const cont = onRow(row, rowCount);
                    if (collectRows) collected.push(row);
                    rowCount++;
                    if (cont === false) {
                        stopped = true;
                        parser.abort();
                        break;
                    }
                }

                if (onChunk) {
                    try {
                        parser.pause();
                    } catch {
                        /* ignore */
                    }

                    Promise.resolve(onChunk(rows, startIndex, { bytes }))
                        .then((cont) => {
                            if (cont === false) {
                                stopped = true;
                                parser.abort();
                                return;
                            }
                            try {
                                parser.resume();
                            } catch {
                                /* ignore */
                            }
                        })
                        .catch(() => {
                            try {
                                parser.resume();
                            } catch {
                                /* ignore */
                            }
                        });
                }

                onProgress({ rows: rowCount, bytes, finished: false });
            },
            complete: (results: Papa.ParseResult<Row>) => {
                for (const err of results.errors ?? []) {
                    parseErrors.push({
                        line: typeof err.row === 'number' ? err.row + 1 : 0,
                        message: err.message,
                    });
                }
                const bytes: number | null =
                    typeof results.meta?.cursor === 'number' ? results.meta.cursor : null;
                onProgress({ rows: rowCount, bytes, finished: true });
                onComplete({
                    rows: collected,
                    meta: { rowCount, aborted: stopped, parseErrors },
                });
            },
            error: (error: Error) => {
                parseErrors.push({
                    line: null,
                    message: error.message || 'Streaming parse error',
                });
                onComplete({
                    error,
                    rows: collected,
                    meta: { rowCount, aborted: stopped, parseErrors },
                });
            },
        };

        Papa.parse<Row, File>(fileOrText, fileConfig);
    }
    return controller;
}
