/**
 * Central rule/config module for category inference.
 * Extend KEYWORD_MAP & REGEX_RULES freely without touching core logic.
 */

export const CARD_PREFIX_PATTERNS = [
    /^debitcard\s+\d{3,}:\s*purchase\s*/i,
    /^pos\s+\d+:?/i,
    /^web branch:/i,
    /^ach:/i,
];

export const KEYWORD_MAP: Record<string, string> = {
    // entertainment / subscriptions
    netflix: 'Subscriptions',
    'prime video': 'Entertainment',
    'prime video channels': 'Entertainment',
    hulu: 'Subscriptions',
    spotify: 'Subscriptions',
    rifftrax: 'Entertainment',
    // fuel / transport
    'kwik trip': 'Gas / Fuel',
    shell: 'Gas / Fuel',
    chevron: 'Gas / Fuel',
    uber: 'Transport',
    lyft: 'Transport',
    // shopping
    amzn: 'Shopping',
    amazon: 'Shopping',
    walmart: 'Shopping',
    target: 'Shopping',
    // housing
    rent: 'Mortgage / Rent',
    'axiom properties': 'Mortgage / Rent',
    // groceries
    kroger: 'Groceries',
    aldi: 'Groceries',
    costco: 'Groceries',
    // dining
    starbucks: 'Dining',
    dunkin: 'Dining',
    mcdonald: 'Dining',
    // finance transfers (leave for savings logic; category may stay undefined)
    // add more as needed...
};

// Ordered regex rules (first match wins) – more specific at top.
export const REGEX_RULES = [
    { test: /grocer|supermart|super\s?market/i, category: 'Groceries' },
    { test: /fuel|gas\s+station/i, category: 'Gas / Fuel' },
    { test: /pharmacy|walgreens|cvs/i, category: 'Health' },
    { test: /insurance/i, category: 'Insurance' },
];

/**
 * Thresholds for vendor consensus inference (Phase 2)
 */
export const CONSENSUS_THRESHOLDS = {
    minOccurrences: 3,
    dominanceRatio: 0.6, // dominant category must own >=60% of labeled samples
};
