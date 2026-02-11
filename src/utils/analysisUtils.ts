import { extractVendorDescription } from './accountUtils';

export function findRecurringTransactions(transactions: any[], options: any = {}) {
    const groups = {} as Record<string, { date: Date; category: string; amount: number; original: any }[]>;
    const windowSize = options.windowSize || 12;
    const varianceThreshold = options.varianceThreshold || 100;
    const stdDevThreshold = options.stdDevThreshold || 15;

    function normalizeDescription(desc: string) {
        return desc
            .toLowerCase()
            .replace(/\b\d{2}:\d{2}\b/g, '')
            .replace(/.*kwik[\s-]trip.*/i, 'kwik trip')
            .replace(/.*peacock.*/i, 'peacock')
            .replace(/.*refuel pantry.*/i, 'refuel pantry')
            .replace(/.*subway.*/i, 'subway')
            .replace(/amazon mktpl\*[\w\d]+/g, 'amazon')
            .replace(/amzn mktp us\*[\w\d]+/g, 'amazon')
            .replace(/amazon.com\*[\w\d]+/g, 'amazon')
            .replace(/.*check number.*/i, 'written check')
            .replace(/prime\*[\w\d]+/g, 'prime')
            .replace(/prime video \*[\w\d]+/g, 'prime video')
            .replace(/openai\s\*[^\s]+/g, 'openai')
            .replace(/amazon\sweb\sservices/i, 'aws')
            .replace(/patreon\*[^\s]+/i, 'patreon')
            .replace(/\s{2,}/g, ' ')
            .trim();
    }

    // Group by normalized description
    transactions.forEach((tx) => {
        if (!tx.description || !tx.date) return;

        const desc = normalizeDescription(tx.description);
        const descKey = extractVendorDescription(desc.trim().toLowerCase());

        if (!groups[descKey]) groups[descKey] = [];

        groups[descKey].push({
            date: new Date(tx.date),
            category: tx.category,
            amount: Math.abs(tx.amount),
            original: tx,
        });
    });

    const recurring = [];
    // TODO: Check status of grouping often
    //console.log(groups);

    for (const desc in groups) {
        const entries = groups[desc].sort((a: any, b: any) => a.date - b.date);
        if (entries.length < 6) continue;

        // Step: Filter out rare outlier amounts using mode
        const rounded = entries.map((e) => Math.round(e.amount * 100)) as any;
        const countMap = {} as any;
        for (const amt of rounded) countMap[amt] = (countMap[amt] || 0) + 1 as any;
        const mode = parseFloat(
            (parseFloat(Object.entries(countMap).sort((a: any, b: any) => b[1] - a[1])[0][0]) / 100).toFixed(2)
        ) as any;

        // Step: Keep only entries within 20% of mode
        const closeToMode = entries.filter((e) => Math.abs(e.amount - mode) / mode <= 2) as any;

        if (closeToMode.length < 3) {
            // Flag it as "possible" if there's 1-2 odd entries but at least 2-3 near mode
            if (entries.length >= 3 && closeToMode.length >= 2) {
                recurring.push({
                    description: desc,
                    frequency: 'monthly?',
                    status: 'possible',
                    occurrences: closeToMode.length,
                    modeAmount: mode,
                    lastDate: closeToMode.at(-1).date.toISOString().slice(0, 10),
                    note: 'Outlier(s) present — might still be recurring.',
                });
            }
            continue;
        }

        // Analyze the filtered entries (amounts near mode only)
        const recent = closeToMode.slice(-windowSize);
        //console.log(recent[1].original.name);
        if (recent.length < 6) continue;

        const intervals = recent
            .slice(1)
            .map((entry: any, i: number) => (entry.date - recent[i].date) / (1000 * 60 * 60 * 24));

        const avgInterval = intervals.reduce((a: number, b: number) => a + b, 0) / intervals.length;
        const stdDev = Math.sqrt(
            intervals.map((i: number) => (i - avgInterval) ** 2).reduce((a: number, b: number) => a + b, 0) /
                intervals.length
        );

        const amounts = recent.map((e: any) => e.amount).sort((a: number, b: number) => a - b);

        // Clone & trim up to 2 extreme values (if enough entries)
        let trimmed = [...amounts];
        const trimEntries = () => {
            // Skip trimming if all values are equal
            if (new Set(trimmed).size === 1) return;

            const avg = amounts.reduce((a: number, b: number) => a + b, 0) / amounts.length;
            const diffLow = Math.abs(trimmed[0] - avg);
            const diffHigh = Math.abs(trimmed[trimmed.length - 1] - avg);

            // Remove whichever is further from the average
            if (diffLow > diffHigh) {
                trimmed = trimmed.slice(1); // remove lowest
            } else {
                trimmed = trimmed.slice(0, -1); // remove highest
            }
        };
        const doubleTrim = () => {
            trimEntries();
            trimEntries();
        };

        if (amounts.length > 6) {
            doubleTrim();
        } else if (amounts.length > 4) {
            trimEntries();
        }

        // Fallback if too few items remain after trimming
        if (trimmed.length < 3) {
            trimmed = amounts;
        }

        const max = Math.max(...trimmed);
        const min = Math.min(...trimmed);
        const amountVariance = max - min;

        // Only flag as confirmed recurring if timing & amount are consistent
        const isMonthly =
            avgInterval >= 21 &&
            avgInterval <= 33 &&
            stdDev <= stdDevThreshold &&
            amountVariance <= varianceThreshold;

        recurring.push({
            description: desc,
            frequency: 'monthly',
            status: isMonthly ? 'confirmed' : 'possible',
            category: groups[desc][0].category || null,
            dayOfMonth: recent.map((r: any) => r.date.getDate()).sort((a: number, b: number) => a - b)[
                Math.floor(recent.length / 2)
            ],
            id: crypto.randomUUID(),
            occurrences: recent.length,
            avgAmount: (amounts.reduce((a: number, b: number) => a + b, 0) / amounts.length).toFixed(2),
            lastDate: recent.at(-1).date.toISOString().slice(0, 10),
            amountVariance: amountVariance.toFixed(2),
            stdDev: stdDev.toFixed(2),
        });
    }

    return recurring;
}
