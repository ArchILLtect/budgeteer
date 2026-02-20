import { extractVendorDescription } from './accountUtils';
import { parseFiniteNumber, normalizeMoney } from "../services/inputNormalization";

export type RecurringTxLike = {
    date?: string;
    description?: string;
    category?: string | null;
    amount?: number | string;
    [key: string]: unknown;
};

export type FindRecurringOptions = {
    windowSize?: number;
    varianceThreshold?: number;
    stdDevThreshold?: number;
};

type GroupEntry<TTx extends RecurringTxLike> = {
    date: Date;
    category: string | null;
    amount: number;
    original: TTx;
};

export type RecurringFinding =
    | {
          description: string;
          frequency: 'monthly?';
          status: 'possible';
          occurrences: number;
          modeAmount: number;
          lastDate: string;
          note: string;
      }
    | {
          id: string;
          description: string;
          frequency: 'monthly';
          status: 'confirmed' | 'possible';
          category: string | null;
          dayOfMonth: number;
          occurrences: number;
          avgAmount: string;
          lastDate: string;
          amountVariance: string;
          stdDev: string;
      };

export function findRecurringTransactions<TTx extends RecurringTxLike>(
    transactions: TTx[],
    options: FindRecurringOptions = {}
): RecurringFinding[] {
    const groups: Record<string, Array<GroupEntry<TTx>>> = {};
    const windowSize = options.windowSize ?? 12;
    const varianceThreshold = options.varianceThreshold ?? 100;
    const stdDevThreshold = options.stdDevThreshold ?? 15;

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
            category: typeof tx.category === 'string' ? tx.category : null,
            amount: Math.abs(parseFiniteNumber(tx.amount, { fallback: 0 })),
            original: tx,
        });
    });

    const recurring: RecurringFinding[] = [];
    // TODO: Check status of grouping often
    //console.log(groups);

    for (const desc in groups) {
        const entries = groups[desc].sort((a, b) => a.date.getTime() - b.date.getTime());
        if (entries.length < 6) continue;

        // Step: Filter out rare outlier amounts using mode
        const rounded = entries.map((e) => Math.round(e.amount * 100));
        const countMap: Record<string, number> = {};
        for (const amt of rounded) {
            const key = String(amt);
            countMap[key] = (countMap[key] || 0) + 1;
        }
        const modeCentsKey = Object.entries(countMap).sort((a, b) => b[1] - a[1])[0]?.[0];
        const mode = normalizeMoney(parseFiniteNumber(modeCentsKey, { fallback: 0 }) / 100, { fallback: 0, min: 0 });

        // Step: Keep only entries within 20% of mode
        const closeToMode = entries.filter((e) => Math.abs(e.amount - mode) / mode <= 2);

        if (closeToMode.length < 3) {
            // Flag it as "possible" if there's 1-2 odd entries but at least 2-3 near mode
            if (entries.length >= 3 && closeToMode.length >= 2) {
                const last = closeToMode[closeToMode.length - 1];
                recurring.push({
                    description: desc,
                    frequency: 'monthly?',
                    status: 'possible',
                    occurrences: closeToMode.length,
                    modeAmount: mode,
                    lastDate: last.date.toISOString().slice(0, 10),
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
            .map((entry, i) => (entry.date.getTime() - recent[i].date.getTime()) / (1000 * 60 * 60 * 24));

        const avgInterval = intervals.reduce((a: number, b: number) => a + b, 0) / intervals.length;
        const stdDev = Math.sqrt(
            intervals.map((i: number) => (i - avgInterval) ** 2).reduce((a: number, b: number) => a + b, 0) /
                intervals.length
        );

        const amounts = recent.map((e) => e.amount).sort((a, b) => a - b);

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
            dayOfMonth: recent.map((r) => r.date.getDate()).sort((a, b) => a - b)[
                Math.floor(recent.length / 2)
            ],
            id: crypto.randomUUID(),
            occurrences: recent.length,
            avgAmount: (amounts.reduce((a: number, b: number) => a + b, 0) / amounts.length).toFixed(2),
            lastDate: recent[recent.length - 1].date.toISOString().slice(0, 10),
            amountVariance: amountVariance.toFixed(2),
            stdDev: stdDev.toFixed(2),
        });
    }

    return recurring;
}
