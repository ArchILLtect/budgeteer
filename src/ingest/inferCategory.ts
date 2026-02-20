/**
 * Category inference engine.
 * 1) Immediate inference: supplied category, keyword map, regex rules.
 * 2) Post-pass consensus: vendor root frequency dominance.
 *
 * Uses extractVendorDescription (if available) to derive vendor root.
 */
import {
    KEYWORD_MAP,
    REGEX_RULES,
    CARD_PREFIX_PATTERNS,
    CONSENSUS_THRESHOLDS,
} from './categoryRules';
import * as accountUtils from '../utils/accountUtils.js';

const extractVendorDescriptionFn = accountUtils.extractVendorDescription || null;

type TxForInference = {
    description?: string;
    category?: string;
    _vendorRoot?: string;
    _catSource?: string;
    [key: string]: unknown;
};

type VendorStats = {
    total: number;
    labeled: number;
    categoryCounts: Map<string, number>;
};

export type CategoryContext = {
    vendorStats: Map<string, VendorStats>;
};

type ConsensusThresholds = {
    minOccurrences: number;
    dominanceRatio: number;
};

function stripCardPrefixes(desc: string): string {
    let s = desc;
    CARD_PREFIX_PATTERNS.forEach((re) => {
        s = s.replace(re, '');
    });
    return s.trim();
}

function normalizeDesc(desc: string): string {
    return desc.toLowerCase().replace(/\s+/g, ' ').trim();
}

function deriveVendorRoot(description: string, maxWords = 3): string {
    const base = extractVendorDescriptionFn
        ? extractVendorDescriptionFn(description)
        : stripCardPrefixes(description);
    return normalizeDesc(base).split(' ').slice(0, maxWords).join(' ');
}

/**
 * Context accumulates labeled samples for consensus phase.
 */
export function createCategoryContext() {
    return {
        vendorStats: new Map<string, VendorStats>(), // vendorRoot -> { total, labeled, categoryCounts: Map }
    } satisfies CategoryContext;
}

function recordVendorSample(
    ctx: CategoryContext,
    vendorRoot: string,
    category: string | undefined,
    hadCategory: boolean
) {
    if (!vendorRoot) return;
    let v = ctx.vendorStats.get(vendorRoot);
    if (!v) {
        v = { total: 0, labeled: 0, categoryCounts: new Map() };
        ctx.vendorStats.set(vendorRoot, v);
    }
    v.total += 1;
    if (hadCategory && category) {
        v.labeled += 1;
        v.categoryCounts.set(category, (v.categoryCounts.get(category) || 0) + 1);
    }
}

/**
 * Immediate inference (returns category or undefined)
 */
function inferImmediate(tx: TxForInference): { category?: string; source: 'provided' | 'keyword' | 'regex' | 'none' } {
    // 1. If provided & not low-quality
    if (tx.category && !/^uncategorized$/i.test(tx.category)) {
        return { category: tx.category, source: 'provided' };
    }

    const desc = normalizeDesc(String(tx.description ?? ''));

    // 2. Keyword map (longest keyword first)
    const sortedKeywords = Object.keys(KEYWORD_MAP).sort((a, b) => b.length - a.length);
    for (const kw of sortedKeywords) {
        if (desc.includes(kw)) {
            return { category: KEYWORD_MAP[kw], source: 'keyword' };
        }
    }

    // 3. Regex rules
    for (const rule of REGEX_RULES) {
        if (rule.test.test(desc)) {
            return { category: rule.category, source: 'regex' };
        }
    }

    return { category: undefined, source: 'none' };
}

/**
 * Called per transaction during ingestion loop.
 * Returns updated transaction with possibly inferred category.
 */
export function inferCategoryPerTx<TTx extends TxForInference>(tx: TTx, ctx: CategoryContext) {
    const vendorRoot = deriveVendorRoot(String(tx.description ?? ''));
    const hadCategoryIn = !!(tx.category && !/^uncategorized$/i.test(tx.category));

    const { category: inferredCat, source } = inferImmediate(tx);
    const categoryOut = inferredCat || (hadCategoryIn ? tx.category : undefined);

    recordVendorSample(ctx, vendorRoot, categoryOut || tx.category, !!categoryOut);

    return {
        ...tx,
        category: categoryOut,
        _vendorRoot: vendorRoot, // temp for consensus
        _catSource: categoryOut ? source : 'none', // track immediate source; may change to 'consensus'
    };
}

/**
 * After loop: apply vendor consensus for unlabeled tx.
 */
export function applyConsensusCategories(
    accepted: Array<TxForInference>,
    ctx: CategoryContext,
    thresholds: ConsensusThresholds = CONSENSUS_THRESHOLDS
) {
    for (let i = 0; i < accepted.length; i++) {
        const tx = accepted[i];
        if (tx.category) continue; // already labeled (immediate source tracked)
        const vendorRoot = tx._vendorRoot;
        if (!vendorRoot) continue;
        const stats = ctx.vendorStats.get(vendorRoot);
        if (!stats || stats.labeled < thresholds.minOccurrences) continue;

        // Find dominant category
        let topCat = null;
        let topCount = 0;
        for (const [cat, count] of stats.categoryCounts.entries()) {
            if (count > topCount) {
                topCount = count;
                topCat = cat;
            }
        }
        if (!topCat) continue;
        const ratio = topCount / stats.labeled;
        if (ratio >= thresholds.dominanceRatio) {
            accepted[i] = { ...tx, category: topCat, _catSource: 'consensus' };
        }
    }

    // Clean temp fields
    for (let i = 0; i < accepted.length; i++) {
        if (accepted[i]._vendorRoot) {
            const next = { ...accepted[i] };
            delete next._vendorRoot;
            accepted[i] = next;
        }
    }
    return accepted;
}
